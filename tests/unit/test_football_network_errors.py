# Ticket #10 — if football-data.org is SLOW or UNREACHABLE,
# PitchIQ must send React a clear error (not a bare 500) and cache nothing.

import httpx
import pytest
import respx

API = "https://api.football-data.org/v4"

# every football endpoint: (PitchIQ URL, the football-data.org URL it calls)
ENDPOINTS = [
    ("/football/matches",          f"{API}/competitions/PL/matches"),
    ("/football/standings",        f"{API}/competitions/PL/standings"),
    ("/football/scorers",          f"{API}/competitions/PL/scorers"),
    ("/football/live",             f"{API}/matches"),
    ("/football/matches/560542",   f"{API}/matches/560542"),
    ("/football/teams/57",         f"{API}/teams/57"),
]

# (the network problem, what PitchIQ should send React)
NETWORK_ERRORS = [
    (httpx.ReadTimeout("football-data.org took too long"), 504),       # they didn't answer in time → 504 Gateway Timeout
    (httpx.ConnectError("couldn't connect to football-data.org"), 502), # couldn't reach them at all → 502 Bad Gateway
]


@respx.mock
@pytest.mark.parametrize("endpoint, api_url", ENDPOINTS, ids=["matches", "standings", "scorers", "live", "match-detail", "team"])
@pytest.mark.parametrize("network_error, our_status", NETWORK_ERRORS, ids=["timeout", "cant-connect"])
def test_network_errors_get_a_clear_status_and_are_not_cached(client, fake_cache, endpoint, api_url, network_error, our_status):
    respx.get(api_url).mock(side_effect=network_error)       # instead of answering, the fake API throws this error
    response = client.get(endpoint)
    assert response.status_code == our_status                # 504 or 502 — not a bare 500
    assert "detail" in response.json()                       # a short message React can show
    assert fake_cache.dbsize() == 0                          # nothing was cached