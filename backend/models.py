'''
models.py has one job: define what your database tables should look like using Python classes.
SQLAlchemy reads these classes and automatically creates the real tables in PostgreSQL when
FastAPI starts. You never write CREATE TABLE SQL manually.

class Match(Base) — inherits from Base (created in database.py) which transforms this 
Python class into a real PostgreSQL table. Without Base it is just a regular Python class.

Column rules:
- nullable=False — field is required. PostgreSQL rejects the row if missing. Same as NOT NULL in SQL.
- default=value — field is optional. PostgreSQL fills it in automatically if not provided.
- server_default=func.now() — PostgreSQL sets the value itself (more reliable than Python for timestamps).
- primary_key=True — unique auto-assigned id for every row. Never set manually.
- index=True — creates an index so lookups by id are instant instead of scanning every row.
'''

from sqlalchemy import Column, Integer, String, DateTime  # Column makes attributes into DB columns, others are data types
from sqlalchemy.sql import func                            # func gives access to SQL functions like func.now()
from backend.database import Base                         # Base connects this class to SQLAlchemy

class Match(Base):
    __tablename__ = "matches"                             # exact name of the table in PostgreSQL — must be lowercase

    id         = Column(Integer, primary_key=True, index=True)  # unique auto-assigned id, indexed for fast lookups
    home_team  = Column(String(100), nullable=False)             # required text, max 100 chars
    away_team  = Column(String(100), nullable=False)             # required text, max 100 chars
    home_score = Column(Integer, default=0)                      # defaults to 0 — matches start 0-0
    away_score = Column(Integer, default=0)                      # defaults to 0 — matches start 0-0
    status     = Column(String(20), nullable=False, default="scheduled")  # scheduled | live | finished
    created_at = Column(DateTime, server_default=func.now())     # PostgreSQL sets timestamp automatically — more reliable than Python