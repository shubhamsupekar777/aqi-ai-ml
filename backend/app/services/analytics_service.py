
from datetime import datetime
from typing import Optional

import pandas as pd
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.weather_record import WeatherRecord

from backend.app.schemas.analytics import (
    AnalyticsResponse,
    SummaryStats,
    SeasonalPattern,
    CorrelationCell,
    CitySummary,
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_cpcb_category


SEASON_ORDER = [
    "Winter (Nov - Feb)",
    "Pre-Monsoon (Mar - May)",
    "Monsoon (Jun - Sep)",
    "Post-Monsoon (Oct)",
]

CORRELATION_COLUMNS = [
    ("PM2.5", "pm25"),
    ("PM10", "pm10"),
    ("NO2", "no2"),
    ("SO2", "so2"),
    ("Temp", "temperature"),
    ("Wind", "wind_speed"),
]

POLLUTANT_COLUMNS = [
    "pm25", "pm10", "no2", "so2", "co", "o3"
]


def _number(value, default=0.0):
    if value is None or pd.isna(value):
        return default
    return float(value)


def _season_for_month(month: int) -> str:
    if month in (11, 12, 1, 2):
        return "Winter (Nov - Feb)"
    if month in (3, 4, 5):
        return "Pre-Monsoon (Mar - May)"
    if month in (6, 7, 8, 9):
        return "Monsoon (Jun - Sep)"
    return "Post-Monsoon (Oct)"


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_analytics(
        self,
        city: Optional[str] = None,
    ) -> AnalyticsResponse:
        now = datetime.utcnow().isoformat()

        query = (
            self.db.query(
                HistoricalAQI,
                City,
                PollutantRecord,
                WeatherRecord,
            )
            .join(City, HistoricalAQI.city_id == City.id)
            .outerjoin(
                PollutantRecord,
                PollutantRecord.historical_aqi_id == HistoricalAQI.id,
            )
            .outerjoin(
                WeatherRecord,
                and_(
                    WeatherRecord.city_id == HistoricalAQI.city_id,
                    WeatherRecord.observation_date
                    == HistoricalAQI.observation_date,
                ),
            )
        )

        if city and city.strip() and city.lower() != "all cities":
            query = query.filter(City.name.ilike(city.strip()))

        rows = query.all()

        columns = [
            "city", "date", "aqi", "pm25", "pm10", "no2",
            "so2", "co", "o3", "temperature", "wind_speed",
        ]

        records = []
        for historical, city_obj, pollutant, weather in rows:
            records.append({
                "city": city_obj.name,
                "date": historical.observation_date,
                "aqi": float(historical.aqi),
                "pm25": pollutant.pm25 if pollutant else None,
                "pm10": pollutant.pm10 if pollutant else None,
                "no2": pollutant.no2 if pollutant else None,
                "so2": pollutant.so2 if pollutant else None,
                "co": pollutant.co if pollutant else None,
                "o3": pollutant.o3 if pollutant else None,
                "temperature": weather.temperature if weather else None,
                "wind_speed": weather.wind_speed if weather else None,
            })

        df = pd.DataFrame(records, columns=columns)

        # Empty database or a city without observations.
        if df.empty:
            summary = SummaryStats(
                meanAqi=0.0,
                medianAqi=0.0,
                minAqi=0.0,
                maxAqi=0.0,
                stdAqi=0.0,
                totalRecords=0,
                cleanAirDays=0,
                hazardDays=0,
            )
            seasonal_patterns = [
                SeasonalPattern(
                    season=season,
                    averageAqi=0.0,
                    avgPm25=0.0,
                    avgTemp=0.0,
                    dominantPollutant="Not available",
                )
                for season in SEASON_ORDER
            ]
            correlation_matrix = [
                CorrelationCell(
                    x=x_label,
                    y=y_label,
                    value=1.0 if x_label == y_label else 0.0,
                )
                for x_label, _ in CORRELATION_COLUMNS
                for y_label, _ in CORRELATION_COLUMNS
            ]

            return AnalyticsResponse(
                summary=summary,
                seasonalPatterns=seasonal_patterns,
                diurnalProfile=[],
                correlationMatrix=correlation_matrix,
                citySummaries=[],
                metadata=ApiResponseMetadata(
                    data_source="database",
                    model_status="not_trained",
                    model_name=None,
                    prediction_type="historical_analytics",
                    is_demo=False,
                    timestamp=now,
                ),
            )

        # Basic descriptive statistics over stored city-date observations.
        aqi = pd.to_numeric(df["aqi"], errors="coerce").dropna()

        summary = SummaryStats(
            meanAqi=round(float(aqi.mean()), 2),
            medianAqi=round(float(aqi.median()), 2),
            minAqi=round(float(aqi.min()), 2),
            maxAqi=round(float(aqi.max()), 2),
            stdAqi=round(float(aqi.std(ddof=0)), 2),
            totalRecords=int(aqi.count()),
            # These fields count observations, not unique calendar days.
            cleanAirDays=int((aqi <= 50).sum()),
            hazardDays=int((aqi > 400).sum()),
        )

        # Compute seasonal summaries from the observation date.
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["month"] = df["date"].dt.month
        df["season"] = df["month"].apply(
            lambda value: _season_for_month(int(value))
            if pd.notna(value) else None
        )

        seasonal_patterns = []
        for season in SEASON_ORDER:
            group = df[df["season"] == season]

            seasonal_patterns.append(
                SeasonalPattern(
                    season=season,
                    averageAqi=round(_number(group["aqi"].mean()), 2),
                    avgPm25=round(_number(group["pm25"].mean()), 2),
                    avgTemp=round(_number(group["temperature"].mean()), 2),
                    # No pollutant-specific AQI sub-index is stored, so do not
                    # claim a scientifically determined dominant pollutant.
                    dominantPollutant=(
                        "Not computed from available sub-index data"
                        if not group.empty else "Not available"
                    ),
                )
            )

        # Correlations use the actual joined pollutant/weather observations.
        correlation_source = {
            label: pd.to_numeric(df[column], errors="coerce")
            for label, column in CORRELATION_COLUMNS
        }
        corr_df = pd.DataFrame(correlation_source)
        corr = corr_df.corr(method="pearson").fillna(0.0)

        correlation_matrix = []
        for x_label, _ in CORRELATION_COLUMNS:
            for y_label, _ in CORRELATION_COLUMNS:
                value = (
                    1.0 if x_label == y_label
                    else float(corr.loc[x_label, y_label])
                )
                correlation_matrix.append(
                    CorrelationCell(
                        x=x_label,
                        y=y_label,
                        value=round(value, 4),
                    )
                )

        # City-level summary statistics for cities in the selected dataset.
        city_summaries = []
        for city_name, group in df.groupby("city"):
            city_aqi = pd.to_numeric(group["aqi"], errors="coerce").dropna()
            if city_aqi.empty:
                continue

            avg_aqi = float(city_aqi.mean())
            category = get_cpcb_category(avg_aqi)[0]

            city_summaries.append(
                CitySummary(
                    city=str(city_name),
                    avgAqi=round(avg_aqi, 2),
                    maxAqi=round(float(city_aqi.max()), 2),
                    minAqi=round(float(city_aqi.min()), 2),
                    dominantPollutant="Not computed from available sub-index data",
                    status=category,
                )
            )

        city_summaries.sort(
            key=lambda item: item.avgAqi,
            reverse=True,
        )

        return AnalyticsResponse(
            summary=summary,
            seasonalPatterns=seasonal_patterns,
            # The source dataset contains daily, not hourly, measurements.
            diurnalProfile=[],
            correlationMatrix=correlation_matrix,
            citySummaries=city_summaries,
            metadata=ApiResponseMetadata(
                data_source="database",
                model_status="not_trained",
                model_name=None,
                prediction_type="historical_analytics",
                is_demo=False,
                timestamp=now,
            ),
        )


# from datetime import datetime
# from typing import Optional
# from sqlalchemy.orm import Session

# from backend.app.schemas.analytics import (
#     AnalyticsResponse,
#     SummaryStats,
#     SeasonalPattern,
#     DiurnalPoint,
#     CorrelationCell,
#     CitySummary
# )
# from backend.app.schemas.common import ApiResponseMetadata

# class AnalyticsService:
#     def __init__(self, db: Session):
#         self.db = db

#     def get_analytics(self, city: Optional[str] = None) -> AnalyticsResponse:
#         now = datetime.utcnow().isoformat()

#         return AnalyticsResponse(
#             summary=SummaryStats(
#                 meanAqi=112.4,
#                 medianAqi=96.0,
#                 minAqi=24.0,
#                 maxAqi=388.0,
#                 stdAqi=54.8,
#                 totalRecords=1420,
#                 cleanAirDays=312,
#                 hazardDays=28
#             ),
#             seasonalPatterns=[
#                 SeasonalPattern(season="Winter (Nov - Feb)", averageAqi=198.5, avgPm25=122.4, avgTemp=14.8, dominantPollutant="PM2.5"),
#                 SeasonalPattern(season="Pre-Monsoon (Mar - May)", averageAqi=124.2, avgPm25=78.1, avgTemp=32.5, dominantPollutant="PM10"),
#                 SeasonalPattern(season="Monsoon (Jun - Sep)", averageAqi=52.8, avgPm25=28.6, avgTemp=28.2, dominantPollutant="NO2"),
#                 SeasonalPattern(season="Post-Monsoon (Oct)", averageAqi=164.7, avgPm25=104.3, avgTemp=24.1, dominantPollutant="PM2.5"),
#             ],
#             diurnalProfile=[
#                 DiurnalPoint(hour="00:00", delhi=195.0, mumbai=96.0, bengaluru=45.0, pune=82.0),
#                 DiurnalPoint(hour="03:00", delhi=215.0, mumbai=102.0, bengaluru=42.0, pune=88.0),
#                 DiurnalPoint(hour="06:00", delhi=240.0, mumbai=118.0, bengaluru=58.0, pune=98.0),
#                 DiurnalPoint(hour="09:00", delhi=210.0, mumbai=105.0, bengaluru=62.0, pune=90.0),
#                 DiurnalPoint(hour="12:00", delhi=155.0, mumbai=84.0, bengaluru=46.0, pune=68.0),
#                 DiurnalPoint(hour="15:00", delhi=142.0, mumbai=76.0, bengaluru=40.0, pune=62.0),
#                 DiurnalPoint(hour="18:00", delhi=180.0, mumbai=95.0, bengaluru=54.0, pune=80.0),
#                 DiurnalPoint(hour="21:00", delhi=220.0, mumbai=108.0, bengaluru=50.0, pune=92.0),
#             ],
#             correlationMatrix=[
#                 CorrelationCell(x="PM2.5", y="PM2.5", value=1.0),
#                 CorrelationCell(x="PM2.5", y="PM10", value=0.88),
#                 CorrelationCell(x="PM2.5", y="NO2", value=0.65),
#                 CorrelationCell(x="PM2.5", y="SO2", value=0.42),
#                 CorrelationCell(x="PM2.5", y="Temp", value=-0.58),
#                 CorrelationCell(x="PM2.5", y="Wind", value=-0.72),

#                 CorrelationCell(x="PM10", y="PM2.5", value=0.88),
#                 CorrelationCell(x="PM10", y="PM10", value=1.0),
#                 CorrelationCell(x="PM10", y="NO2", value=0.62),
#                 CorrelationCell(x="PM10", y="SO2", value=0.39),
#                 CorrelationCell(x="PM10", y="Temp", value=-0.45),
#                 CorrelationCell(x="PM10", y="Wind", value=-0.68),

#                 CorrelationCell(x="NO2", y="PM2.5", value=0.65),
#                 CorrelationCell(x="NO2", y="PM10", value=0.62),
#                 CorrelationCell(x="NO2", y="NO2", value=1.0),
#                 CorrelationCell(x="NO2", y="SO2", value=0.51),
#                 CorrelationCell(x="NO2", y="Temp", value=-0.32),
#                 CorrelationCell(x="NO2", y="Wind", value=-0.49),

#                 CorrelationCell(x="SO2", y="PM2.5", value=0.42),
#                 CorrelationCell(x="SO2", y="PM10", value=0.39),
#                 CorrelationCell(x="SO2", y="NO2", value=0.51),
#                 CorrelationCell(x="SO2", y="SO2", value=1.0),
#                 CorrelationCell(x="SO2", y="Temp", value=-0.18),
#                 CorrelationCell(x="SO2", y="Wind", value=-0.35),

#                 CorrelationCell(x="Temp", y="PM2.5", value=-0.58),
#                 CorrelationCell(x="Temp", y="PM10", value=-0.45),
#                 CorrelationCell(x="Temp", y="NO2", value=-0.32),
#                 CorrelationCell(x="Temp", y="SO2", value=-0.18),
#                 CorrelationCell(x="Temp", y="Temp", value=1.0),
#                 CorrelationCell(x="Temp", y="Wind", value=0.41),

#                 CorrelationCell(x="Wind", y="PM2.5", value=-0.72),
#                 CorrelationCell(x="Wind", y="PM10", value=-0.68),
#                 CorrelationCell(x="Wind", y="NO2", value=-0.49),
#                 CorrelationCell(x="Wind", y="SO2", value=-0.35),
#                 CorrelationCell(x="Wind", y="Temp", value=0.41),
#                 CorrelationCell(x="Wind", y="Wind", value=1.0),
#             ],
#             citySummaries=[
#                 CitySummary(city="Delhi", avgAqi=218.4, maxAqi=388.0, minAqi=75.0, dominantPollutant="PM2.5", status="High Pollution Zone"),
#                 CitySummary(city="Hyderabad", avgAqi=118.2, maxAqi=195.0, minAqi=48.0, dominantPollutant="PM2.5", status="Moderate Exposure"),
#                 CitySummary(city="Mumbai", avgAqi=96.5, maxAqi=172.0, minAqi=38.0, dominantPollutant="PM10", status="Coastal Dispersion"),
#                 CitySummary(city="Pune", avgAqi=82.1, maxAqi=145.0, minAqi=32.0, dominantPollutant="O3", status="Moderate Stability"),
#                 CitySummary(city="Chennai", avgAqi=68.4, maxAqi=122.0, minAqi=28.0, dominantPollutant="SO2", status="Maritime Regulated"),
#                 CitySummary(city="Bengaluru", avgAqi=51.3, maxAqi=94.0, minAqi=24.0, dominantPollutant="NO2", status="Clean Ambient Air"),
#             ],
#             metadata=ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now
#             )
#         )
