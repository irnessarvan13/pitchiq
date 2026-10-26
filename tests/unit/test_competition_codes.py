# Ticket #16 — only accept the league codes PitchIQ supports.
# A bad code gets 422 right away — no wasted football-data.org request, no junk keys in Redis.

import httpx
import pytest
import respx

API = "https://api.football-data.org/v4"

# the 12 competitions on our football-data.org plan (written out here on purpose,
# so the test catches it if someone changes the app's list by accident)
SUPPORTED = ["PL", "ELC", "BL1", "SA", "PD", "FL1", "DED", "PPL", "BSA", "CL", "EC", "WC"]

COMPETITION_ENDPOINTS = ["/football/matches", "/football/standings", "/football/scorers"]


def test_the_supported_list_lives_in_one_place():
    from backend.football import SUPPORTED_COMPETITIONS      # imported here, so before the fix only THIS test fails
    assert sorted(SUPPORTED_COMPETITIONS) == sorted(SUPPORTED)


@respx.mock
@pytest.mark.parametrize("code", SUPPORTED)
def test_every_supported_code_works(client, fake_cache, code):
    respx.get(f"{API}/competitions/{code}/standings").mock(return_value=httpx.Response(200, json={"standings": []}))
    response = client.get(f"/football/standings?competition={code}")
    assert response.status_code == 200


@respx.mock
@pytest.mark.parametrize("endpoint", COMPETITION_ENDPOINTS, ids=["matches", "standings", "scorers"])
@pytest.mark.parametrize("bad_code", ["XYZ", "", "PL/../teams", "EL", "CLI", "pl"],
                         ids=["made-up", "empty", "path-trick", "not-on-our-plan", "paid-tier", "lowercase"])
def test_unsupported_codes_get_422_without_calling_the_api(client, fake_cache, endpoint, bad_code):
    any_request = respx.route().mock(return_value=httpx.Response(200, json={}))   # catches ANY call our app makes
    response = client.get(endpoint, params={"competition": bad_code})
    assert response.status_code == 422                       # rejected at the door
    assert any_request.call_count == 0                       # football-data.org was never called
    assert fake_cache.dbsize() == 0                          # and no junk key was saved in Redis