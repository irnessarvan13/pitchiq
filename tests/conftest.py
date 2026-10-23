import os

# Point the app at the TEST database.
# This line must run BEFORE the app is imported, so it goes at the very top.
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5433/pitchiq_test"

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import engine
from backend.models import Match
from backend.football import cache


@pytest.fixture
def client():
    return TestClient(app)                          # the fake browser, handed to any test that asks for "client"


@pytest.fixture(autouse=True)
def clean_slate():
    with engine.begin() as conn:
        conn.execute(Match.__table__.delete())      # empty the matches table
    cache.flushdb()                                 # empty the Redis cache
    yield                                           # now the test runs