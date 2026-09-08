'''
main.py is the heart of the FastAPI backend.
It creates the FastAPI app, adds CORS middleware so React can talk to it, creates database tables on startup,
and defines all the endpoints.
It's where everything comes together and the server starts listening for requests.

I import FastAPI to create the app,
Depends to automatically inject the database session into endpoints by calling get_db(),
and HTTPException to raise proper HTTP errors like 404 when something goes wrong.

CORSMiddleware is the tool that allows React to talk to FastAPI across different ports.

Session is just a type hint in my endpoint functions.

Import engine and Base to create the database tables on startup.
I import get_db so FastAPI can automatically open a database session for each endpoint that needs it and close it when done.
engine - the permanent connection to PostgreSQL. Always open.
get_db - opens a temporary session for one request, gives it to the endpoint, then closes it.

from backend.models import Match — imports the class where we defined what the table looks like.
Base.metadata.create_all(bind=engine) — actually goes and creates it in PostgreSQL on startup.
Two separate steps. One defines it, one builds it.

app = FastAPI() creates the single FastAPI application instance.
Everything in the backend attaches to this — middleware, endpoints, startup events. There is only ever one of these.

from backend.football import get_matches — imports the function that calls football-data.org.
FastAPI acts as the middleman: React asks FastAPI, FastAPI asks football-data.org, data comes back to React.
'''

from fastapi import FastAPI, Depends, HTTPException          # FastAPI = app | Depends = inject db session | HTTPException = throw errors
from fastapi.middleware.cors import CORSMiddleware           # allows React on port 3000 to talk to FastAPI on port 8000
from sqlalchemy.orm import Session                           # type hint for db parameter in endpoints — gives autocomplete
from backend.database import engine, Base, get_db           # engine + Base = create tables on startup | get_db = session dependency
from backend.models import Match                             # imports Match so SQLAlchemy knows to create the matches table
from backend.schemas import MatchCreate, MatchResponse       # MatchCreate = validates IN | MatchResponse = formats OUT
from backend.football import get_matches                     # imports get_matches from football.py to call football-data.org API

app = FastAPI()                                              # creates the single FastAPI app instance — everything attaches to this

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],                 # only allow requests from React's address — change to real domain in production
    allow_credentials=True,                                  # allows cookies and auth headers
    allow_methods=["*"],                                     # allow all HTTP methods — GET POST PUT DELETE
    allow_headers=["*"],                                     # allow all request headers
)

Base.metadata.create_all(bind=engine)                       # runs once on startup — reads all models and creates their tables in PostgreSQL if they don't exist

# ─────────────────────────────────────────────
# LOCAL DATABASE ENDPOINTS
# ─────────────────────────────────────────────

# health check — confirms the server is alive. Every production API has one of these.
@app.get("/")
def root():
    return {"message": "PitchIQ API is running"}


# GET /matches — fetches ALL matches from the local PostgreSQL database and returns them as a list
# response_model=list[MatchResponse] formats every match through MatchResponse schema
# db: Session = Depends(get_db) — FastAPI automatically injects the database session
# db.query(Match).all() — SQLAlchemy runs SELECT * FROM matches
@app.get("/matches", response_model=list[MatchResponse])
def get_all_matches(db: Session = Depends(get_db)):
    matches = db.query(Match).all()                         # SELECT * FROM matches
    return matches                                          # FastAPI formats through MatchResponse and converts to JSON


# GET /matches/{match_id} — fetches ONE specific match by id from local database
# {match_id} is a path parameter — FastAPI extracts it from the URL automatically
# match_id: int — FastAPI converts the URL string to an integer automatically
# .filter(Match.id == match_id).first() — SELECT * FROM matches WHERE id = match_id LIMIT 1
# returns one Match object or None if not found
@app.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:                                           # if query returned None — match doesn't exist
        raise HTTPException(status_code=404, detail="Match not found")  # raise not return — this is an error not a normal response
    return match


# POST /matches — creates a NEW match in the local database
# match_data: MatchCreate — FastAPI validates the JSON body against MatchCreate automatically
# if validation fails FastAPI returns 422 before this function even runs
@app.post("/matches", response_model=MatchResponse)
def create_match(match_data: MatchCreate, db: Session = Depends(get_db)):
    new_match = Match(
        home_team=match_data.home_team,                    # pull from validated request data
        away_team=match_data.away_team                     # pull from validated request data
    )                                                       # id, scores, status, created_at get defaults from model automatically
    db.add(new_match)                                      # stage for saving — like putting in a cart
    db.commit()                                            # save to PostgreSQL permanently — like checking out
    db.refresh(new_match)                                  # reload from PostgreSQL to get auto-assigned id and created_at
    return new_match                                       # FastAPI formats through MatchResponse and sends to React as JSON


# ─────────────────────────────────────────────
# FOOTBALL API ENDPOINTS — live data from football-data.org
# ─────────────────────────────────────────────

# GET /football/matches — fetches REAL live match data from football-data.org
# async because we are awaiting an external API call over the internet — takes time
# competition is a query parameter with default "PL" (Premier League)
# React can pass ?competition=BL1 for Bundesliga, ?competition=SA for Serie A etc.
# FastAPI acts as middleman: React → FastAPI → football-data.org → FastAPI → React
@app.get("/football/matches")
async def football_matches(competition: str = "PL"):
    data = await get_matches(competition)                  # calls football.py which calls football-data.org
    return data                                            # real live soccer data sent back to React as JSON