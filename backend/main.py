# FastAPI is the framework | Depends is for dependency injection
from fastapi import FastAPI, Depends, HTTPException

# for CORS middleware — lets React talk to FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Session is the type hint for database session
from sqlalchemy.orm import Session

# database connection and session factory
from backend.database import engine, Base, get_db

# Match model — represents the matches table
from backend.models import Match

# schemas — validate data in and out
from backend.schemas import MatchCreate, MatchResponse

# creates the FastAPI app — everything attaches to this
app = FastAPI()

# adds CORS middleware — allows React on port 3000 to talk to FastAPI on port 8000
# without this the browser blocks all requests from React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React's address
    allow_credentials=True,
    allow_methods=["*"],                       # allow all HTTP methods
    allow_headers=["*"],                       # allow all headers
)

# when FastAPI starts — create all tables in PostgreSQL if they don't exist
# reads models and translates them into SQL CREATE TABLE statements
Base.metadata.create_all(bind=engine)

# ────────────────────────────────────────────
# ENDPOINTS

# health check — simple endpoint to confirm the API is running
# no database needed — just returns a message
@app.get("/")
def root():
    return {"message": "PitchIQ API is running"}

# get all matches — returns every match in the database
# db is injected automatically by FastAPI using our get_db dependency
@app.get("/matches", response_model=list[MatchResponse])
def get_matches(db: Session = Depends(get_db)):
    matches = db.query(Match).all()  # SQLAlchemy: SELECT * FROM matches
    return matches

# get one match by id — returns a single match or 404 if not found
@app.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

# create a new match — accepts match data from React and saves to PostgreSQL
@app.post("/matches", response_model=MatchResponse)
def create_match(match_data: MatchCreate, db: Session = Depends(get_db)):
    # create a new Match object from the incoming data
    new_match = Match(
        home_team=match_data.home_team,
        away_team=match_data.away_team
    )
    db.add(new_match)      # stage the new match to be saved
    db.commit()            # save it to PostgreSQL permanently
    db.refresh(new_match)  # reload from database to get auto-assigned values
    return new_match