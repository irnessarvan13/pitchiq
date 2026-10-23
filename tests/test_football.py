# Characterization tests for the /football endpoints.
# respx catches every call to football-data.org and answers with a saved fixture,
# so these tests never touch the real API (no key, no rate limit, same answer every time).

import json
from pathlib import Path

import httpx
import respx

from backend.football import cache

FIXTURES = Path(__file__).parent / "fixtures" / "football"
API = "https://api.football-data.org/v4"


def load(name):
    return json.loads((FIXTURES / name).read_text())      # read a saved fixture file into a dict


@respx.mock
def test_standings_returns_the_api_data(client):
    respx.get(f"{API}/competitions/PL/standings").mock(
        return_value=httpx.Response(200, json=load("standings_PL_200.json"))
    )
    response = client.get("/football/standings")
    assert response.status_code == 200
    assert response.json() == load("standings_PL_200.json")


@respx.mock
def test_second_request_comes_from_cache(client):
    route = respx.get(f"{API}/competitions/PL/standings").mock(
        return_value=httpx.Response(200, json=load("standings_PL_200.json"))
    )
    first = client.get("/football/standings")
    second = client.get("/football/standings")
    assert second.json() == first.json()
    assert route.call_count == 1                           # the API was only called ONCE


@respx.mock
def test_each_competition_gets_its_own_cache_key(client):
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json={"league": "PL"}))
    respx.get(f"{API}/competitions/BL1/standings").mock(return_value=httpx.Response(200, json={"league": "BL1"}))
    assert client.get("/football/standings?competition=PL").json() == {"league": "PL"}
    assert client.get("/football/standings?competition=BL1").json() == {"league": "BL1"}
    assert cache.exists("standings:PL")
    assert cache.exists("standings:BL1")


@respx.mock
def test_cache_lasts_60_seconds(client):
    respx.get(f"{API}/competitions/PL/matches").mock(
        return_value=httpx.Response(200, json=load("matches_PL_200.json"))
    )
    client.get("/football/matches")
    assert 0 < cache.ttl("matches:PL") <= 60               # ttl = seconds left before Redis deletes it


@respx.mock
def test_live_asks_for_status_live_and_caches_30_seconds(client):
    route = respx.get(f"{API}/matches", params={"status": "LIVE"}).mock(
        return_value=httpx.Response(200, json=load("live_empty_200.json"))
    )
    response = client.get("/football/live")
    assert response.json() == load("live_empty_200.json")
    assert route.call_count == 1
    assert 0 < cache.ttl("live:matches") <= 30


@respx.mock
def test_api_key_is_sent_in_the_header(client):
    route = respx.get(f"{API}/competitions/PL/scorers").mock(
        return_value=httpx.Response(200, json=load("scorers_PL_200.json"))
    )
    client.get("/football/scorers")
    assert route.calls.last.request.headers["X-Auth-Token"] == "test-football-key"


@respx.mock
def test_match_detail_is_not_cached(client):
    # Recorded on purpose — issue #15 will add caching, and then this test changes.
    route = respx.get(f"{API}/matches/560542").mock(
        return_value=httpx.Response(200, json=load("match_560542_200.json"))
    )
    client.get("/football/matches/560542")
    client.get("/football/matches/560542")
    assert route.call_count == 2                           # the API was called BOTH times


@respx.mock
def test_rate_limit_error_is_returned_as_200_and_cached(client):
    # BUG recorded on purpose — issue #7 will fix this, and then this test changes.
    route = respx.get(f"{API}/competitions/PL/standings").mock(
        return_value=httpx.Response(429, json=load("rate_limit_429.json"))
    )
    first = client.get("/football/standings")
    second = client.get("/football/standings")
    assert first.status_code == 200                        # the 429 error comes back as "success"
    assert first.json() == load("rate_limit_429.json")     # with the error message as the data
    assert second.json() == first.json()
    assert route.call_count == 1                           # and the error got cached