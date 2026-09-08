'''
football.py — handles all communication with the football-data.org API.
FastAPI acts as the middleman: React asks FastAPI, FastAPI asks football-data.org,
football-data.org sends back real soccer data, FastAPI returns it to React.
'''
import httpx                              # makes HTTP requests from Python — like axios but for backend
import os                                 # reads environment variables
from dotenv import load_dotenv            # reads .env file so os.getenv() can find our API key

load_dotenv()                             # actually reads the .env file — must be called before os.getenv()

API_KEY = os.getenv("FOOTBALL_API_KEY")  # reads API key
BASE_URL = "https://api.football-data.org/v4"  # base URL — we add endpoint paths on top: /competitions/PL/matches

# get_matches() — calls football-data.org and returns match data for a competition
# async because network requests take time — await lets other requests run while waiting
# competition="PL" is a default parameter — PL = Premier League. Pass "BL1" for Bundesliga etc.
async def get_matches(competition="PL"):
    url = f"{BASE_URL}/competitions/{competition}/matches"  # f-string builds the full URL dynamically
    headers = {"X-Auth-Token": API_KEY}                     # API key goes in headers — X-Auth-Token is what football-data.org expects

    async with httpx.AsyncClient() as client:   # async HTTP client — auto-closes when done, no memory leaks
        response = await client.get(url, headers=headers)   # sends GET request, awaits response from football-data.org
        return response.json()                              # converts response to Python dict and returns it