# Ticket #14 — /predict must REJECT a bad request with 422,
# BEFORE Claude is ever called (no wasted Claude calls, no 500 crashes).

import pytest

VALID = {
    "home_team": "Arsenal", "away_team": "Chelsea", "competition": "Premier League",
    "home_position": 1, "away_position": 4, "home_points": 25, "away_points": 19,
    "home_gd": 12, "away_gd": 6, "matchday": 10,
}


@pytest.mark.parametrize("missing_field", list(VALID))       # runs once for each of the 10 field names
def test_missing_field_returns_422(client, fake_claude, missing_field):
    body = dict(VALID)                                        # a copy, so VALID itself never changes
    del body[missing_field]                                   # remove one field
    response = client.post("/predict", json=body)
    assert response.status_code == 422                        # rejected — not a 500 crash
    fake_claude.messages.create.assert_not_called()           # Claude was never asked


@pytest.mark.parametrize("field, bad_value", [
    ("home_position", "first"),
    ("away_position", "fourth"),
    ("matchday", "ten"),
    ("home_points", "lots"),
    ("home_team", None),
], ids=["text-position", "text-away-position", "text-matchday", "text-points", "no-team-name"])
def test_wrong_type_returns_422(client, fake_claude, field, bad_value):
    body = {**VALID, field: bad_value}                        # VALID, but with one field swapped for a bad value
    response = client.post("/predict", json=body)
    assert response.status_code == 422
    fake_claude.messages.create.assert_not_called()


@pytest.mark.parametrize("field, impossible_value", [
    ("home_position", 0),
    ("away_position", -3),
    ("matchday", 0),
    ("home_points", -1),
], ids=["position-0", "negative-position", "matchday-0", "negative-points"])
def test_impossible_value_returns_422(client, fake_claude, field, impossible_value):
    body = {**VALID, field: impossible_value}
    response = client.post("/predict", json=body)
    assert response.status_code == 422                        # there's no 0th place, no matchday 0, no negative points
    fake_claude.messages.create.assert_not_called()


def test_empty_body_returns_422(client, fake_claude):
    response = client.post("/predict", json={})
    assert response.status_code == 422
    fake_claude.messages.create.assert_not_called()


def test_valid_body_still_returns_200(client, fake_claude):
    response = client.post("/predict", json=VALID)
    assert response.status_code == 200
    assert response.json() == {"prediction": "Arsenal win 2-1"}
    fake_claude.messages.create.assert_awaited_once()