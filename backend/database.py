'''
database.py sets up the phone line between FastAPI and PostgreSQL. 
Without it FastAPI and PostgreSQL are two completely separate programs that have no idea each other exists.
It creates the engine (the actual connection), 
the SessionLocal factory (for database sessions), 
Base (foundation for all models), 
and get_db() (the dependency function that gives endpoints their database session).
'''
from sqlalchemy import create_engine                          # tool to create PostgreSQL connection
from sqlalchemy.orm import sessionmaker, declarative_base     # session factory + Base class
from dotenv import load_dotenv                                # reads .env file
import os                                                     # reads environment variables

load_dotenv()                                                 # actually load the .env file

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/pitchiq")  # get URL, fallback if not found

engine = create_engine(DATABASE_URL)                          # actual connection to PostgreSQL

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)  # session factory — each request gets its own session

Base = declarative_base()                                     # foundation all models inherit from

def get_db():                                                 # FastAPI calls this for every endpoint needing the database
    db = SessionLocal()                                       # open a session
    try:
        yield db                                              # give session to endpoint — yield not return (memory leak)
    finally:
        db.close()                                            # ALWAYS close — even if there was an error