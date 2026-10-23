# Characterization tests for the /matches endpoints (the ones that use Postgres).
# They record what the app does TODAY — not what it should do.


def test_list_matches_starts_empty(client):
    response = client.get("/matches")
    assert response.status_code == 200
    assert response.json() == []


def test_create_match_fills_in_defaults(client):
    response = client.post("/matches", json={"home_team": "Arsenal", "away_team": "Chelsea"})
    assert response.status_code == 200              # today it returns 200 (not 201)
    body = response.json()
    assert body["home_team"] == "Arsenal"
    assert body["away_team"] == "Chelsea"
    assert body["home_score"] == 0                  # default from models.py
    assert body["away_score"] == 0                  # default from models.py
    assert body["status"] == "scheduled"            # default from models.py
    assert isinstance(body["id"], int)              # Postgres gave it an id
    assert body["created_at"] is not None           # Postgres gave it a timestamp


def test_created_match_shows_up_in_list(client):
    client.post("/matches", json={"home_team": "Arsenal", "away_team": "Chelsea"})
    response = client.get("/matches")
    assert len(response.json()) == 1
    assert response.json()[0]["home_team"] == "Arsenal"


def test_get_match_by_id(client):
    created = client.post("/matches", json={"home_team": "Arsenal", "away_team": "Chelsea"}).json()
    response = client.get(f"/matches/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created               # same match comes back


def test_get_missing_match_returns_404(client):
    response = client.get("/matches/999999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Match not found"}


def test_get_match_with_text_id_returns_422(client):
    response = client.get("/matches/abc")
    assert response.status_code == 422             # FastAPI rejects it: match_id must be a number


def test_create_match_missing_team_returns_422(client):
    response = client.post("/matches", json={"home_team": "Arsenal"})
    assert response.status_code == 422             # Pydantic rejects it: away_team is required