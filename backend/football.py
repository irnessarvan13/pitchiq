'''
football.py — handles all communication with the football-data.org API.
FastAPI acts as the middleman: React asks FastAPI, FastAPI asks football-data.org,
football-data.org sends back real soccer data, FastAPI returns it to React.

Why go through FastAPI instead of React calling the football API directly?
1. Security — API key stays on the server, never exposed in the browser
2. Control — we can transform, filter, and cache data before sending to React
'''

import httpx                              # makes HTTP requests from Python — like axios but for backend
import os                                 # reads environment variables
import redis
import json        #json to serialize Python dictionaries to strings for Redis storage and deserialize them back when reading from cache

from dotenv import load_dotenv            # reads .env file so os.getenv() can find our API key


load_dotenv()                             # actually reads the .env file — must be called before os.getenv()

API_KEY = os.getenv("FOOTBALL_API_KEY")  # reads API key from .env — keeps it off GitHub and out of code
BASE_URL = "https://api.football-data.org/v4"  # base URL — we add endpoint paths on top: /competitions/PL/matches


cache = redis.Redis(host='localhost', port=6379, db=0) #storing the connection to redis to a variable called cache
CACHE_TTL = 60  # cache data for 60 seconds

def get_cached(key: str):
    # try to get data from Redis cache
    cached = cache.get(key)                    # look up the key in Redis
    if cached:
        return json.loads(cached)              # found — convert string back to dict and return
    return None                                # not found — return None


def set_cached(key: str, data, ttl: int = CACHE_TTL):
    # save data to Redis cache with TTL expiry
    cache.set(key, json.dumps(data), ex=ttl)


# get_matches() — calls football-data.org and returns match data for a competition
# async because network requests take time — await lets other requests run while waiting
# competition="PL" is a default parameter — PL = Premier League. Pass "BL1" for Bundesliga etc.
async def get_matches(competition="PL"):
    cache_key = f"matches:{competition}"                  # unique cache key per competition

    # check Redis cache first
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data                                  # cache hit — return immediately, no API call


    url = f"{BASE_URL}/competitions/{competition}/matches"  # f-string builds the full URL dynamically
    headers = {"X-Auth-Token": API_KEY}                     # API key goes in headers — X-Auth-Token is what football-data.org expects

    async with httpx.AsyncClient() as client:               # async HTTP client — auto-closes when done, no memory leaks
        response = await client.get(url, headers=headers)   # sends GET request, awaits response from football-data.org
        data = response.json()                              # converts response to Python dict and returns it

    # save to Redis cache before returning — next request gets cached version
    set_cached(cache_key, data)
    return data                                   # return full response — football.ts extracts what it needs


# get_standings() — calls football-data.org and returns league standings for a competition
# NOW WITH CACHING — checks Redis first before calling football-data.org
# cache key is standings:{competition} — unique per competition e.g. standings:PL, standings:BL1
# if cached data exists returns it immediately — no API call made
# if not cached — calls API, saves response to Redis for 60 seconds, then returns
async def get_standings(competition="PL"):
    cache_key = f"standings:{competition}"                    # unique cache key per competition

    # check Redis cache first
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data                                    # cache hit — return immediately, no API call

    # cache miss — call football-data.org
    url = f"{BASE_URL}/competitions/{competition}/standings"  # standings endpoint — same base URL, different path
    headers = {"X-Auth-Token": API_KEY}                       # API key in headers — same for every request

    async with httpx.AsyncClient() as client:                 # async HTTP client — auto-closes when done
        response = await client.get(url, headers=headers)     # sends GET request, awaits response
        data = response.json()                                # converts response to Python dict

    # save to Redis cache before returning — next request gets cached version
    set_cached(cache_key, data)
    return data                                               # return full response — football.ts extracts what it needs




# get_topscorers() — calls football-data.org and returns top scorers for a competition
# same structure as get_matches() and get_standings() — only the URL path changes
# returns player name, team, goals scored, assists for the top scorers in the league
# defaults to top 10 scorers — football-data.org limits to 10 on the free tier
async def get_topscorers(competition="PL"):
    cache_key = f"scorers:{competition}"                    # unique cache key — scorers:PL, scorers:BL1 etc.

    #check Redis cache first
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data                                  # cache hit — return immediately, no API call

    # cache miss — call football-data.org
    url = f"{BASE_URL}/competitions/{competition}/scorers"  # scorers endpoint — same base URL, different path
    headers = {"X-Auth-Token": API_KEY}                     # API key in headers — same for every request

    async with httpx.AsyncClient() as client:               # async HTTP client — auto-closes when done
        response = await client.get(url, headers=headers)   # sends GET request, awaits response
        data = response.json()                              # converts response to Python dict

    # save to Redis cache before returning — next request gets cached version
    set_cached(cache_key, data)
    return data                                             # return full response — football.ts extracts what it needs


# get_livematches() — calls football-data.org and returns all matches currently live
# no competition parameter — returns live matches across ALL competitions
# uses params dict to pass ?status=LIVE as a query filter — cleaner than putting it in the URL
async def get_livematches():
    cache_key = f"live:matches"                  # unique cache key per competition

    #check Redis cache first
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data                                  # cache hit — return immediately, no API call

    url = f"{BASE_URL}/matches"                             # general matches endpoint — not competition specific
    headers = {"X-Auth-Token": API_KEY}
    params = {"status": "LIVE"}                             # filter for only live matches — httpx builds ?status=LIVE automatically

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)  # params dict added to request
        data = response.json()


    set_cached("live:matches", data, ttl=30)
    return data

# get_match_detail() — calls football-data.org and returns full details for one specific match
# takes match_id as parameter — use the id field from any match object
# returns score, teams, referee, competition, and match timeline
async def get_match_detail(match_id: int):
    url = f"{BASE_URL}/matches/{match_id}"                  # specific match endpoint — id in the URL path
    headers = {"X-Auth-Token": API_KEY}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        return response.json()


# get_team() — calls football-data.org and returns full info for one specific team
# takes team_id as parameter — use the id field from any team object
# returns squad, coach, stadium, colors, competitions the team is in
async def get_team(team_id: int):
    url = f"{BASE_URL}/teams/{team_id}"                     # specific team endpoint — id in the URL path
    headers = {"X-Auth-Token": API_KEY}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        return response.json()