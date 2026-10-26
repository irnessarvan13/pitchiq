# Ticket #15 — cache single matches and teams too, so every page view
# doesn't spend one of our 10 football-data.org requests per minute.

import json
from pathlib import Path

import httpx
import pytest
import respx

from backend.football import cache

FIXTURES = Path(__file__).parent / "fixtures" / "football"
API = "https://api.football-data.org/v4"


def load(name):
    return json.loads((FIXTURES / name).read_text())


@respx.mock
def test_match_detail_is_cached(client):
    route = respx.get(f"{API}/matches/560542").mock(return_value=httpx.Response(200, json=load("match_560542_200.json")))
    first = client.get("/football/matches/560542")
    second = client.get("/football/matches/560542")
    assert second.json() == first.json()
    assert route.call_count == 1                           # the 2nd request came from Redis


@respx.mock
def test_team_is_cached(client):
    route = respx.get(f"{API}/teams/57").mock(return_value=httpx.Response(200, json=load("team_57_200.json")))
    first = client.get("/football/teams/57")
    second = client.get("/football/teams/57")
    assert second.json() == first.json()
    assert route.call_count == 1


@respx.mock
def test_different_ids_get_different_cache_keys(client):
    respx.get(f"{API}/matches/1").mock(return_value=httpx.Response(200, json={"id": 1, "status": "FINISHED"}))
    respx.get(f"{API}/matches/2").mock(return_value=httpx.Response(200, json={"id": 2, "status": "FINISHED"}))
    respx.get(f"{API}/teams/57").mock(return_value=httpx.Response(200, json={"id": 57}))
    respx.get(f"{API}/teams/61").mock(return_value=httpx.Response(200, json={"id": 61}))
    assert client.get("/football/matches/1").json()["id"] == 1
    assert client.get("/football/matches/2").json()["id"] == 2      # NOT match 1's cached data
    assert client.get("/football/teams/57").json()["id"] == 57
    assert client.get("/football/teams/61").json()["id"] == 61
    for key in ["match:1", "match:2", "team:57", "team:61"]:
        assert cache.exists(key)                                    # each one saved under its own key


@respx.mock
@pytest.mark.parametrize("status, shortest, longest", [
    ("FINISHED", 3600, 86400),     # a finished match never changes → keep it for a day
    ("IN_PLAY",  1,    30),        # live → the score can change any minute
    ("PAUSED",   1,    30),        # half-time → still live
    ("TIMED",    31,   300),       # scheduled → kickoff times rarely change, check every 5 minutes
])
def test_match_cache_time_depends_on_status(client, status, shortest, longest):
    respx.get(f"{API}/matches/1").mock(return_value=httpx.Response(200, json={"id": 1, "status": status}))
    client.get("/football/matches/1")
    assert shortest <= cache.ttl("match:1") <= longest


@respx.mock
def test_team_is_cached_for_12_hours(client):
    respx.get(f"{API}/teams/57").mock(return_value=httpx.Response(200, json={"id": 57}))
    client.get("/football/teams/57")
    assert 3600 < cache.ttl("team:57") <= 12 * 60 * 60    # team info (name, crest, stadium) barely changes