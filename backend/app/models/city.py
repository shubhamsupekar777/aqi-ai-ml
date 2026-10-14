import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class City(Base):
    __tablename__ = "cities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True, index=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    historical_records = relationship("HistoricalAQI", back_populates="city", cascade="all, delete-orphan")
    weather_records = relationship("WeatherRecord", back_populates="city", cascade="all, delete-orphan")
    predictions = relationship("PredictionRecord", back_populates="city", cascade="all, delete-orphan")
