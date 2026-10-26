# Fixtures for the unit tests in this folder only.
# Unit tests swap the real services for fakes, so they need NO Docker: no Postgres, no Redis, no internet.

from unittest.mock import AsyncMock, MagicMock

import fakeredis
import pytest

from backend.main import app
from backend.football import get_cache
from backend.predict import get_claude_client


@pytest.fixture(autouse=True)
def clean_slate():
    yield                                   # replaces the main conftest's clean_slate — unit tests don't touch Postgres or Redis


@pytest.fixture
def fake_cache():
    fake = fakeredis.FakeRedis()                          # a pretend Redis that lives in memory
    app.dependency_overrides[get_cache] = lambda: fake    # "when an endpoint asks for get_cache, hand it the fake instead"
    yield fake
    app.dependency_overrides.clear()                      # undo the swap after the test


@pytest.fixture
def fake_claude():
    fake = MagicMock()                                    # a pretend Claude client — it remembers how it was called
    fake.messages.create = AsyncMock()                    # create() must be AWAITED — just like the real async Claude client
    fake.messages.create.return_value.content = [MagicMock(text="Arsenal win 2-1")]   # what the pretend Claude answers
    app.dependency_overrides[get_claude_client] = lambda: fake
    yield fake
    app.dependency_overrides.clear()