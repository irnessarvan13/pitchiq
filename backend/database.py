# imports the tool that creates the actual connection to PostgreSQL
from sqlalchemy import create_engine

# sessionmaker creates database sessions | declarative_base is the foundation for all models
from sqlalchemy.orm import sessionmaker, declarative_base

# reads our .env file so we can access secret variables like DATABASE_URL
from dotenv import load_dotenv

# lets us read environment variables
import os

# loads the .env file into the environment
load_dotenv()

# the connection string — tells SQLAlchemy where PostgreSQL is
# falls back to local pitchiq database if no .env variable found
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/pitchiq")

# creates the actual connection to PostgreSQL
engine = create_engine(DATABASE_URL)

# factory that creates sessions — each request gets its own session
# autocommit/autoflush=False means we control when changes are saved
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# foundation that all models (Match, Player, etc.) inherit from
Base = declarative_base()

# dependency function — FastAPI calls this for every endpoint that needs the database
# opens a session, gives it to the endpoint, always closes it when done
def get_db():
    db = SessionLocal()  # open session
    try:
        yield db          # give session to the endpoint
    finally:
        db.close()        # always close — even on error