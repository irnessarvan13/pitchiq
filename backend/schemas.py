# Pydantic is the library FastAPI uses for data validation
# BaseModel is the foundation all schemas inherit from
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# schema for creating a new match — what React sends to FastAPI
# only includes fields the user provides — everything else has defaults
class MatchCreate(BaseModel):
    home_team: str           # required — must be a string
    away_team: str           # required — must be a string

# schema for reading a match — what FastAPI sends back to React
# includes all fields including ones PostgreSQL assigned automatically
class MatchResponse(BaseModel):
    id: int                  # assigned by PostgreSQL automatically
    home_team: str           # home team name
    away_team: str           # away team name
    home_score: int          # current home score
    away_score: int          # current away score
    status: str              # scheduled, live, or finished
    created_at: datetime     # when the match was created

    # this tells Pydantic to work with SQLAlchemy models directly
    # without this Pydantic can't read data from SQLAlchemy objects
    class Config:
        from_attributes = True