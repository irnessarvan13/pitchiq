# Ticket #7 — when football-data.org sends an error, PitchIQ must:
#   1. send React the RIGHT status code (not 200)
#   2. NOT save the error in Redis

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


# every football endpoint: (PitchIQ URL, the football-data.org URL it calls)
ENDPOINTS = [
    ("/football/matches",          f"{API}/competitions/PL/matches"),
    ("/football/standings",        f"{API}/competitions/PL/standings"),
    ("/football/scorers",          f"{API}/competitions/PL/scorers"),
    ("/football/live",             f"{API}/matches"),
    ("/football/matches/560542",   f"{API}/matches/560542"),
    ("/football/teams/57",         f"{API}/teams/57"),
]

# every error: (what football-data.org sends, its body, what PitchIQ should send React)
ERRORS = [
    (429, load("rate_limit_429.json"),           503),   # rate limit      → 503 Service Unavailable
    (403, load("matches_EL_403.json"),           403),   # not on our plan → 403 Forbidden
    (400, load("match_999999999_400.json"),      404),   # "does not exist" (their 400) → 404 Not Found
    (404, {"message": "Not found"},              404),   # a real 404      → 404 Not Found
    (500, {"message": "Internal server error"},  502),   # their server broke → 502 Bad Gateway
]


@respx.mock
@pytest.mark.parametrize("endpoint, api_url", ENDPOINTS, ids=["matches", "standings", "scorers", "live", "match-detail", "team"])
@pytest.mark.parametrize("api_status, api_body, our_status", ERRORS, ids=["429", "403", "400", "404", "500"])
def test_api_errors_get_the_right_status_and_are_not_cached(client, endpoint, api_url, api_status, api_body, our_status):
    respx.get(api_url).mock(return_value=httpx.Response(api_status, json=api_body))
    response = client.get(endpoint)
    assert response.status_code == our_status            # the right status code, not 200
    assert cache.dbsize() == 0                            # nothing was saved in Redis


@respx.mock
def test_rate_limit_tells_react_when_to_retry(client):
    respx.get(f"{API}/competitions/PL/standings").mock(
        return_value=httpx.Response(429, json=load("rate_limit_429.json"), headers={"X-RequestCounter-Reset": "54"})
    )
    response = client.get("/football/standings")
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "54"        # "try again in 54 seconds"
    assert "detail" in response.json()                    # a short message React can show


@respx.mock
def test_after_a_rate_limit_the_next_request_tries_again(client):
    route = respx.get(f"{API}/competitions/PL/standings").mock(
        side_effect=[
            httpx.Response(429, json=load("rate_limit_429.json")),        # 1st call: rate limited
            httpx.Response(200, json=load("standings_PL_200.json")),      # 2nd call: API is back
        ]
    )
    first = client.get("/football/standings")
    second = client.get("/football/standings")
    assert first.status_code == 503
    assert second.status_code == 200
    assert second.json() == load("standings_PL_200.json")  # fresh data, not the old error
    assert route.call_count == 2                            # the API was called again