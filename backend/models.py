# Column defines a column in the table
# Integer, String, DateTime are the data types for each column
from sqlalchemy import Column, Integer, String, DateTime

# func gives SQL functions like NOW() for timestamps
from sqlalchemy.sql import func

# Base is from database.py — all models inherit from it
from backend.database import Base

# this class represents the matches table in PostgreSQL
# every attribute is a column in that table
class Match(Base):

    # tells SQLAlchemy which PostgreSQL table this maps to
    __tablename__ = "matches"

    # unique id — auto assigned by PostgreSQL, indexed for fast lookups
    id         = Column(Integer, primary_key=True, index=True)

    # home and away team names — required, max 100 characters
    home_team  = Column(String(100), nullable=False)
    away_team  = Column(String(100), nullable=False)

    # scores — default to 0 at kickoff
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)

    # match status — scheduled, live, or finished
    status     = Column(String(20), default="scheduled")

    # automatically set to the current time when a match is created
    created_at = Column(DateTime, server_default=func.now())