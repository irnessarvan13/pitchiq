# Ticket #8 — Redis is only there to make things FASTER.
# If Redis is down, PitchIQ should skip the cache, still get the data from football-data.org,
# and log a warning. This is called "failing open".

import logging
import time
from unittest.mock import MagicMock

import fakeredis
import httpx
import pytest
import redis
import respx

from backend.main import app
from backend.football import get_cache

API = "https://api.football-data.org/v4"
DATA = {"standings": [], "matches": [], "scorers": []}

# the 4 football endpoints that use the cache: (PitchIQ URL, the football-data.org URL it calls)
CACHED_ENDPOINTS = [
    ("/football/matches",   f"{API}/competitions/PL/matches"),
    ("/football/standings", f"{API}/competitions/PL/standings"),
    ("/football/scorers",   f"{API}/competitions/PL/scorers"),
    ("/football/live",      f"{API}/matches"),
]


@pytest.fixture
def redis_down():
    server = fakeredis.FakeServer()
    server.connected = False                                  # pretend Redis crashed — every command raises ConnectionError
    app.dependency_overrides[get_cache] = lambda: fakeredis.FakeRedis(server=server)
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def redis_cant_save():
    broken = MagicMock()
    broken.get.return_value = None                            # reading works (nothing cached yet)
    broken.set.side_effect = redis.ConnectionError("Redis went down")   # but saving fails
    app.dependency_overrides[get_cache] = lambda: broken
    yield
    app.dependency_overrides.clear()


@respx.mock
@pytest.mark.parametrize("endpoint, api_url", CACHED_ENDPOINTS, ids=["matches", "standings", "scorers", "live"])
def test_redis_down_still_returns_the_api_data(client, redis_down, endpoint, api_url):
    respx.get(api_url).mock(return_value=httpx.Response(200, json=DATA))
    response = client.get(endpoint)
    assert response.status_code == 200                        # not a 500 crash
    assert response.json() == DATA                            # the real data from football-data.org


@respx.mock
def test_redis_failing_to_save_still_returns_the_api_data(client, redis_cant_save):
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json=DATA))
    response = client.get("/football/standings")
    assert response.status_code == 200
    assert response.json() == DATA


@respx.mock
def test_redis_down_logs_a_warning(client, redis_down, caplog):
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json=DATA))
    with caplog.at_level(logging.WARNING):                    # catch every WARNING logged during this block
        client.get("/football/standings")
    assert "Redis" in caplog.text                             # someone reading the logs would know Redis is the problem


@pytest.fixture
def real_redis_client_that_is_down():
    from backend.football import make_redis_client            # imported here, so before the fix only THIS test fails
    dead = make_redis_client("localhost", port=1)             # nothing listens on port 1 — like Redis crashed
    app.dependency_overrides[get_cache] = lambda: dead
    yield
    app.dependency_overrides.clear()


@respx.mock
def test_redis_down_does_not_slow_the_page_down(client, real_redis_client_that_is_down):
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json=DATA))
    start = time.perf_counter()                               # start a stopwatch
    response = client.get("/football/standings")
    seconds = time.perf_counter() - start                     # stop the stopwatch
    assert response.status_code == 200
    assert seconds < 1                                        # with redis-py's default retries this took about 7 seconds