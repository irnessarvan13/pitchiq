# Ticket #13 — a missing API key should give:
#   - a warning at startup that NAMES the missing variable (never its value)
#   - a clear 503 "not configured" from the features that need it
# instead of confusing crashes later. Everything else keeps working.

import logging
from unittest.mock import AsyncMock

import httpx
import respx
from fastapi.testclient import TestClient

from backend.main import app

API = "https://api.football-data.org/v4"
VALID = {
    "home_team": "Arsenal", "away_team": "Chelsea", "competition": "Premier League",
    "home_position": 1, "away_position": 4, "home_points": 25, "away_points": 19,
    "home_gd": 12, "away_gd": 6, "matchday": 10,
}


@respx.mock
def test_no_football_key_returns_503_without_calling_the_api(client, fake_cache, monkeypatch):
    monkeypatch.delenv("FOOTBALL_API_KEY")                    # pretend the key was never set (undone after the test)
    route = respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json={}))
    response = client.get("/football/standings")
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
    assert route.call_count == 0                              # football-data.org was never called


def test_no_claude_key_returns_503(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    fake_get_prediction = AsyncMock(return_value="should never be used")
    monkeypatch.setattr("backend.main.get_prediction", fake_get_prediction)   # so this test can never reach the real Claude
    response = client.post("/predict", json=VALID)
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
    fake_get_prediction.assert_not_called()                   # we never even tried to ask Claude


@respx.mock
def test_football_still_works_without_the_claude_key(client, fake_cache, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY")                   # only the CLAUDE key is missing
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json={"standings": []}))
    response = client.get("/football/standings")
    assert response.status_code == 200                        # football pages don't need Claude


def test_startup_warns_about_missing_keys_by_name(monkeypatch, caplog):
    monkeypatch.delenv("FOOTBALL_API_KEY")
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    with caplog.at_level(logging.WARNING):
        with TestClient(app):                                 # "with" runs the real server startup (lifespan)
            pass
    assert "FOOTBALL_API_KEY" in caplog.text                  # the log says exactly WHICH setting is missing
    assert "ANTHROPIC_API_KEY" in caplog.text


def test_startup_never_logs_a_key_value(monkeypatch, caplog):
    monkeypatch.setenv("FOOTBALL_API_KEY", "super-secret-value")   # this key IS set...
    monkeypatch.delenv("ANTHROPIC_API_KEY")                         # ...this one isn't
    with caplog.at_level(logging.WARNING):
        with TestClient(app):
            pass
    assert "ANTHROPIC_API_KEY" in caplog.text                 # the missing one is named
    assert "super-secret-value" not in caplog.text            # a key's VALUE never ends up in the logs