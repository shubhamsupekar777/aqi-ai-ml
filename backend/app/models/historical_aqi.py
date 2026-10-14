import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class HistoricalAQI(Base):
    __tablename__ = "historical_aqi"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    city_id = Column(String(36), ForeignKey("cities.id"), nullable=False, index=True)
    observation_date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    aqi = Column(Float, nullable=False, index=True)
    original_category = Column(String(50), nullable=True) # e.g. CPCB AQI_Bucket
    data_source = Column(String(100), default="CPCB Station Network")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    city = relationship("City", back_populates="historical_records")
    pollutants = relationship("PollutantRecord", back_populates="historical_record", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("city_id", "observation_date", name="uq_city_date"),
        Index("idx_city_obs_date", "city_id", "observation_date"),
    )
