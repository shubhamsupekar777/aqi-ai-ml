import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class PredictionRecord(Base):
    __tablename__ = "prediction_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    city_id = Column(String(36), ForeignKey("cities.id"), nullable=False, index=True)
    
    reference_aqi = Column(Float, nullable=True)
    predicted_aqi = Column(Float, nullable=False)
    prediction_horizon = Column(String(50), nullable=False) # next_day, next_3_days, next_7_days
    prediction_type = Column(String(50), default="demo")
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    city = relationship("City", back_populates="predictions")
