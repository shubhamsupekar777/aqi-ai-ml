"""Database-backed 3-day AQI trend classification using the trained V2 artifact.

The classifier predicts a direction label only (Increasing, Stable, Decreasing).
It does not predict exact AQI values for individual future dates, so this service
intentionally returns no numeric forecast curve or synthetic confidence bounds.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.app.core.logging import logger
from backend.app.ml.model_loader import ModelLoader
from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.weather_record import WeatherRecord
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.schemas.trend import TrendClassScore, TrendDataPoint, TrendResponse
from backend.app.services.standards import get_cpcb_category

MODEL_FILENAME = "aqi_trend_classifier_v2.joblib"
SUPPORTED_HORIZON_DAYS = 3

# Must match the feature names in train_aqi_trend_classifier_v2.py.
NUMERIC_FEATURE_MAP = {
    "AQI": ("historical", "aqi"),
    "PM2.5": ("pollutant", "pm25"),
    "PM10": ("pollutant", "pm10"),
    "NO": ("pollutant", "no"),
    "NO2": ("pollutant", "no2"),
    "NOx": ("pollutant", "nox"),
    "NH3": ("pollutant", "nh3"),
    "CO": ("pollutant", "co"),
    "SO2": ("pollutant", "so2"),
    "O3": ("pollutant", "o3"),
    "Benzene": ("pollutant", "benzene"),
    "Toluene": ("pollutant", "toluene"),
    "Xylene": ("pollutant", "xylene"),
    "temperature_2m": ("weather", "temperature"),
    "relative_humidity_2m": ("weather", "relative_humidity"),
    "wind_speed_10m": ("weather", "wind_speed"),
    "wind_direction_10m_dominant": ("weather", "wind_direction"),
    "precipitation": ("weather", "precipitation"),
    "surface_pressure": ("weather", "surface_pressure"),
    "latitude": ("city", "latitude"),
    "longitude": ("city", "longitude"),
}

CPCB_LABELS = {"Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"}
TREND_LABELS = {"Increasing", "Stable", "Decreasing"}


def _to_date(value: str) -> date:
    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _season_for_month(month: int) -> str:
    """Reproduce the dataset's common Indian meteorological season buckets."""
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Summer"
    if month in (6, 7, 8, 9):
        return "Monsoon"
    return "Post-Monsoon"


def _safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if pd.notna(numeric) else None


def _cpcb_category(aqi: float, original: Optional[str] = None) -> str:
    if original in CPCB_LABELS:
        return str(original)
    return get_cpcb_category(float(aqi))[0]


class TrendService:
    def __init__(self, db: Session):
        self.db = db

    def _load_city_history(self, city_name: str):
        return (
            self.db.query(HistoricalAQI, PollutantRecord, WeatherRecord, City)
            .join(City, HistoricalAQI.city_id == City.id)
            .outerjoin(
                PollutantRecord,
                PollutantRecord.historical_aqi_id == HistoricalAQI.id,
            )
            .outerjoin(
                WeatherRecord,
                and_(
                    WeatherRecord.city_id == HistoricalAQI.city_id,
                    WeatherRecord.observation_date == HistoricalAQI.observation_date,
                ),
            )
            .filter(City.name.ilike(city_name.strip()))
            .order_by(HistoricalAQI.observation_date.asc())
            .all()
        )

    def _build_features(self, rows) -> tuple[dict[str, Any], HistoricalAQI, City, date]:
        if not rows:
            raise HTTPException(
                status_code=404,
                detail="No historical AQI observations were found for the selected city.",
            )

        # A row is (HistoricalAQI, PollutantRecord | None, WeatherRecord | None, City).
        valid_rows = [row for row in rows if _safe_float(row[0].aqi) is not None]
        if not valid_rows:
            raise HTTPException(status_code=422, detail="The selected city has no valid AQI observations.")

        latest_row = valid_rows[-1]
        latest, pollutant, weather, city = latest_row
        latest_date = _to_date(latest.observation_date)
        if not 0 <= float(latest.aqi) <= 500:
            raise HTTPException(
                status_code=422,
                detail="The latest stored AQI is outside the 0–500 range used to train this model.",
            )

        # Exact date lookups prevent accidentally treating a multi-day gap as a 1-day lag.
        by_date = {}
        for row in valid_rows:
            try:
                by_date[_to_date(row[0].observation_date)] = row
            except (TypeError, ValueError):
                continue

        features: dict[str, Any] = {"City": city.name}
        for feature_name, (source, attr) in NUMERIC_FEATURE_MAP.items():
            if source == "historical":
                value = getattr(latest, attr, None)
            elif source == "pollutant":
                value = getattr(pollutant, attr, None) if pollutant else None
            elif source == "weather":
                value = getattr(weather, attr, None) if weather else None
            elif source == "city":
                value = getattr(city, attr, None)
            else:
                value = None
            features[feature_name] = _safe_float(value)

        for lag_days, feature_name in ((1, "aqi_lag_1d"), (3, "aqi_lag_3d"), (7, "aqi_lag_7d")):
            lag_row = by_date.get(latest_date - timedelta(days=lag_days))
            features[feature_name] = _safe_float(lag_row[0].aqi) if lag_row else None

        trailing_values = []
        for offset in range(0, 7):
            hist_row = by_date.get(latest_date - timedelta(days=offset))
            if hist_row:
                value = _safe_float(hist_row[0].aqi)
                if value is not None:
                    trailing_values.append(value)
        features["aqi_rolling_mean_7d"] = (
            float(sum(trailing_values) / len(trailing_values)) if trailing_values else None
        )
        features["day_of_week"] = latest_date.weekday()
        features["month"] = latest_date.month
        features["season"] = _season_for_month(latest_date.month)

        return features, latest, city, latest_date

    def get_trends(self, city: str = "Delhi", horizon_days: int = 3) -> TrendResponse:
        if horizon_days != SUPPORTED_HORIZON_DAYS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The trained trend classifier predicts the smoothed 3-day trend only. "
                    "Use horizon_days=3; it does not produce 7-day or 14-day numeric AQI forecasts."
                ),
            )

        rows = self._load_city_history(city)
        features, latest, city_record, latest_date = self._build_features(rows)

        artifact = ModelLoader.load_model(MODEL_FILENAME)
        if not isinstance(artifact, dict) or artifact.get("pipeline") is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"The trained trend model '{MODEL_FILENAME}' is unavailable or invalid. "
                    "Run train_aqi_trend_classifier_v2.py first."
                ),
            )

        feature_columns = artifact.get("features")
        if not isinstance(feature_columns, list) or not feature_columns:
            raise HTTPException(status_code=503, detail="The trend model artifact has no feature list.")

        model_input = pd.DataFrame([{name: features.get(name) for name in feature_columns}], columns=feature_columns)
        pipeline = artifact["pipeline"]
        try:
            prediction = str(pipeline.predict(model_input)[0])
            if prediction not in TREND_LABELS:
                raise ValueError(f"Unexpected trend label returned by model: {prediction}")
            scores = []
            if hasattr(pipeline, "predict_proba"):
                probabilities = pipeline.predict_proba(model_input)[0]
                final_estimator = list(getattr(pipeline, "named_steps", {}).values())[-1]
                model_classes = list(getattr(final_estimator, "classes_", []))
                scores = [
                    TrendClassScore(direction=str(label), score=float(probability))
                    for label, probability in zip(model_classes, probabilities)
                    if str(label) in TREND_LABELS
                ]
                scores.sort(key=lambda item: item.score, reverse=True)
        except Exception as exc:
            logger.exception("AQI trend model inference failed for city=%s", city)
            raise HTTPException(status_code=422, detail=f"Unable to classify the selected city's trend: {exc}") from exc

        historical_rows = [row for row in rows if _safe_float(row[0].aqi) is not None][-14:]
        historical_series: List[TrendDataPoint] = []
        for historical, _pollutant, _weather, _city in historical_rows:
            category = _cpcb_category(float(historical.aqi), historical.original_category)
            historical_series.append(
                TrendDataPoint(
                    date=str(historical.observation_date),
                    aqi=float(historical.aqi),
                    category=category,
                    isForecast=False,
                    lowerBound=None,
                    upperBound=None,
                )
            )

        reference_aqi = float(latest.aqi)
        current_category = _cpcb_category(reference_aqi, latest.original_category)
        scores_text = ", ".join(f"{s.direction}: {s.score * 100:.1f}%" for s in scores)
        explanation = (
            f"The trained Random Forest classifier predicts a {prediction.lower()} trend over the next "
            f"3-day smoothed window for {city_record.name}. It compares the mean AQI over the next "
            "three days with the trailing three-day mean during training. The prediction is based on "
            f"historical data through {latest_date.isoformat()}; it is not a live sensor forecast."
        )
        if scores_text:
            explanation += f" Model class scores (not calibrated probabilities): {scores_text}."

        now = datetime.utcnow().isoformat()
        return TrendResponse(
            city=city_record.name,
            observationDate=latest_date.isoformat(),
            referenceAqi=reference_aqi,
            currentCategory=current_category,
            trendDirection=prediction,
            delta=None,
            percentageChange=None,
            horizonDays=SUPPORTED_HORIZON_DAYS,
            calculationMethod="RandomForestClassifier_AQI_Trend_3Day; smoothed 3-day trend classes",
            explanation=explanation,
            classScores=scores,
            historicalSeries=historical_series,
            # The classifier does not predict a numeric AQI value for each future day.
            forecastSeries=[],
            combinedSeries=historical_series,
            metadata=ApiResponseMetadata(
                data_source="database",
                model_status="ready",
                model_name=str(artifact.get("model_name", "RandomForestClassifier_AQI_Trend_3Day")),
                prediction_type="trend_classification",
                is_demo=False,
                timestamp=now,
            ),
        )


# from datetime import datetime, timedelta
# import math
# from typing import List
# from sqlalchemy.orm import Session

# from backend.app.schemas.trend import TrendResponse, TrendDataPoint
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

# class TrendService:
#     def __init__(self, db: Session):
#         self.db = db

#     def get_trends(self, city: str = "Delhi", horizon_days: int = 7) -> TrendResponse:
#         reference_aqi = DEMO_CITY_BASELINES.get(city, 120.0)
#         current_cat, _, _, _ = get_epa_category(reference_aqi)

#         now = datetime.utcnow()
#         historical_series: List[TrendDataPoint] = []
#         for i in range(14):
#             d = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
#             offset = math.sin(i * 0.65) * 18.0 - 8.0 + (i * 0.9)
#             val = round(max(20.0, reference_aqi + offset), 1)
#             cat, _, _, _ = get_epa_category(val)
#             historical_series.append(TrendDataPoint(
#                 date=d,
#                 aqi=val,
#                 category=cat,
#                 isForecast=False
#             ))

#         # Project endpoint based on city trajectory
#         delta_target = 20.0 if city == "Delhi" else -10.0 if city == "Mumbai" else 4.0
#         target_aqi = round(reference_aqi + delta_target * (horizon_days / 7.0), 1)
#         trend_dir, delta, pct, explanation = determine_trend(reference_aqi, target_aqi)

#         forecast_series: List[TrendDataPoint] = []
#         for i in range(1, horizon_days + 1):
#             d = (now + timedelta(days=i)).strftime("%Y-%m-%d")
#             step_aqi = round(reference_aqi + ((target_aqi - reference_aqi) / horizon_days) * i, 1)
#             cat, _, _, _ = get_epa_category(step_aqi)
#             forecast_series.append(TrendDataPoint(
#                 date=d,
#                 aqi=step_aqi,
#                 category=cat,
#                 isForecast=True,
#                 lowerBound=max(10.0, round(step_aqi - (8.0 + i * 3.0), 1)),
#                 upperBound=min(500.0, round(step_aqi + (10.0 + i * 4.0), 1))
#             ))

#         combined_series = historical_series + forecast_series

#         return TrendResponse(
#             city=city,
#             referenceAqi=reference_aqi,
#             currentCategory=current_cat,
#             trendDirection=trend_dir,
#             delta=delta,
#             percentageChange=pct,
#             horizonDays=horizon_days,
#             calculationMethod="Slope and variance boundary filtering (±3 AQI margin)",
#             explanation=f"Demo forecast values project a shift of {'+' if delta > 0 else ''}{delta} AQI ({'+' if pct > 0 else ''}{pct}%) across the {horizon_days}-day window. The system therefore classifies this sample trend as {trend_dir}.",
#             historicalSeries=historical_series,
#             forecastSeries=forecast_series,
#             combinedSeries=combined_series,
#             metadata=ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now.isoformat()
#             )
#         )
