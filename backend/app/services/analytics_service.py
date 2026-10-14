from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.schemas.analytics import (
    AnalyticsResponse,
    SummaryStats,
    SeasonalPattern,
    DiurnalPoint,
    CorrelationCell,
    CitySummary
)
from backend.app.schemas.common import ApiResponseMetadata

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_analytics(self, city: Optional[str] = None) -> AnalyticsResponse:
        now = datetime.utcnow().isoformat()

        return AnalyticsResponse(
            summary=SummaryStats(
                meanAqi=112.4,
                medianAqi=96.0,
                minAqi=24.0,
                maxAqi=388.0,
                stdAqi=54.8,
                totalRecords=1420,
                cleanAirDays=312,
                hazardDays=28
            ),
            seasonalPatterns=[
                SeasonalPattern(season="Winter (Nov - Feb)", averageAqi=198.5, avgPm25=122.4, avgTemp=14.8, dominantPollutant="PM2.5"),
                SeasonalPattern(season="Pre-Monsoon (Mar - May)", averageAqi=124.2, avgPm25=78.1, avgTemp=32.5, dominantPollutant="PM10"),
                SeasonalPattern(season="Monsoon (Jun - Sep)", averageAqi=52.8, avgPm25=28.6, avgTemp=28.2, dominantPollutant="NO2"),
                SeasonalPattern(season="Post-Monsoon (Oct)", averageAqi=164.7, avgPm25=104.3, avgTemp=24.1, dominantPollutant="PM2.5"),
            ],
            diurnalProfile=[
                DiurnalPoint(hour="00:00", delhi=195.0, mumbai=96.0, bengaluru=45.0, pune=82.0),
                DiurnalPoint(hour="03:00", delhi=215.0, mumbai=102.0, bengaluru=42.0, pune=88.0),
                DiurnalPoint(hour="06:00", delhi=240.0, mumbai=118.0, bengaluru=58.0, pune=98.0),
                DiurnalPoint(hour="09:00", delhi=210.0, mumbai=105.0, bengaluru=62.0, pune=90.0),
                DiurnalPoint(hour="12:00", delhi=155.0, mumbai=84.0, bengaluru=46.0, pune=68.0),
                DiurnalPoint(hour="15:00", delhi=142.0, mumbai=76.0, bengaluru=40.0, pune=62.0),
                DiurnalPoint(hour="18:00", delhi=180.0, mumbai=95.0, bengaluru=54.0, pune=80.0),
                DiurnalPoint(hour="21:00", delhi=220.0, mumbai=108.0, bengaluru=50.0, pune=92.0),
            ],
            correlationMatrix=[
                CorrelationCell(x="PM2.5", y="PM2.5", value=1.0),
                CorrelationCell(x="PM2.5", y="PM10", value=0.88),
                CorrelationCell(x="PM2.5", y="NO2", value=0.65),
                CorrelationCell(x="PM2.5", y="SO2", value=0.42),
                CorrelationCell(x="PM2.5", y="Temp", value=-0.58),
                CorrelationCell(x="PM2.5", y="Wind", value=-0.72),

                CorrelationCell(x="PM10", y="PM2.5", value=0.88),
                CorrelationCell(x="PM10", y="PM10", value=1.0),
                CorrelationCell(x="PM10", y="NO2", value=0.62),
                CorrelationCell(x="PM10", y="SO2", value=0.39),
                CorrelationCell(x="PM10", y="Temp", value=-0.45),
                CorrelationCell(x="PM10", y="Wind", value=-0.68),

                CorrelationCell(x="NO2", y="PM2.5", value=0.65),
                CorrelationCell(x="NO2", y="PM10", value=0.62),
                CorrelationCell(x="NO2", y="NO2", value=1.0),
                CorrelationCell(x="NO2", y="SO2", value=0.51),
                CorrelationCell(x="NO2", y="Temp", value=-0.32),
                CorrelationCell(x="NO2", y="Wind", value=-0.49),

                CorrelationCell(x="SO2", y="PM2.5", value=0.42),
                CorrelationCell(x="SO2", y="PM10", value=0.39),
                CorrelationCell(x="SO2", y="NO2", value=0.51),
                CorrelationCell(x="SO2", y="SO2", value=1.0),
                CorrelationCell(x="SO2", y="Temp", value=-0.18),
                CorrelationCell(x="SO2", y="Wind", value=-0.35),

                CorrelationCell(x="Temp", y="PM2.5", value=-0.58),
                CorrelationCell(x="Temp", y="PM10", value=-0.45),
                CorrelationCell(x="Temp", y="NO2", value=-0.32),
                CorrelationCell(x="Temp", y="SO2", value=-0.18),
                CorrelationCell(x="Temp", y="Temp", value=1.0),
                CorrelationCell(x="Temp", y="Wind", value=0.41),

                CorrelationCell(x="Wind", y="PM2.5", value=-0.72),
                CorrelationCell(x="Wind", y="PM10", value=-0.68),
                CorrelationCell(x="Wind", y="NO2", value=-0.49),
                CorrelationCell(x="Wind", y="SO2", value=-0.35),
                CorrelationCell(x="Wind", y="Temp", value=0.41),
                CorrelationCell(x="Wind", y="Wind", value=1.0),
            ],
            citySummaries=[
                CitySummary(city="Delhi", avgAqi=218.4, maxAqi=388.0, minAqi=75.0, dominantPollutant="PM2.5", status="High Pollution Zone"),
                CitySummary(city="Hyderabad", avgAqi=118.2, maxAqi=195.0, minAqi=48.0, dominantPollutant="PM2.5", status="Moderate Exposure"),
                CitySummary(city="Mumbai", avgAqi=96.5, maxAqi=172.0, minAqi=38.0, dominantPollutant="PM10", status="Coastal Dispersion"),
                CitySummary(city="Pune", avgAqi=82.1, maxAqi=145.0, minAqi=32.0, dominantPollutant="O3", status="Moderate Stability"),
                CitySummary(city="Chennai", avgAqi=68.4, maxAqi=122.0, minAqi=28.0, dominantPollutant="SO2", status="Maritime Regulated"),
                CitySummary(city="Bengaluru", avgAqi=51.3, maxAqi=94.0, minAqi=24.0, dominantPollutant="NO2", status="Clean Ambient Air"),
            ],
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now
            )
        )
