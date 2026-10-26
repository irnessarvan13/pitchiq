# Ticket #18 — found by coverage: only /football/standings had a "2nd request comes
# from the cache" test. A broken cache on matches, scorers or live would have gone unnoticed.

import httpx
import pytest
import respx

API = "https://api.football-data.org/v4"

# the 4 football endpoints that cache per competition (or "live"): (PitchIQ URL, the football-data.org URL it calls)
CACHED_ENDPOINTS = [
    ("/football/matches?competition=PL",   f"{API}/competitions/PL/matches"),
    ("/football/standings?competition=PL", f"{API}/competitions/PL/standings"),
    ("/football/scorers?competition=PL",   f"{API}/competitions/PL/scorers"),
    ("/football/live",                     f"{API}/matches"),
]


@respx.mock
@pytest.mark.parametrize("endpoint, api_url", CACHED_ENDPOINTS, ids=["matches", "standings", "scorers", "live"])
def test_second_request_comes_from_cache(client, endpoint, api_url):
    route = respx.get(api_url).mock(return_value=httpx.Response(200, json={"from": "football-data.org"}))
    first = client.get(endpoint)
    second = client.get(endpoint)
    assert first.json() == {"from": "football-data.org"}
    assert second.json() == first.json()                     # same data both times...
    assert route.call_count == 1                             # ...but football-data.org was only asked ONCE
    