# Ticket #9 — if Postgres is down, PitchIQ should NOT go down with it.
# - the server still starts (and logs an error)
# - football pages keep working (they don't use Postgres)
# - /matches endpoints answer 503 "database unavailable" instead of crashing

import logging

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import get_db

API = "https://api.football-data.org/v4"
DEAD_DATABASE = "postgresql://postgres:postgres@localhost:1/nothing"   # nothing listens on port 1 — like Postgres crashed


@pytest.fixture
def database_down():
    dead_engine = create_engine(DEAD_DATABASE)
    DeadSession = sessionmaker(bind=dead_engine)

    def get_dead_db():                                        # same shape as the real get_db, but points at a dead database
        db = DeadSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = get_dead_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.parametrize("method, url", [
    ("GET", "/matches"),
    ("GET", "/matches/1"),
    ("POST", "/matches"),
], ids=["list", "get-one", "create"])
def test_matches_endpoints_return_503_when_database_is_down(client, database_down, method, url):
    response = client.request(method, url, json={"home_team": "Arsenal", "away_team": "Chelsea"})
    assert response.status_code == 503                        # "temporarily unavailable" — not a 500 crash
    assert "detail" in response.json()                        # a short message React can show


@respx.mock
def test_server_starts_and_football_works_when_database_is_down(monkeypatch, fake_cache, caplog):
    monkeypatch.setattr("backend.main.engine", create_engine(DEAD_DATABASE))   # the startup code will try a dead database
    respx.get(f"{API}/competitions/PL/standings").mock(return_value=httpx.Response(200, json={"standings": []}))

    with caplog.at_level(logging.ERROR):
        with TestClient(app) as client:                       # "with" runs the lifespan = the real server startup
            response = client.get("/football/standings")

    assert response.status_code == 200                        # football pages still work
    assert "Postgres" in caplog.text                          # and the logs say what's wrong
    