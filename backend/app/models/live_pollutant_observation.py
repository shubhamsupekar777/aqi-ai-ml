"""Raw pollutant observations ingested from data.gov.in / CPCB."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Index
from backend.app.core.database import Base


class LivePollutantObservation(Base):
    __tablename__ = "live_pollutant_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Stable hash of country/city/station/pollutant/source timestamp prevents duplicates.
    record_key = Column(String(64), nullable=False, unique=True, index=True)

    country = Column(String(80), nullable=False, default="India")
    state = Column(String(120), nullable=True)
    city = Column(String(120), nullable=False, index=True)
    station = Column(String(300), nullable=False)
    last_update = Column(String(40), nullable=False)  # preserve source timestamp verbatim
    observed_at = Column(DateTime, nullable=True, index=True)  # parsed timestamp, timezone unspecified by source

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    pollutant_id = Column(String(40), nullable=False, index=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    avg_value = Column(Float, nullable=True)

    source = Column(String(100), nullable=False, default="data.gov.in / CPCB")
    fetched_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_live_city_pollutant_observed", "city", "pollutant_id", "observed_at"),
    )
