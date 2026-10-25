# Unit tests — fast, and they need NO Docker.
# The real Redis and Claude are swapped for fakes (see tests/unit/conftest.py).

import os
import subprocess
import sys

import httpx
import respx

API = "https://api.football-data.org/v4"

MATCH = {
    "home_team": "Arsenal", "away_team": "Chelsea", "competition": "Premier League",
    "home_position": 1, "away_position": 4, "home_points": 25, "away_points": 19,
    "home_gd": 12, "away_gd": 6, "matchday": 10,
}


def test_app_loads_without_postgres_redis_or_api_keys():
    # start a brand-new Python that only knows a database address where nothing is running
    env = {"PATH": os.environ["PATH"], "DATABASE_URL": "postgresql://nobody@localhost:1/nothing"}
    result = subprocess.run([sys.executable, "-c", "import backend.main"], env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr          # 0 = it loaded without crashing


@respx.mock
def test_football_endpoint_uses_the_fake_redis(client, fake_cache):
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json={"standings": []}))
    response = client.get("/football/standings")
    assert response.status_code == 200
    assert fake_cache.exists("standings:PL")              # it was saved in the FAKE Redis, not the real one


def test_predict_uses_the_fake_claude(client, fake_claude):
    response = client.post("/predict", json=MATCH)
    assert response.status_code == 200
    assert response.json() == {"prediction": "Arsenal win 2-1"}
    prompt = fake_claude.messages.create.call_args.kwargs["messages"][0]["content"]   # what we sent the pretend Claude
    assert "Arsenal" in prompt and "Chelsea" in prompt    # the prompt included both teams