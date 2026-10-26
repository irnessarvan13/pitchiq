'''
schemas.py is the gatekeeper on both ends of the API.
MatchCreate — validates what React sends IN.
MatchResponse — controls what FastAPI sends OUT.

BaseModel from Pydantic gives all schemas automatic data validation.
Optional from typing means a field can be missing or None and Pydantic won't reject the request.

MatchCreate: only needs home_team and away_team. Pydantic automatically rejects 
anything missing or wrong type with a 422 error before my code even runs.

MatchResponse: 7 fields including ones PostgreSQL assigned automatically.
from_attributes = True tells Pydantic to read SQLAlchemy objects not just dictionaries.
Without it FastAPI crashes when sending database data to React.

Model vs Schema:
- Model (models.py) = how data is STORED in PostgreSQL. SQLAlchemy uses it.
- Schema (schemas.py) = how data looks coming IN and going OUT. Pydantic uses it.
'''

from pydantic import BaseModel, Field    # BaseModel = foundation for all schemas — gives automatic validation | Field = extra rules like "must be 1 or more"
from datetime import datetime      # needed as type hint for created_at field in MatchResponse
from typing import Optional        # Optional = field can be missing or None — Pydantic won't reject it

# MatchCreate — what React sends IN when creating a match
# Only 2 fields because everything else (id, scores, status, created_at) has defaults in the model
class MatchCreate(BaseModel):
    home_team: str    # required — must be a string. Missing or wrong type = automatic 422 error
    away_team: str    # required — must be a string. Missing or wrong type = automatic 422 error


# MatchResponse — what FastAPI sends OUT back to React
# 7 fields because React needs everything including what PostgreSQL assigned automatically
class MatchResponse(BaseModel):
    id: int                  # unique id PostgreSQL auto-assigned — React needs this to reference specific matches
    home_team: str           # home team name
    away_team: str           # away team name
    home_score: int          # current home score
    away_score: int          # current away score
    status: str              # scheduled | live | finished
    created_at: datetime     # when the match was created — datetime type hint so Pydantic formats it correctly

    class Config:
        from_attributes = True  # CRITICAL — tells Pydantic to read SQLAlchemy objects not just dicts
                                # FastAPI gets SQLAlchemy objects from DB, not dicts
                                # without this FastAPI crashes every time it sends DB data to React


# PredictRequest — what React sends IN to /predict
# FastAPI checks every request against this BEFORE our code runs:
# a missing field, a wrong type, or an impossible value = automatic 422, and Claude is never called
# Field(ge=1) means "greater than or equal to 1"
class PredictRequest(BaseModel):
    home_team: str                    # home team name
    away_team: str                    # away team name
    competition: str                  # competition name e.g. Premier League
    home_position: int = Field(ge=1)  # league position — 1st or lower, never 0 or negative
    away_position: int = Field(ge=1)
    home_points: int = Field(ge=0)    # points can be 0, but never negative
    away_points: int = Field(ge=0)
    home_gd: int                      # goal difference CAN be negative — so no rule here
    away_gd: int
    matchday: int = Field(ge=1)       # there's no matchday 0