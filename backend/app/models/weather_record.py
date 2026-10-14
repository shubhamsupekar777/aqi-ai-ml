import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    city_id = Column(String(36), ForeignKey("cities.id"), nullable=False, index=True)
    observation_date = Column(String(10), nullable=False, index=True)
    
    temperature = Column(Float, nullable=True) # Celsius
    relative_humidity = Column(Float, nullable=True) # %
    wind_speed = Column(Float, nullable=True) # km/h
    wind_direction = Column(Float, nullable=True) # degrees
    precipitation = Column(Float, nullable=True) # mm
    surface_pressure = Column(Float, nullable=True) # hPa
    data_source = Column(String(100), default="IMD Weather Grid")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    city = relationship("City", back_populates="weather_records")

    __table_args__ = (
        UniqueConstraint("city_id", "observation_date", name="uq_weather_city_date"),
    )
