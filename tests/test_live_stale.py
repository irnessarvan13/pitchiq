# Ticket #29 — /football/live must not pass along "live" matches that are clearly stale.
# On Oct 24, 2026 the live site showed "Santos FC 0 - 0 EC Bahia" as live almost 3 hours after kickoff.
# football-data.org's free plan had never updated that match: its lastUpdated was BEFORE kickoff.
#
# Whether a match is stale depends on what time it is RIGHT NOW. So each test replaces football.utc_now()
# with a fixed time (monkeypatch) — otherwise the result would change depending on when you run the tests.

import json
from datetime import datetime
from pathlib import Path

import httpx
import pytest
import respx

from backend import football

FIXTURES = Path(__file__).parent / "fixtures" / "football"
API = "https://api.football-data.org/v4"


def load(name):
    return json.loads((FIXTURES / name).read_text())      # read a saved fixture file into a dict


# the Santos vs Bahia match kicked off at 01:00 UTC on Oct 25 (6:00 PM PT on Oct 24)
# each case: (what time it is now, the match's lastUpdated, should it be shown as live?)
CASES = [
    # the real Oct 24 situation: 8:46 PM PT = 03:46 UTC, and lastUpdated (00:09:57) is BEFORE kickoff — never updated
    ("2026-10-25T03:46:00Z", "2026-10-25T00:09:57Z", False),
    # a normal live match: kicked off 45 minutes ago, updated a minute ago
    ("2026-10-25T01:45:00Z", "2026-10-25T01:44:00Z", True),
    # updated after kickoff, but kickoff was MORE than 3 hours ago — no match lasts that long
    ("2026-10-25T04:01:00Z", "2026-10-25T03:00:00Z", False),
    # exactly 3 hours after kickoff still counts (extra time + penalties can run long)
    ("2026-10-25T04:00:00Z", "2026-10-25T03:59:00Z", True),
]


@respx.mock
@pytest.mark.parametrize(
    "now, last_updated, shown", CASES,
    ids=["oct-24-never-updated", "normal-live-match", "kicked-off-over-3h-ago", "exactly-3h-after-kickoff"],
)
def test_live_hides_stale_matches(client, monkeypatch, now, last_updated, shown):
    data = load("live_stale_200.json")
    data["matches"][0]["lastUpdated"] = last_updated                                      # set this case's lastUpdated
    respx.get(f"{API}/matches").mock(return_value=httpx.Response(200, json=data))
    monkeypatch.setattr(football, "utc_now", lambda: datetime.fromisoformat(now))       # freeze "right now" for this test

    response = client.get("/football/live")

    home_teams = [match["homeTeam"]["name"] for match in response.json()["matches"]]
    assert home_teams == (["Santos FC"] if shown else [])
