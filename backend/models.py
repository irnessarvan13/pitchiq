'''
Models.py has one job: define what your databse tables should look like using python classes.
Nullable = False means its required.


'''

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from backend.database import Base

class Match(Base):
    __tablename__ = 'Matches' #Just naming this table matches
    
    id = Column(Integer, primary_key=True, index=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(String(20), nullable=False, default="scheduled")
    created_at = Column(DateTime, server_default=func.now())

