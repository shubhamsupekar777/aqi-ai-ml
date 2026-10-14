import math
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from backend.app.schemas.history import HistoricalFilterParams, PaginatedHistoryResponse, HistoricalRecordSchema
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.repositories.aqi_repository import AQIRepository
from backend.app.services.standards import get_epa_category

DEMO_HISTORY_RECORDS = [
    {"id": "h-1", "city": "Delhi", "date": "2026-10-12", "aqi": 185.0, "category": "Unhealthy", "originalCategory": "Poor", "pm25": 114.5, "pm10": 212.8, "no2": 44.5, "so2": 18.2, "co": 1.4, "o3": 42.0, "temperature": 27.5, "humidity": 55.0, "windSpeed": 7.2, "dataSource": "CPCB Station Network"},
    {"id": "h-2", "city": "Delhi", "date": "2026-10-11", "aqi": 172.0, "category": "Unhealthy", "originalCategory": "Poor", "pm25": 106.2, "pm10": 198.4, "no2": 42.1, "so2": 16.8, "co": 1.3, "o3": 40.5, "temperature": 28.1, "humidity": 53.0, "windSpeed": 8.5, "dataSource": "CPCB Station Network"},
    {"id": "h-3", "city": "Delhi", "date": "2026-10-10", "aqi": 164.0, "category": "Unhealthy", "originalCategory": "Moderate", "pm25": 98.4, "pm10": 184.2, "no2": 39.8, "so2": 15.4, "co": 1.2, "o3": 38.0, "temperature": 29.0, "humidity": 50.0, "windSpeed": 9.1, "dataSource": "CPCB Station Network"},
    {"id": "h-4", "city": "Delhi", "date": "2026-10-09", "aqi": 195.0, "category": "Unhealthy", "originalCategory": "Poor", "pm25": 122.0, "pm10": 226.5, "no2": 48.2, "so2": 19.5, "co": 1.5, "o3": 45.2, "temperature": 26.8, "humidity": 58.0, "windSpeed": 6.2, "dataSource": "CPCB Station Network"},
    {"id": "h-5", "city": "Delhi", "date": "2026-10-08", "aqi": 215.0, "category": "Very Unhealthy", "originalCategory": "Poor", "pm25": 138.2, "pm10": 248.0, "no2": 52.4, "so2": 21.0, "co": 1.7, "o3": 48.0, "temperature": 25.9, "humidity": 62.0, "windSpeed": 5.5, "dataSource": "CPCB Station Network"},
    {"id": "h-6", "city": "Mumbai", "date": "2026-10-12", "aqi": 92.0, "category": "Moderate", "originalCategory": "Satisfactory", "pm25": 38.5, "pm10": 95.2, "no2": 28.4, "so2": 11.2, "co": 0.8, "o3": 32.5, "temperature": 31.2, "humidity": 76.0, "windSpeed": 14.8, "dataSource": "MPCB Telemetry"},
    {"id": "h-7", "city": "Mumbai", "date": "2026-10-11", "aqi": 88.0, "category": "Moderate", "originalCategory": "Satisfactory", "pm25": 35.8, "pm10": 89.4, "no2": 26.8, "so2": 10.5, "co": 0.8, "o3": 30.1, "temperature": 31.5, "humidity": 78.0, "windSpeed": 15.2, "dataSource": "MPCB Telemetry"},
    {"id": "h-8", "city": "Mumbai", "date": "2026-10-10", "aqi": 95.0, "category": "Moderate", "originalCategory": "Satisfactory", "pm25": 41.2, "pm10": 98.7, "no2": 29.5, "so2": 11.8, "co": 0.9, "o3": 34.0, "temperature": 30.8, "humidity": 74.0, "windSpeed": 13.9, "dataSource": "MPCB Telemetry"},
    {"id": "h-9", "city": "Pune", "date": "2026-10-12", "aqi": 78.0, "category": "Moderate", "originalCategory": "Satisfactory", "pm25": 29.5, "pm10": 74.2, "no2": 22.1, "so2": 9.4, "co": 0.7, "o3": 36.2, "temperature": 28.6, "humidity": 64.0, "windSpeed": 11.2, "dataSource": "MPCB Telemetry"},
    {"id": "h-10", "city": "Bengaluru", "date": "2026-10-12", "aqi": 48.0, "category": "Good", "originalCategory": "Good", "pm25": 16.2, "pm10": 44.5, "no2": 18.4, "so2": 6.8, "co": 0.5, "o3": 24.5, "temperature": 26.4, "humidity": 62.0, "windSpeed": 12.8, "dataSource": "KSPCB Ambient Air"},
    {"id": "h-11", "city": "Chennai", "date": "2026-10-12", "aqi": 65.0, "category": "Moderate", "originalCategory": "Satisfactory", "pm25": 24.2, "pm10": 62.4, "no2": 21.0, "so2": 14.5, "co": 0.6, "o3": 28.0, "temperature": 32.1, "humidity": 82.0, "windSpeed": 16.4, "dataSource": "TNPCB Telemetry"},
    {"id": "h-12", "city": "Hyderabad", "date": "2026-10-12", "aqi": 115.0, "category": "Unhealthy for Sensitive Groups", "originalCategory": "Moderate", "pm25": 58.4, "pm10": 118.2, "no2": 32.5, "so2": 12.4, "co": 1.0, "o3": 39.5, "temperature": 29.8, "humidity": 59.0, "windSpeed": 9.8, "dataSource": "TSPCB Lab"}
]

class HistoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AQIRepository(db)

    def get_historical_records(self, params: HistoricalFilterParams) -> PaginatedHistoryResponse:
        now = datetime.utcnow().isoformat()
        
        # Check if database has any records
        db_records, total_db = self.repo.get_history(
            city_name=params.city,
            start_date=params.start_date,
            end_date=params.end_date,
            min_aqi=params.min_aqi,
            max_aqi=params.max_aqi,
            search=params.search,
            page=params.page,
            page_size=params.page_size
        )

        if total_db > 0:
            items = []
            for r in db_records:
                cat_name, _, _, _ = get_epa_category(r.aqi)
                p = r.pollutants
                items.append(HistoricalRecordSchema(
                    id=r.id,
                    city=r.city.name if r.city else "Unknown",
                    date=r.observation_date,
                    aqi=r.aqi,
                    category=cat_name,
                    originalCategory=r.original_category,
                    pm25=p.pm25 if p else None,
                    pm10=p.pm10 if p else None,
                    no2=p.no2 if p else None,
                    so2=p.so2 if p else None,
                    co=p.co if p else None,
                    o3=p.o3 if p else None,
                    dataSource=r.data_source
                ))
            total_pages = max(1, math.ceil(total_db / params.page_size))
            return PaginatedHistoryResponse(
                items=items,
                total=total_db,
                page=params.page,
                pageSize=params.page_size,
                totalPages=total_pages,
                metadata=ApiResponseMetadata(
                    data_source="database",
                    model_status="not_trained",
                    is_demo=False,
                    timestamp=now
                )
            )

        # Fallback to centralized demo fixtures
        filtered = list(DEMO_HISTORY_RECORDS)
        if params.city and params.city != "All Cities":
            filtered = [r for r in filtered if r["city"].lower() == params.city.lower()]

        if params.search:
            s = params.search.lower()
            filtered = [r for r in filtered if s in r["city"].lower() or s in r["date"] or s in r["category"].lower()]

        if params.min_aqi is not None:
            filtered = [r for r in filtered if r["aqi"] >= params.min_aqi]

        if params.max_aqi is not None:
            filtered = [r for r in filtered if r["aqi"] <= params.max_aqi]

        total = len(filtered)
        start_idx = (params.page - 1) * params.page_size
        page_items = filtered[start_idx:start_idx + params.page_size]

        items = [HistoricalRecordSchema(**r) for r in page_items]
        total_pages = max(1, math.ceil(total / params.page_size))

        return PaginatedHistoryResponse(
            items=items,
            total=total,
            page=params.page,
            pageSize=params.page_size,
            totalPages=total_pages,
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                is_demo=True,
                timestamp=now
            )
        )
