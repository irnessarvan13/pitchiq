# Ticket #12 — we can't test WHAT Claude writes, but we control:
#   1. what we SEND Claude (the prompt, the model, the length limit)
#   2. what we do when Claude FAILS (a clean 503 — never Claude's raw error text)

import logging
from unittest.mock import MagicMock

import anthropic
import httpx
import pytest

VALID = {
    "home_team": "Arsenal", "away_team": "Chelsea", "competition": "Premier League",
    "home_position": 1, "away_position": 4, "home_points": 25, "away_points": 19,
    "home_gd": 12, "away_gd": 6, "matchday": 10,
}
UNAVAILABLE = {"detail": "Predictions are unavailable right now. Please try again later."}


# ── what we SEND Claude ──

def test_prompt_contains_all_10_inputs(client, fake_claude):
    client.post("/predict", json=VALID)
    prompt = fake_claude.messages.create.call_args.kwargs["messages"][0]["content"]   # the prompt our code sent
    expected = [
        "Competition: Premier League", "Matchday: 10",
        "Home team: Arsenal", "Away team: Chelsea",
        "League position: 1", "League position: 4",
        "Points: 25", "Points: 19",
        "Goal difference: 12", "Goal difference: 6",
    ]
    for text in expected:
        assert text in prompt                                  # every input made it into the prompt


def test_model_and_max_tokens(client, fake_claude):
    client.post("/predict", json=VALID)
    sent = fake_claude.messages.create.call_args.kwargs        # every setting our code sent with the request
    assert sent["model"] == "claude-sonnet-4-6"
    assert sent["max_tokens"] == 300


def test_claude_text_comes_back_as_the_prediction(client, fake_claude):
    fake_claude.messages.create.return_value.content = [MagicMock(text="Chelsea win 1-0")]
    response = client.post("/predict", json=VALID)
    assert response.json() == {"prediction": "Chelsea win 1-0"}


# ── what we do when Claude FAILS ──

REQUEST = httpx.Request("POST", "https://api.anthropic.com/v1/messages")   # a pretend request, needed to build the errors


def claude_error(error_class, status_code):
    # builds the same error the real Claude SDK throws when Claude answers with this status code
    return error_class("secret internal detail xyz", response=httpx.Response(status_code, request=REQUEST), body=None)


CLAUDE_ERRORS = [
    claude_error(anthropic.RateLimitError, 429),               # we asked Claude too often
    claude_error(anthropic.OverloadedError, 529),              # Claude is overloaded
    claude_error(anthropic.InternalServerError, 500),          # Claude's server broke
    claude_error(anthropic.AuthenticationError, 401),          # bad API key
    anthropic.APITimeoutError(request=REQUEST),                # Claude took too long
    anthropic.APIConnectionError(message="secret internal detail xyz", request=REQUEST),   # couldn't reach Claude
]


@pytest.mark.parametrize("error", CLAUDE_ERRORS, ids=["rate-limit", "overloaded", "server-error", "bad-key", "timeout", "cant-connect"])
def test_claude_errors_return_a_clean_503(client, fake_claude, caplog, error):
    fake_claude.messages.create.side_effect = error            # the fake Claude throws this error instead of answering
    with caplog.at_level(logging.ERROR):
        response = client.post("/predict", json=VALID)
    assert response.status_code == 503                         # "unavailable right now" — not a 500
    assert response.json() == UNAVAILABLE                      # the same clean message every time
    assert str(error) not in response.text                     # Claude's raw error text never reaches the browser
    assert "Claude" in caplog.text                             # but the real error IS in the server logs
    