"""Latest pollutant measurements imported from OpenAQ API v3."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Index, Integer, String

from backend.app.core.database import Base


class OpenAQMeasurementObservation(Base):
    __tablename__ = "openaq_measurement_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_key = Column(String(64), nullable=False, unique=True, index=True)

    country = Column(String(80), nullable=False, default="India")
    state = Column(String(120), nullable=True, index=True)
    city = Column(String(120), nullable=False, index=True)
    station = Column(String(300), nullable=False)
    # OpenAQ sensor ID is the stable measurement source identifier.
    station_id = Column(String(80), nullable=False, index=True)

    # last_update preserves the source's local or UTC timestamp string. observed_at
    # is stored as a naive India Standard Time datetime for consistent display.
    last_update = Column(String(50), nullable=False)
    observed_at = Column(DateTime, nullable=True, index=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    pollutant_id = Column(String(40), nullable=False, index=True)
    unit = Column(String(40), nullable=True)

    value = Column(Float, nullable=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    avg_value = Column(Float, nullable=True)
    sample_count = Column(Integer, nullable=True)
    aggregation = Column(String(20), nullable=False, default="latest")

    source = Column(String(120), nullable=False, default="OpenAQ API v3")
    fetched_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index(
            "idx_openaq_city_pollutant_observed",
            "city",
            "pollutant_id",
            "observed_at",
        ),
    )
