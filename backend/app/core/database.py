import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings
from backend.app.core.logging import logger

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        # Test if PostgreSQL or primary connection works
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3} if "postgresql" in db_url else {}
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to primary database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        return engine
    except Exception as e:
        logger.warning(
            f"Primary database connection failed ({e}). Falling back to local development SQLite database."
        )
        fallback_url = settings.SQLITE_FALLBACK_URL
        fallback_engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False}
        )
        return fallback_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
