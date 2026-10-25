'''
football.py — handles all communication with the football-data.org API.
FastAPI acts as the middleman: React asks FastAPI, FastAPI asks football-data.org,
football-data.org sends back real soccer data, FastAPI returns it to React.

Why go through FastAPI instead of React calling the football API directly?
1. Security — API key stays on the server, never exposed in the browser
2. Control — we can transform, filter, and cache data before sending to React

Every call to football-data.org goes through ONE helper: fetch_from_api().
It checks the status code BEFORE anything gets cached:
- 200 → return the data (the caller caches it)
- anything else → raise an HTTPException with the right status, so nothing gets cached
'''

import httpx                              # makes HTTP requests from Python — like axios but for backend
import os                                 # reads environment variables
import redis
from redis.backoff import NoBackoff       # "wait 0 seconds between retries"
from redis.retry import Retry             # controls how many times redis-py retries a failed command
import json        #json to serialize Python dictionaries to strings for Redis storage and deserialize them back when reading from cache
import logging     # writes warnings to the server logs — so we know when something goes wrong

from dotenv import load_dotenv            # reads .env file so os.getenv() can find our API key
from fastapi import HTTPException         # lets us send React a proper error status (503, 403, 404, 502)


load_dotenv()                             # actually reads the .env file — must be called before os.getenv()

logger = logging.getLogger(__name__)      # a logger named after this file ("backend.football") — shows up in the server logs

API_KEY = os.getenv("FOOTBALL_API_KEY")  # reads API key from .env — keeps it off GitHub and out of code
BASE_URL = "https://api.football-data.org/v4"  # base URL — we add endpoint paths on top: /competitions/PL/matches

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')  # uses 'redis' in Docker, 'localhost' locally

# make_redis_client() — builds a Redis client that gives up FAST when Redis is down
def make_redis_client(host: str, port: int = 6379):
    return redis.Redis(
        host=host, port=port, db=0,
        socket_connect_timeout=1,         # if Redis doesn't answer within 1 second, give up
        socket_timeout=1,
        retry=Retry(NoBackoff(), 0),      # don't retry — by default redis-py retries 3 times with waits, which made every request take ~7 seconds while Redis was down
    )


cache = make_redis_client(REDIS_HOST)     # the one Redis client the app uses — doesn't connect until first used
CACHE_TTL = 60  # cache data for 60 seconds


# get_cache() — a dependency: FastAPI calls it and hands the Redis client to each football endpoint
# tests can swap it for a fake (or a broken one) with app.dependency_overrides
def get_cache():
    return cache


# Redis is only here to make things faster — so if it's down, we FAIL OPEN:
# skip the cache, log a warning, and keep going. The data still comes from football-data.org.
def get_cached(cache, key: str):
    # try to get data from Redis cache
    try:
        cached = cache.get(key)                # look up the key in Redis
    except redis.RedisError as error:          # Redis is down or not answering
        logger.warning("Redis unavailable, skipping cache read for %s: %s", key, error)
        return None                            # act like a cache miss — the caller will call the API
    if cached:
        return json.loads(cached)              # found — convert string back to dict and return
    return None                                # not found — return None


def set_cached(cache, key: str, data, ttl: int = CACHE_TTL):
    # save data to Redis cache with TTL expiry
    try:
        cache.set(key, json.dumps(data), ex=ttl)
    except redis.RedisError as error:          # Redis is down — we just don't cache this time
        logger.warning("Redis unavailable, skipping cache write for %s: %s", key, error)


# fetch_from_api() — the ONE place that talks to football-data.org
# checks the status code before returning anything
# if football-data.org sent an error, we raise an HTTPException:
#   - FastAPI stops right there and sends React that status code
#   - the code after this call (set_cached) never runs, so the error is NEVER cached
async def fetch_from_api(url: str, params: dict | None = None):
    headers = {"X-Auth-Token": API_KEY}                     # API key goes in headers — X-Auth-Token is what football-data.org expects

    async with httpx.AsyncClient() as client:               # async HTTP client — auto-closes when done, no memory leaks
        response = await client.get(url, headers=headers, params=params)

    if response.status_code == 200:                         # success — hand the data back
        return response.json()

    if response.status_code == 429:                         # rate limit — we asked too many times this minute
        wait = response.headers.get("X-RequestCounter-Reset", "60")   # football-data.org tells us how many seconds to wait
        raise HTTPException(
            status_code=503,                                # 503 = Service Unavailable — "try again soon"
            detail="Too many requests to the football data service. Please try again shortly.",
            headers={"Retry-After": wait},                  # standard header that says how many seconds to wait
        )

    if response.status_code == 403:                         # this competition isn't on our free plan
        raise HTTPException(status_code=403, detail="This competition is not available on PitchIQ's data plan.")

    if response.status_code in (400, 404):                  # football-data.org says "does not exist" with a 400
        raise HTTPException(status_code=404, detail="Not found.")

    # anything else (500, 502...) — football-data.org itself is broken
    raise HTTPException(status_code=502, detail="The football data service had a problem. Please try again later.")  # 502 = Bad Gateway


# the 4 cached functions below receive `cache` from main.py (FastAPI's dependency) instead of using the global one directly

# get_matches() — returns match data for a competition
# async because network requests take time — await lets other requests run while waiting
# competition="PL" is a default parameter — PL = Premier League. Pass "BL1" for Bundesliga etc.
async def get_matches(cache, competition="PL"):
    cache_key = f"matches:{competition}"                  # unique cache key per competition

    cached_data = get_cached(cache, cache_key)            # check Redis cache first
    if cached_data:
        return cached_data                                # cache hit — return immediately, no API call

    data = await fetch_from_api(f"{BASE_URL}/competitions/{competition}/matches")  # raises on errors — so only good data reaches the next line
    set_cached(cache, cache_key, data)                    # save to Redis — next request gets cached version
    return data                                           # return full response — football.ts extracts what it needs


# get_standings() — returns league standings for a competition
# cache key is standings:{competition} — unique per competition e.g. standings:PL, standings:BL1
async def get_standings(cache, competition="PL"):
    cache_key = f"standings:{competition}"                # unique cache key per competition

    cached_data = get_cached(cache, cache_key)            # check Redis cache first
    if cached_data:
        return cached_data                                # cache hit — return immediately, no API call

    data = await fetch_from_api(f"{BASE_URL}/competitions/{competition}/standings")
    set_cached(cache, cache_key, data)
    return data


# get_topscorers() — returns top scorers for a competition
# defaults to top 10 scorers — football-data.org limits to 10 on the free tier
async def get_topscorers(cache, competition="PL"):
    cache_key = f"scorers:{competition}"                  # unique cache key — scorers:PL, scorers:BL1 etc.

    cached_data = get_cached(cache, cache_key)            # check Redis cache first
    if cached_data:
        return cached_data                                # cache hit — return immediately, no API call

    data = await fetch_from_api(f"{BASE_URL}/competitions/{competition}/scorers")
    set_cached(cache, cache_key, data)
    return data


# get_livematches() — returns all matches currently live across ALL competitions
# uses params to pass ?status=LIVE as a query filter — cleaner than putting it in the URL
async def get_livematches(cache):
    cache_key = "live:matches"                            # one key — live matches aren't per competition

    cached_data = get_cached(cache, cache_key)            # check Redis cache first
    if cached_data:
        return cached_data                                # cache hit — return immediately, no API call

    data = await fetch_from_api(f"{BASE_URL}/matches", params={"status": "LIVE"})
    set_cached(cache, cache_key, data, ttl=30)            # live data goes stale fast — only cache 30 seconds
    return data


# get_match_detail() — returns full details for one specific match
# takes match_id as parameter — use the id field from any match object
async def get_match_detail(match_id: int):
    return await fetch_from_api(f"{BASE_URL}/matches/{match_id}")


# get_team() — returns full info for one specific team
# takes team_id as parameter — use the id field from any team object
async def get_team(team_id: int):
    return await fetch_from_api(f"{BASE_URL}/teams/{team_id}")