from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.city import City

class AQIRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_by_city(self, city_name: str) -> Optional[HistoricalAQI]:
        return (
            self.db.query(HistoricalAQI)
            .join(City, HistoricalAQI.city_id == City.id)
            .filter(City.name.ilike(city_name.strip()))
            .order_by(desc(HistoricalAQI.observation_date))
            .first()
        )

    def get_history(
        self,
        city_name: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_aqi: Optional[float] = None,
        max_aqi: Optional[float] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[HistoricalAQI], int]:
        query = self.db.query(HistoricalAQI).join(City, HistoricalAQI.city_id == City.id)

        if city_name and city_name != "All Cities":
            query = query.filter(City.name.ilike(city_name.strip()))

        if start_date:
            query = query.filter(HistoricalAQI.observation_date >= start_date)

        if end_date:
            query = query.filter(HistoricalAQI.observation_date <= end_date)

        if min_aqi is not None:
            query = query.filter(HistoricalAQI.aqi >= min_aqi)

        if max_aqi is not None:
            query = query.filter(HistoricalAQI.aqi <= max_aqi)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (City.name.ilike(s)) |
                (HistoricalAQI.observation_date.ilike(s)) |
                (HistoricalAQI.original_category.ilike(s))
            )

        total = query.count()
        records = (
            query.order_by(desc(HistoricalAQI.observation_date))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return records, total
