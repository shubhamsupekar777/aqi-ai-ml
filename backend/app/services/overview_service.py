


from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from sqlalchemy import and_, func, desc
from sqlalchemy.orm import Session

from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.weather_record import WeatherRecord
from backend.app.models.prediction_record import PredictionRecord

from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import (
    get_cpcb_category,
    determine_trend,
    get_risk_assessment,
)


def _round_or_none(value, digits=1):
    return round(float(value), digits) if value is not None else None


def _category(record: HistoricalAQI) -> str:
    # Prefer the original CPCB category imported from the dataset.
    return record.original_category or get_cpcb_category(record.aqi)[0]


class OverviewService:
    def __init__(self, db: Session):
        self.db = db

    def _latest_record_per_city(self):
        latest_dates = (
            self.db.query(
                HistoricalAQI.city_id.label("city_id"),
                func.max(HistoricalAQI.observation_date).label("latest_date"),
            )
            .group_by(HistoricalAQI.city_id)
            .subquery()
        )

        return (
            self.db.query(HistoricalAQI, City, PollutantRecord)
            .join(City, HistoricalAQI.city_id == City.id)
            .join(
                latest_dates,
                and_(
                    HistoricalAQI.city_id == latest_dates.c.city_id,
                    HistoricalAQI.observation_date == latest_dates.c.latest_date,
                ),
            )
            .outerjoin(
                PollutantRecord,
                PollutantRecord.historical_aqi_id == HistoricalAQI.id,
            )
            .all()
        )

    def _prediction_dict(self, prediction, city_name):
        category = get_cpcb_category(prediction.predicted_aqi)[0]
        risk = get_risk_assessment(prediction.predicted_aqi)[0]

        if prediction.reference_aqi is not None:
            trend = determine_trend(
                prediction.reference_aqi,
                prediction.predicted_aqi,
            )[0]
        else:
            trend = "Unavailable"

        return {
            "id": prediction.id,
            "city": city_name,
            "timestamp": (
                prediction.created_at.isoformat()
                if prediction.created_at
                else None
            ),
            "referenceAqi": prediction.reference_aqi,
            "predictedAqi": prediction.predicted_aqi,
            "horizon": prediction.prediction_horizon,
            "category": category,
            "trend": trend,
            "risk": risk,
            "isDemo": bool(prediction.is_demo),
        }

    def get_overview(self, city: str = "Delhi") -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()

        # Fetch the latest 14 available historical observations for this city.
        rows_desc = (
            self.db.query(
                HistoricalAQI,
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
            .filter(City.name.ilike(city.strip()))
            .order_by(desc(HistoricalAQI.observation_date))
            .limit(14)
            .all()
        )

        if not rows_desc:
            raise ValueError(
                f"No historical AQI records found for city '{city}'."
            )

        rows = list(reversed(rows_desc))
        historical_series = []

        for record, pollutant, weather in rows:
            historical_series.append({
                "date": record.observation_date,
                "aqi": record.aqi,
                "category": _category(record),
                "pm25": _round_or_none(pollutant.pm25) if pollutant else None,
                "pm10": _round_or_none(pollutant.pm10) if pollutant else None,
                "no2": _round_or_none(pollutant.no2) if pollutant else None,
                "so2": _round_or_none(pollutant.so2) if pollutant else None,
                "co": _round_or_none(pollutant.co) if pollutant else None,
                "o3": _round_or_none(pollutant.o3) if pollutant else None,
                "temperature": (
                    _round_or_none(weather.temperature) if weather else None
                ),
                "humidity": (
                    _round_or_none(weather.relative_humidity) if weather else None
                ),
                "windSpeed": (
                    _round_or_none(weather.wind_speed) if weather else None
                ),
            })

        latest_record, latest_pollutant, latest_weather = rows[-1]
        latest_aqi = float(latest_record.aqi)
        latest_date = latest_record.observation_date

        historical_values = [float(row[0].aqi) for row in rows]
        average_aqi = round(
            sum(historical_values) / len(historical_values), 1
        )

        # This is an observed historical trend, not a forecast.
        if len(rows) >= 2:
            previous_aqi = float(rows[-2][0].aqi)
            trend, trend_delta, _, _ = determine_trend(
                previous_aqi, latest_aqi
            )
        else:
            trend = "Unavailable"
            trend_delta = None

        # Only display predictions that actually exist in PostgreSQL.
        latest_prediction = (
            self.db.query(PredictionRecord, City.name)
            .join(City, PredictionRecord.city_id == City.id)
            .filter(City.name.ilike(city.strip()))
            .order_by(desc(PredictionRecord.created_at))
            .first()
        )

        predicted_next_day = (
            float(latest_prediction[0].predicted_aqi)
            if latest_prediction
            else None
        )

        recent_prediction_rows = (
            self.db.query(PredictionRecord, City.name)
            .join(City, PredictionRecord.city_id == City.id)
            .order_by(desc(PredictionRecord.created_at))
            .limit(5)
            .all()
        )

        recent_predictions = [
            self._prediction_dict(prediction, city_name)
            for prediction, city_name in recent_prediction_rows
        ]

        # Build city comparisons from the latest stored observation per city.
        latest_cities = self._latest_record_per_city()
        city_comparisons = []

        for record, city_obj, pollutant in latest_cities:
            previous = (
                self.db.query(HistoricalAQI)
                .filter(
                    HistoricalAQI.city_id == record.city_id,
                    HistoricalAQI.observation_date < record.observation_date,
                )
                .order_by(desc(HistoricalAQI.observation_date))
                .first()
            )

            city_trend = (
                determine_trend(previous.aqi, record.aqi)[0]
                if previous
                else "Unavailable"
            )

            city_comparisons.append({
                "city": city_obj.name,
                "aqi": float(record.aqi),
                "category": _category(record),
                "dominantPollutant": "Not computed",
                "trend": city_trend,
                "observationDate": record.observation_date,
            })

        city_comparisons.sort(
            key=lambda item: item["aqi"],
            reverse=True,
        )

        # Distribution of the selected city's available observations.
        category_order = [
            ("Good", "#10B981"),
            ("Satisfactory", "#84CC16"),
            ("Moderate", "#F59E0B"),
            ("Poor", "#F97316"),
            ("Very Poor", "#EF4444"),
            ("Severe", "#881337"),
        ]

        category_counts = {}
        for series_point in historical_series:
            category = series_point["category"]
            category_counts[category] = category_counts.get(category, 0) + 1

        observation_count = len(historical_series)
        category_distribution = [
            {
                "category": name,
                "count": category_counts.get(name, 0),
                "percentage": round(
                    category_counts.get(name, 0) / observation_count * 100, 1
                ) if observation_count else 0.0,
                "color": color,
            }
            for name, color in category_order
        ]

        # We have daily historical data, not a verified live AQI feed.
        warnings = []
        if latest_aqi > 100:
            warnings.append({
                "id": f"historical-warning-{city}-{latest_date}",
                "severity": "high" if latest_aqi > 200 else "moderate",
                "title": f"{city} Historical Air-Quality Advisory",
                "message": (
                    f"The latest available stored AQI is {latest_aqi:.1f} "
                    f"for {latest_date}. This is a historical observation, "
                    "not a real-time measurement."
                ),
                "city": city,
                "timestamp": latest_date,
            })

        comparison_series = [
            {
                "date": point["date"],
                "actualAqi": point["aqi"],
                "predictedAqi": None,
                "category": point["category"],
            }
            for point in historical_series[-7:]
        ]

        high_risk_count = sum(
            1 for item in city_comparisons if item["aqi"] > 200
        )

        return {
            "city": city,
            "kpis": {
                # This is the latest stored reading, not necessarily today's AQI.
                "currentAqi": latest_aqi,
                "currentCategory": _category(latest_record),
                "latestObservationDate": latest_date,
                "historicalAverageAqi": average_aqi,
                # None until a real prediction record is stored.
                "predictedNextDayAqi": predicted_next_day,
                "trend": trend,
                "trendDelta": trend_delta,
                "highRiskLocationsCount": high_risk_count,
            },
            "historicalSeries": historical_series,
            "predictedComparisonSeries": comparison_series,
            "pollutantBreakdown": {
                "pm25": _round_or_none(latest_pollutant.pm25) if latest_pollutant else None,
                "pm10": _round_or_none(latest_pollutant.pm10) if latest_pollutant else None,
                "no2": _round_or_none(latest_pollutant.no2) if latest_pollutant else None,
                "so2": _round_or_none(latest_pollutant.so2) if latest_pollutant else None,
                "co": _round_or_none(latest_pollutant.co) if latest_pollutant else None,
                "o3": _round_or_none(latest_pollutant.o3) if latest_pollutant else None,
                "nh3": _round_or_none(latest_pollutant.nh3) if latest_pollutant else None,
                "no": _round_or_none(latest_pollutant.no) if latest_pollutant else None,
                "nox": _round_or_none(latest_pollutant.nox) if latest_pollutant else None,
            },
            "cityComparisons": city_comparisons[:6],
            "categoryDistribution": category_distribution,
            "recentPredictions": recent_predictions,
            "warnings": warnings,
            "metadata": ApiResponseMetadata(
                data_source="database",
                model_status="ready" if latest_prediction else "not_trained",
                model_name=(
                    latest_prediction[0].model_name if latest_prediction else None
                ),
                prediction_type="historical_overview",
                is_demo=False,
                timestamp=now,
            ).model_dump(),
        }

# from datetime import datetime, timedelta
# import math
# from typing import Dict, Any, List
# from sqlalchemy.orm import Session

# from backend.app.schemas.common import ApiResponseMetadata
# from backend.app.services.standards import get_epa_category, determine_trend
# # from backend.app.services.prediction_service import CITY_BASELINES
# # Demo-only values for the Overview page.
# # Replace with database queries when historical data is integrated.
# DEMO_CITY_BASELINES = {
#     "Delhi": 185.0,
#     "Mumbai": 92.0,
#     "Pune": 78.0,
#     "Bengaluru": 48.0,
#     "Chennai": 65.0,
#     "Hyderabad": 115.0,
# }

# class OverviewService:
#     def __init__(self, db: Session):
#         self.db = db

#     def get_overview(self, city: str = "Delhi") -> Dict[str, Any]:
#         # reference_aqi = CITY_BASELINES.get(city, 120.0)
#         reference_aqi = DEMO_CITY_BASELINES.get(city, 120.0)
#         current_cat, _, _, _ = get_epa_category(reference_aqi)

#         delta_pred = 20.0 if city == "Delhi" else -4.0 if city == "Mumbai" else 6.0
#         pred_next_day = reference_aqi + delta_pred
#         trend_dir, delta, _, _ = determine_trend(reference_aqi, pred_next_day)

#         now = datetime.utcnow()

#         # 14 days historical
#         historical_series = []
#         for i in range(14):
#             d = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
#             offset = math.sin(i * 0.7) * 22.0 + (i * 1.5) - 10.0
#             val = round(max(25.0, reference_aqi + offset), 1)
#             cat, _, _, _ = get_epa_category(val)
#             historical_series.append({
#                 "date": d,
#                 "aqi": val,
#                 "category": cat,
#                 "pm25": round(val * 0.62, 1),
#                 "pm10": round(val * 1.15, 1),
#                 "no2": round(28.0 + (i % 6) * 4.0, 1),
#                 "so2": round(14.0 + (i % 4) * 2.5, 1),
#                 "co": round(0.8 + (val / 180.0), 1),
#                 "o3": round(35.0 + (i % 5) * 5.0, 1)
#             })

#         avg_aqi = round(sum(p["aqi"] for p in historical_series) / len(historical_series), 1)

#         # 7-day predicted comparison
#         predicted_comparison_series = []
#         for i in range(7):
#             d = (now - timedelta(days=3 - i)).strftime("%Y-%m-%d")
#             is_past = i <= 3
#             actual = historical_series[len(historical_series) - 4 + i]["aqi"] if is_past else None
#             pred = round(reference_aqi + (i - 3) * (delta / 3.0) + math.sin(i) * 5.0, 1)
#             cat, _, _, _ = get_epa_category(pred)
#             predicted_comparison_series.append({
#                 "date": d,
#                 "actualAqi": actual,
#                 "predictedAqi": pred,
#                 "category": cat
#             })

#         return {
#             "city": city,
#             "kpis": {
#                 "currentAqi": reference_aqi,
#                 "currentCategory": current_cat,
#                 "historicalAverageAqi": avg_aqi,
#                 "predictedNextDayAqi": pred_next_day,
#                 "trend": trend_dir,
#                 "trendDelta": delta,
#                 "highRiskLocationsCount": 14 if reference_aqi > 100 else 3
#             },
#             "historicalSeries": historical_series,
#             "predictedComparisonSeries": predicted_comparison_series,
#             "pollutantBreakdown": {
#                 "pm25": round(reference_aqi * 0.65, 1),
#                 "pm10": round(reference_aqi * 1.2, 1),
#                 "no2": 44.5,
#                 "so2": 18.2,
#                 "co": 1.4,
#                 "o3": 42.0,
#                 "nh3": 21.0,
#                 "no": 19.8,
#                 "nox": 38.6
#             },
#             "cityComparisons": [
#                 {"city": "Delhi", "aqi": 185.0, "category": "Unhealthy", "dominantPollutant": "PM2.5", "trend": "Increasing"},
#                 {"city": "Hyderabad", "aqi": 115.0, "category": "Unhealthy for Sensitive Groups", "dominantPollutant": "PM2.5", "trend": "Increasing"},
#                 {"city": "Mumbai", "aqi": 92.0, "category": "Moderate", "dominantPollutant": "PM10", "trend": "Decreasing"},
#                 {"city": "Pune", "aqi": 78.0, "category": "Moderate", "dominantPollutant": "O3", "trend": "Stable"},
#                 {"city": "Chennai", "aqi": 65.0, "category": "Moderate", "dominantPollutant": "SO2", "trend": "Decreasing"},
#                 {"city": "Bengaluru", "aqi": 48.0, "category": "Good", "dominantPollutant": "NO2", "trend": "Stable"}
#             ],
#             "categoryDistribution": [
#                 {"category": "Good", "count": 4, "percentage": 14.3, "color": "#10B981"},
#                 {"category": "Moderate", "count": 11, "percentage": 39.3, "color": "#F59E0B"},
#                 {"category": "Unhealthy for Sensitive Groups", "count": 7, "percentage": 25.0, "color": "#F97316"},
#                 {"category": "Unhealthy", "count": 5, "percentage": 17.9, "color": "#EF4444"},
#                 {"category": "Very Unhealthy", "count": 1, "percentage": 3.5, "color": "#8B5CF6"},
#                 {"category": "Hazardous", "count": 0, "percentage": 0.0, "color": "#881337"}
#             ],
#             "recentPredictions": [
#                 {
#                     "id": "pred-101",
#                     "city": "Delhi",
#                     "timestamp": (now - timedelta(minutes=15)).isoformat(),
#                     "referenceAqi": 185.0,
#                     "predictedAqi": 205.0,
#                     "horizon": "Next Day",
#                     "category": "Very Unhealthy",
#                     "trend": "Increasing",
#                     "risk": "Severe Risk",
#                     "isDemo": True
#                 },
#                 {
#                     "id": "pred-102",
#                     "city": "Mumbai",
#                     "timestamp": (now - timedelta(minutes=45)).isoformat(),
#                     "referenceAqi": 92.0,
#                     "predictedAqi": 88.0,
#                     "horizon": "Next 3 Days",
#                     "category": "Moderate",
#                     "trend": "Decreasing",
#                     "risk": "Moderate Risk",
#                     "isDemo": True
#                 },
#                 {
#                     "id": "pred-103",
#                     "city": "Bengaluru",
#                     "timestamp": (now - timedelta(minutes=120)).isoformat(),
#                     "referenceAqi": 48.0,
#                     "predictedAqi": 52.0,
#                     "horizon": "Next 7 Days",
#                     "category": "Moderate",
#                     "trend": "Stable",
#                     "risk": "Low Risk",
#                     "isDemo": True
#                 }
#             ],
#             "warnings": [
#                 {
#                     "id": "warn-1",
#                     "severity": "high" if reference_aqi > 150 else "moderate",
#                     "title": f"{city} Particulate Exposure Advisory",
#                     "message": f"Ground-level PM2.5 concentrations in {city} exceed baseline health guidelines. Sensitive cohorts should limit heavy outdoor exertion.",
#                     "city": city,
#                     "timestamp": now.isoformat()
#                 }
#             ],
#             "metadata": ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now.isoformat()
#             ).dict()
#         }
