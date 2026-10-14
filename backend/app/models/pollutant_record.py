import uuid
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class PollutantRecord(Base):
    __tablename__ = "pollutant_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    historical_aqi_id = Column(String(36), ForeignKey("historical_aqi.id"), nullable=False, unique=True, index=True)
    
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    no = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    nox = Column(Float, nullable=True)
    nh3 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    benzene = Column(Float, nullable=True)
    toluene = Column(Float, nullable=True)
    xylene = Column(Float, nullable=True)

    # Relationships
    historical_record = relationship("HistoricalAQI", back_populates="pollutants")
