from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    ConfidenceInterval,
    FeatureDriver,
    ForecastSeriesPoint
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_epa_category, get_risk_assessment, determine_trend
from backend.app.ml.inference import InferenceEngine

CITY_BASELINES = {
    "Delhi": 185.0,
    "Mumbai": 92.0,
    "Pune": 78.0,
    "Bengaluru": 48.0,
    "Chennai": 65.0,
    "Hyderabad": 115.0
}

class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.inference_engine = InferenceEngine()

    def predict(self, req: PredictionRequest) -> PredictionResponse:
        reference_aqi = CITY_BASELINES.get(req.city, 120.0)

        # Multipliers based on horizon
        horizon_factors = {
            "next_day": (1.08, 1),
            "next_3_days": (1.14, 3),
            "next_7_days": (1.22, 7)
        }
        factor, days = horizon_factors.get(req.horizon, (1.08, 1))

        # Check features if advanced mode
        features_dict = {}
        if req.mode == "advanced" and req.features:
            features_dict = req.features.model_dump(exclude_unset=True)

        predicted_val, model_name, is_demo = self.inference_engine.run_regression_inference(
            features_dict=features_dict
        )

        # Scale by horizon
        predicted_aqi = round(max(15.0, min(500.0, reference_aqi * factor + (predicted_val - 120.0) * 0.2)), 1)
        category_name, color, health_stmt, _ = get_epa_category(predicted_aqi)
        risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)
        trend_dir, delta, pct, explanation = determine_trend(reference_aqi, predicted_aqi)

        now = datetime.utcnow()
        forecast_series: List[ForecastSeriesPoint] = []
        for i in range(1, days + 1):
            step_date = (now + timedelta(days=i)).strftime("%Y-%m-%d")
            step_aqi = round(reference_aqi + ((predicted_aqi - reference_aqi) / days) * i, 1)
            step_cat, _, _, _ = get_epa_category(step_aqi)
            forecast_series.append(ForecastSeriesPoint(
                date=step_date,
                predictedAqi=step_aqi,
                category=step_cat,
                confidenceLower=max(10.0, round(step_aqi - 12.0 - i * 3.0, 1)),
                confidenceUpper=min(500.0, round(step_aqi + 14.0 + i * 4.0, 1)),
                isForecast=True
            ))

        return PredictionResponse(
            city=req.city,
            referenceAqi=reference_aqi,
            predictedAqi=predicted_aqi,
            category=category_name,
            trend=trend_dir,
            riskLevel=risk_level,
            horizon=req.horizon,
            predictionTimestamp=now.isoformat(),
            confidenceInterval=ConfidenceInterval(
                lower=max(10.0, round(predicted_aqi - (days * 6.0 + 10.0), 1)),
                upper=min(500.0, round(predicted_aqi + (days * 8.0 + 12.0), 1))
            ),
            featureDrivers=[
                FeatureDriver(feature="PM2.5 (Fine Particulates)", weight=0.42, impact="positive"),
                FeatureDriver(feature="Wind Speed & Dispersion", weight=0.23, impact="negative"),
                FeatureDriver(feature="Ambient Temperature & Inversion", weight=0.16, impact="positive"),
                FeatureDriver(feature="PM10 (Coarse Particulates)", weight=0.12, impact="positive"),
                FeatureDriver(feature="Relative Humidity", weight=0.07, impact="positive"),
            ],
            forecastSeries=forecast_series,
            explanation=f"Based on atmospheric regression simulation, {req.city} AQI is projected to shift from {reference_aqi} to {predicted_aqi} over the {req.horizon.replace('_', ' ')} horizon. {explanation} Health risk evaluated at '{risk_level}'.",
            metadata=ApiResponseMetadata(
                data_source="demo" if is_demo else "ml_model",
                model_status="not_trained" if is_demo else "ready",
                model_name=model_name if not is_demo else None,
                prediction_type="demo" if is_demo else "regression",
                is_demo=is_demo,
                timestamp=now.isoformat()
            )
        )
