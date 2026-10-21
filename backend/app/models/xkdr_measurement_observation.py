"""Measurements imported from the XKDR Forum India Air Quality Database.

This table is separate from the earlier data.gov.in table so existing records
and database schemas are not destructively changed during this integration.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Index, Integer, String

from backend.app.core.database import Base


class XKDRMeasurementObservation(Base):
    __tablename__ = "xkdr_measurement_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_key = Column(String(64), nullable=False, unique=True, index=True)

    country = Column(String(80), nullable=False, default="India")
    state = Column(String(120), nullable=True, index=True)
    city = Column(String(120), nullable=False, index=True)
    station = Column(String(300), nullable=False)
    station_id = Column(String(80), nullable=False, index=True)

    # Preserve the exact provider timestamp and its parsed naive IST value.
    last_update = Column(String(40), nullable=False)
    observed_at = Column(DateTime, nullable=True, index=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    pollutant_id = Column(String(40), nullable=False, index=True)
    unit = Column(String(40), nullable=True)

    # Raw hourly rows use `value`. Aggregated rows use avg_value/min/max/count.
    value = Column(Float, nullable=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    avg_value = Column(Float, nullable=True)
    sample_count = Column(Integer, nullable=True)
    aggregation = Column(String(20), nullable=False, default="raw")

    source = Column(String(120), nullable=False, default="XKDR Forum / India Air Quality Database")
    fetched_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index(
            "idx_xkdr_city_pollutant_observed",
            "city",
            "pollutant_id",
            "observed_at",
        ),
    )
