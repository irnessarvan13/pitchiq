# Ticket #11 — Claude must be called the NON-blocking way (with await),
# so one slow prediction doesn't freeze the server for everyone else.

MATCH = {
    "home_team": "Arsenal", "away_team": "Chelsea", "competition": "Premier League",
    "home_position": 1, "away_position": 4, "home_points": 25, "away_points": 19,
    "home_gd": 12, "away_gd": 6, "matchday": 10,
}


def test_predict_awaits_claude(client, fake_claude):
    response = client.post("/predict", json=MATCH)
    assert response.status_code == 200
    assert response.json() == {"prediction": "Arsenal win 2-1"}
    fake_claude.messages.create.assert_awaited_once()     # the Claude call was AWAITED — not run the blocking way