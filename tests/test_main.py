from fastapi.testclient import TestClient   # the tool that sends fake requests to your app
from backend.main import app                 # your FastAPI app, from the file backend/main.py

client = TestClient(app)                     # a fake browser pointed at your app


def test_root_returns_running_message():
    response = client.get("/")                                        # visit /
    assert response.status_code == 200                                # did it succeed?
    assert response.json() == {"message": "PitchIQ API is running"}   # did it say the right thing?
