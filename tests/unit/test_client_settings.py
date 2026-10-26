# Ticket #18 — found by coverage + mutmut: nothing checked the settings our real clients are built with.
# These settings were decisions (ticket #8, ticket #11), so a test locks them in.

import anthropic

from backend.football import make_redis_client
from backend.predict import get_claude_client


def test_redis_client_settings():
    client = make_redis_client("redis")                      # "redis" = the Redis container's name in Docker — builds the client, doesn't connect yet
    settings = client.connection_pool.connection_kwargs      # the settings it will connect with
    assert settings["host"] == "redis"                       # the host we passed in is the one it uses
    assert settings["port"] == 6379                          # Redis's standard port
    assert settings["db"] == 0
    assert settings["socket_connect_timeout"] == 1           # give up connecting after 1 second (#8)
    assert settings["socket_timeout"] == 1                   # give up waiting for an answer after 1 second (#8)
    assert client.get_retry().get_retries() == 0             # no retries — so a dead Redis never makes users wait (#8)


def test_redis_client_uses_the_port_we_pass_in():
    client = make_redis_client("redis", port=6390)
    assert client.connection_pool.connection_kwargs["port"] == 6390


def test_claude_client_is_async_and_created_once(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    first = get_claude_client()
    second = get_claude_client()
    assert isinstance(first, anthropic.AsyncAnthropic)       # the async client, so predictions don't block the server (#11)
    assert first is second                                   # @lru_cache hands back the SAME client every time