from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.weather_record import WeatherRecord
from backend.app.schemas.classification import (
    ClassificationRequest,
    ClassificationResponse,
    CategoryProbability,
    CategoryDistributionItem,
    ClassificationHistoryItem,
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_cpcb_category
from backend.app.ml.model_loader import ModelLoader


CPCB_DETAILS: Dict[str, Dict[str, str]] = {
    "Good": {
        "color": "#10B981",
        "health": "Air quality is good, with minimal health concern for most people.",
        "advice": "Normal outdoor activities are generally suitable.",
    },
    "Satisfactory": {
        "color": "#84CC16",
        "health": "Air quality is satisfactory, with minor concerns for unusually sensitive people.",
        "advice": "Most people can continue normal activities; unusually sensitive people should monitor symptoms.",
    },
    "Moderate": {
        "color": "#F59E0B",
        "health": "Air quality may cause breathing discomfort to sensitive individuals.",
        "advice": "Sensitive people should consider reducing prolonged or strenuous outdoor exertion.",
    },
    "Poor": {
        "color": "#F97316",
        "health": "Air quality may cause breathing discomfort to many people during prolonged exposure.",
        "advice": "Reduce prolonged outdoor exposure and strenuous activities.",
    },
    "Very Poor": {
        "color": "#EF4444",
        "health": "Prolonged exposure to very poor air quality may cause respiratory effects.",
        "advice": "Limit outdoor exposure and follow local air-quality advisories.",
    },
    "Severe": {
        "color": "#881337",
        "health": "Severe air pollution may affect healthy people and seriously affect sensitive groups.",
        "advice": "Minimize outdoor exposure and follow official public-health advisories.",
    },
}

CPCB_ORDER = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]


def _season_for_month(month: int) -> str:
    """Match the season labels used in the training dataset."""
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
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if pd.notna(number) else None


def _record_category(record: HistoricalAQI) -> str:
    bucket = (record.original_category or "").strip()
    if bucket in CPCB_ORDER:
        return bucket
    return get_cpcb_category(float(record.aqi))[0]


def _feature_row(
    city: City,
    latest_rows: List[Tuple[HistoricalAQI, Optional[PollutantRecord], Optional[WeatherRecord]]],
) -> Dict[str, Any]:
    """Build the same named feature columns that were used for training.

    Rows are newest-first. Lag features are taken from earlier stored
    observations, not from the target day's AQI.
    """
    latest_record, pollutant, weather = latest_rows[0]
    try:
        observation_date = datetime.strptime(latest_record.observation_date, "%Y-%m-%d")
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid stored observation date: {latest_record.observation_date!r}",
        ) from exc

    previous_aqi = [float(row[0].aqi) for row in latest_rows[1:]]
    prior_seven = previous_aqi[:7]

    # Column names here must match the model artifact's feature list exactly.
    return {
        "PM2.5": _safe_float(pollutant.pm25) if pollutant else None,
        "PM10": _safe_float(pollutant.pm10) if pollutant else None,
        "NO": _safe_float(pollutant.no) if pollutant else None,
        "NO2": _safe_float(pollutant.no2) if pollutant else None,
        "NOx": _safe_float(pollutant.nox) if pollutant else None,
        "NH3": _safe_float(pollutant.nh3) if pollutant else None,
        "CO": _safe_float(pollutant.co) if pollutant else None,
        "SO2": _safe_float(pollutant.so2) if pollutant else None,
        "O3": _safe_float(pollutant.o3) if pollutant else None,
        "Benzene": _safe_float(pollutant.benzene) if pollutant else None,
        "Toluene": _safe_float(pollutant.toluene) if pollutant else None,
        "Xylene": _safe_float(pollutant.xylene) if pollutant else None,
        "temperature_2m": _safe_float(weather.temperature) if weather else None,
        "relative_humidity_2m": _safe_float(weather.relative_humidity) if weather else None,
        "wind_speed_10m": _safe_float(weather.wind_speed) if weather else None,
        "wind_direction_10m_dominant": _safe_float(weather.wind_direction) if weather else None,
        "precipitation": _safe_float(weather.precipitation) if weather else None,
        "surface_pressure": _safe_float(weather.surface_pressure) if weather else None,
        "latitude": _safe_float(city.latitude),
        "longitude": _safe_float(city.longitude),
        "day_of_week": observation_date.weekday(),
        "month": observation_date.month,
        "aqi_lag_1d": previous_aqi[0] if len(previous_aqi) >= 1 else None,
        "aqi_lag_3d": previous_aqi[2] if len(previous_aqi) >= 3 else None,
        "aqi_lag_7d": previous_aqi[6] if len(previous_aqi) >= 7 else None,
        "aqi_rolling_mean_7d": sum(prior_seven) / len(prior_seven) if len(prior_seven) == 7 else None,
        "City": city.name,
        "season": _season_for_month(observation_date.month),
    }


class ClassificationService:
    def __init__(self, db: Session):
        self.db = db

    def classify(self, req: ClassificationRequest) -> ClassificationResponse:
        city_name = req.city.strip()
        if not city_name:
            raise HTTPException(status_code=422, detail="City name cannot be empty.")

        city = self.db.query(City).filter(City.name.ilike(city_name)).first()
        if city is None:
            raise HTTPException(status_code=404, detail=f"City '{city_name}' was not found in the database.")

        # Load the newest 14 observations with their stored pollutant/weather rows.
        latest_rows = (
            self.db.query(HistoricalAQI, PollutantRecord, WeatherRecord)
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
            .filter(HistoricalAQI.city_id == city.id)
            .order_by(desc(HistoricalAQI.observation_date))
            .limit(14)
            .all()
        )

        if not latest_rows:
            raise HTTPException(status_code=404, detail=f"No historical observations are available for '{city_name}'.")

        artifact = ModelLoader.load_model("aqi_classification.joblib")
        if not isinstance(artifact, dict) or "pipeline" not in artifact or "features" not in artifact:
            raise HTTPException(
                status_code=503,
                detail="The trained classification model is unavailable. Train aqi_classification.joblib first.",
            )

        feature_values = _feature_row(city, latest_rows)
        expected_features = artifact["features"]
        missing_columns = [feature for feature in expected_features if feature not in feature_values]
        if missing_columns:
            raise HTTPException(
                status_code=500,
                detail=f"The classification artifact expects unsupported features: {missing_columns}",
            )

        # Preserve the exact feature order stored with the training artifact.
        X = pd.DataFrame(
            [{feature: feature_values[feature] for feature in expected_features}],
            columns=expected_features,
        )

        try:
            pipeline = artifact["pipeline"]
            predicted_category = str(pipeline.predict(X)[0])
            class_labels = [str(label) for label in getattr(pipeline, "classes_", artifact.get("classes", []))]
            scores = pipeline.predict_proba(X)[0] if hasattr(pipeline, "predict_proba") else None
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Classification inference failed: {exc}") from exc

        if predicted_category not in CPCB_DETAILS:
            raise HTTPException(
                status_code=500,
                detail=f"The model returned an unsupported CPCB category: {predicted_category!r}",
            )

        latest_record = latest_rows[0][0]
        detail = CPCB_DETAILS[predicted_category]
        probabilities = None
        if scores is not None:
            probabilities = [
                CategoryProbability(category=label, probability=round(float(score), 4))
                for label, score in zip(class_labels, scores)
            ]
            probabilities.sort(key=lambda item: item.probability, reverse=True)

        category_counts = {category: 0 for category in CPCB_ORDER}
        history_items = []
        for record, _pollutant, _weather in latest_rows:
            observed_category = _record_category(record)
            category_counts[observed_category] = category_counts.get(observed_category, 0) + 1
            history_items.append(
                ClassificationHistoryItem(
                    id=str(record.id),
                    timestamp=f"{record.observation_date}T00:00:00",
                    aqi=float(record.aqi),
                    category=observed_category,
                    city=city.name,
                )
            )

        observation_total = len(latest_rows)
        distribution = [
            CategoryDistributionItem(
                category=category,
                count=category_counts[category],
                percentage=round(category_counts[category] / observation_total * 100, 1),
                color=CPCB_DETAILS[category]["color"],
            )
            for category in CPCB_ORDER
        ]

        now = datetime.utcnow().isoformat()
        return ClassificationResponse(
            aqi=float(latest_record.aqi),
            city=city.name,
            observationDate=latest_record.observation_date,
            category=predicted_category,
            schemeIdentifier="INDIA_CPCB",
            explanation=(
                f"The trained Random Forest classifier classified the latest stored observation for {city.name} "
                f"dated {latest_record.observation_date} using pollutant, weather, location, calendar, and lag features. "
                f"The stored AQI ({float(latest_record.aqi):.1f}) is displayed as context and was not used as a model input."
            ),
            healthStatement=detail["health"],
            cautionaryStatement=detail["advice"],
            color=detail["color"],
            probabilities=probabilities,
            history=history_items[:5],
            categoryDistribution=distribution,
            metadata=ApiResponseMetadata(
                data_source="database",
                model_status="ready",
                model_name=artifact.get("model_name", "RandomForestClassifier_AQI_Bucket"),
                prediction_type="classification_rf",
                is_demo=False,
                timestamp=now,
            ),
        )





# from datetime import datetime
# from sqlalchemy.orm import Session
# from backend.app.schemas.classification import (
#     ClassificationRequest,
#     ClassificationResponse,
#     CategoryDistributionItem,
#     ClassificationHistoryItem
# )
# from backend.app.schemas.common import ApiResponseMetadata
# from backend.app.services.standards import get_epa_category

# class ClassificationService:
#     def __init__(self, db: Session):
#         self.db = db

#     def classify(self, req: ClassificationRequest) -> ClassificationResponse:
#         aqi_val = round(max(0.0, req.aqi), 1)
#         category_name, color, health_stmt, cautionary_stmt = get_epa_category(aqi_val)

#         category_distribution = [
#             CategoryDistributionItem(category="Good", count=12, percentage=16.7, color="#10B981"),
#             CategoryDistributionItem(category="Moderate", count=28, percentage=38.9, color="#F59E0B"),
#             CategoryDistributionItem(category="Unhealthy for Sensitive Groups", count=18, percentage=25.0, color="#F97316"),
#             CategoryDistributionItem(category="Unhealthy", count=10, percentage=13.9, color="#EF4444"),
#             CategoryDistributionItem(category="Very Unhealthy", count=4, percentage=5.5, color="#8B5CF6"),
#             CategoryDistributionItem(category="Hazardous", count=0, percentage=0.0, color="#881337"),
#         ]

#         now = datetime.utcnow().isoformat()
#         history = [
#             ClassificationHistoryItem(id="cls-1", timestamp=now, aqi=aqi_val, category=category_name, city=req.city or "Delhi"),
#             ClassificationHistoryItem(id="cls-2", timestamp=now, aqi=142.0, category="Unhealthy for Sensitive Groups", city="Hyderabad"),
#             ClassificationHistoryItem(id="cls-3", timestamp=now, aqi=45.0, category="Good", city="Bengaluru"),
#             ClassificationHistoryItem(id="cls-4", timestamp=now, aqi=95.0, category="Moderate", city="Mumbai"),
#         ]

#         return ClassificationResponse(
#             aqi=aqi_val,
#             category=category_name,
#             schemeIdentifier=req.scheme or "US_EPA",
#             explanation=f"AQI value of {aqi_val} falls within the '{category_name}' regulatory band under the configured {req.scheme or 'US_EPA'} standard.",
#             healthStatement=health_stmt,
#             cautionaryStatement=cautionary_stmt,
#             color=color,
#             probabilities=None, # Intentionally null in Phase 1 (no fabricated confidence scores)
#             history=history,
#             categoryDistribution=category_distribution,
#             metadata=ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now
#             )
#         )
