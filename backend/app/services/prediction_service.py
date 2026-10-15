
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.city import City
from backend.app.models.prediction_record import PredictionRecord
from backend.app.core.config import settings
from backend.app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    ConfidenceInterval,
    ForecastSeriesPoint,
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import (
    get_cpcb_category,
    get_risk_assessment,
    determine_trend,
)
from backend.app.ml.inference import InferenceEngine


def build_training_features(city: str, features: dict) -> Dict[str, Any]:
    """Map API fields to the exact columns used during model training."""
    return {
        "AQI": features["aqi"],
        "PM2.5": features["pm25"],
        "PM10": features["pm10"],
        "NO": features["no"],
        "NO2": features["no2"],
        "NOx": features["nox"],
        "NH3": features["nh3"],
        "CO": features["co"],
        "SO2": features["so2"],
        "O3": features["o3"],
        "Benzene": features["benzene"],
        "Toluene": features["toluene"],
        "Xylene": features["xylene"],
        "temperature_2m": features["temperature"],
        "relative_humidity_2m": features["humidity"],
        "wind_speed_10m": features["wind_speed"],
        "wind_direction_10m_dominant": features["wind_direction"],
        "precipitation": features["rainfall"],
        "surface_pressure": features["surface_pressure"],
        "latitude": features["latitude"],
        "longitude": features["longitude"],
        "aqi_lag_1d": features["aqi_lag_1d"],
        "aqi_lag_3d": features["aqi_lag_3d"],
        "aqi_lag_7d": features["aqi_lag_7d"],
        "aqi_rolling_mean_7d": features["aqi_rolling_mean_7d"],
        "day_of_week": features["day_of_week"],
        "month": features["month"],
        "City": city,
        "season": features["season"],
    }


class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.inference_engine = InferenceEngine()

    def predict(self, req: PredictionRequest) -> PredictionResponse:
        # This model was trained for next-day AQI only.
        if req.horizon != "next_day":
            raise HTTPException(
                status_code=400,
                detail=(
                    "This model supports next_day predictions only. "
                    "Three-day and seven-day predictions are not implemented."
                ),
            )

        mode = str(settings.PREDICTION_MODE).strip().lower()
        print(f"[DEBUG predict] PREDICTION_MODE={mode!r}")

        if mode != "ml":
            raise HTTPException(
                status_code=503,
                detail=(
                    "The trained-model endpoint is disabled. "
                    f"PredictionService reads PREDICTION_MODE={mode!r}."
                ),
            )

        if req.mode != "advanced" or req.features is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Complete model features are required. "
                    "Automatic historical-data lookup has not been implemented yet."
                ),
            )

        features = req.features.model_dump()
        training_features = build_training_features(req.city, features)

        try:
            predicted_aqi, model_name, is_demo = (
                self.inference_engine.run_regression_inference(
                    features_dict=training_features,
                    model_filename="aqi_next_day.joblib",
                )
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        # Use the observed AQI provided in the request as the reference.
        reference_aqi = float(features["aqi"])

        # Use CPCB categories for the India-focused dashboard.
        category_name, _, _, _ = get_cpcb_category(predicted_aqi)
        risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)

        trend_dir, _, _, trend_explanation = determine_trend(
            reference_aqi, predicted_aqi
        )

        # Save the successful ML prediction to PostgreSQL.
        try:
            city_name = req.city.strip()
            if not city_name:
                raise ValueError("City name cannot be empty.")

            city_record = (
                self.db.query(City)
                .filter(City.name.ilike(city_name))
                .first()
            )

            # Create the city if it does not exist yet.
            if city_record is None:
                city_record = City(
                    name=city_name,
                    country="India",
                )
                self.db.add(city_record)
                self.db.flush()

            prediction_record = PredictionRecord(
                city_id=city_record.id,
                reference_aqi=reference_aqi,
                predicted_aqi=predicted_aqi,
                prediction_horizon=req.horizon,
                prediction_type="regression",
                model_name=model_name,
                is_demo=is_demo,
            )

            self.db.add(prediction_record)
            self.db.commit()

        except Exception as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=(
                    "The prediction was generated, but saving it to "
                    "PostgreSQL failed. Check the backend logs."
                ),
            ) from exc

        now = datetime.utcnow()
        target_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        # The model predicts one target date. Do not fabricate a multi-day curve.
        forecast_series = [
            ForecastSeriesPoint(
                date=target_date,
                predictedAqi=predicted_aqi,
                category=category_name,
                confidenceLower=None,
                confidenceUpper=None,
                isForecast=True,
            )
        ]

        return PredictionResponse(
            city=req.city,
            referenceAqi=reference_aqi,
            predictedAqi=predicted_aqi,
            category=category_name,
            trend=trend_dir,
            riskLevel=risk_level,
            horizon="next_day",
            predictionTimestamp=now.isoformat(),
            # No calibrated prediction interval has been implemented.
            confidenceInterval=None,
            # No feature-attribution analysis has been implemented yet.
            featureDrivers=None,
            forecastSeries=forecast_series,
            explanation=(
                f"The trained model predicted an AQI of {predicted_aqi:.2f} "
                f"for {req.city} for {target_date}. "
                f"The supplied reference AQI is {reference_aqi:.2f}. "
                f"{trend_explanation} "
                "This is a model prediction based on supplied inputs, "
                "not a live AQI observation."
            ),
            metadata=ApiResponseMetadata(
                data_source="user_supplied_features",
                model_status="ready",
                model_name=model_name,
                prediction_type="regression",
                is_demo=is_demo,
                timestamp=now.isoformat(),
            ),
        )





# from datetime import datetime, timedelta
# from typing import Dict, Any

# from fastapi import HTTPException
# from sqlalchemy.orm import Session
# from backend.app.models.city import City
# from backend.app.models.prediction_record import PredictionRecord

# from backend.app.core.config import settings
# from backend.app.schemas.prediction import (
#     PredictionRequest,
#     PredictionResponse,
#     ConfidenceInterval,
#     ForecastSeriesPoint,
# )
# from backend.app.schemas.common import ApiResponseMetadata
# from backend.app.services.standards import (
#     get_cpcb_category,
#     get_risk_assessment,
#     determine_trend,
# )
# from backend.app.ml.inference import InferenceEngine


# def build_training_features(city: str, features: dict) -> Dict[str, Any]:
#     """Map API fields to the exact columns used during model training."""

#     return {
#         "AQI": features["aqi"],
#         "PM2.5": features["pm25"],
#         "PM10": features["pm10"],
#         "NO": features["no"],
#         "NO2": features["no2"],
#         "NOx": features["nox"],
#         "NH3": features["nh3"],
#         "CO": features["co"],
#         "SO2": features["so2"],
#         "O3": features["o3"],
#         "Benzene": features["benzene"],
#         "Toluene": features["toluene"],
#         "Xylene": features["xylene"],
#         "temperature_2m": features["temperature"],
#         "relative_humidity_2m": features["humidity"],
#         "wind_speed_10m": features["wind_speed"],
#         "wind_direction_10m_dominant": features["wind_direction"],
#         "precipitation": features["rainfall"],
#         "surface_pressure": features["surface_pressure"],
#         "latitude": features["latitude"],
#         "longitude": features["longitude"],
#         "aqi_lag_1d": features["aqi_lag_1d"],
#         "aqi_lag_3d": features["aqi_lag_3d"],
#         "aqi_lag_7d": features["aqi_lag_7d"],
#         "aqi_rolling_mean_7d": features["aqi_rolling_mean_7d"],
#         "day_of_week": features["day_of_week"],
#         "month": features["month"],
#         "City": city,
#         "season": features["season"],
#     }


# class PredictionService:
#     def __init__(self, db: Session):
#         self.db = db
#         self.inference_engine = InferenceEngine()

#     def predict(self, req: PredictionRequest) -> PredictionResponse:
#         # This model was trained for next-day AQI only.
#         if req.horizon != "next_day":
#             raise HTTPException(
#                 status_code=400,
#                 detail=(
#                     "This model supports next_day predictions only. "
#                     "Three-day and seven-day predictions are not implemented."
#                 ),
#             )

#         # Do not fabricate inputs or silently use demo predictions.
#         # if settings.PREDICTION_MODE != "ml":
#         #     raise HTTPException(
#         #         status_code=503,
#         #         detail=(
#         #             "The trained-model endpoint is not enabled. "
#         #             "Set PREDICTION_MODE=ml after model integration is configured."
#         #         ),
#         #     )
#         mode = str(settings.PREDICTION_MODE).strip().lower()
#         print(f"[DEBUG predict] PREDICTION_MODE={mode!r}")
#         if mode != "ml":
#             raise HTTPException(
#                  status_code=503,
#                  detail=(
#                      "The trained-model endpoint is disabled. "
#                       f"PredictionService reads PREDICTION_MODE={mode!r}."
#                  ),
#             )
#         if req.mode != "advanced" or req.features is None:
#             raise HTTPException(
#                 status_code=400,
#                 detail=(
#                     "Complete model features are required. "
#                     "Automatic historical-data lookup has not been implemented yet."
#                 ),
#             )

#         features = req.features.model_dump()
#         training_features = build_training_features(req.city, features)

#         try:
#             predicted_aqi, model_name, is_demo = (
#                 self.inference_engine.run_regression_inference(
#                     features_dict=training_features,
#                     model_filename="aqi_next_day.joblib",
#                 )
#             )
#         except ValueError as exc:
#             raise HTTPException(status_code=422, detail=str(exc)) from exc

#         # Use the observed AQI provided in the request as the reference.
#         reference_aqi = float(features["aqi"])

#         # category_name, _, _, _ = get_epa_category(predicted_aqi)
#         category_name, _, _, _ = get_cpcb_category(predicted_aqi)
#         risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)

#         trend_dir, _, _, trend_explanation = determine_trend(
#             reference_aqi, predicted_aqi
#         )

#         now = datetime.utcnow()
#         target_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

#         # The model predicts one target date. Do not fabricate a multi-day curve.
#         forecast_series = [
#             ForecastSeriesPoint(
#                 date=target_date,
#                 predictedAqi=predicted_aqi,
#                 category=category_name,
#                 confidenceLower=None,
#                 confidenceUpper=None,
#                 isForecast=True,
#             )
#         ]

#         return PredictionResponse(
#             city=req.city,
#             referenceAqi=reference_aqi,
#             predictedAqi=predicted_aqi,
#             category=category_name,
#             trend=trend_dir,
#             riskLevel=risk_level,
#             horizon="next_day",
#             predictionTimestamp=now.isoformat(),
#             # No calibrated prediction interval has been implemented.
#             confidenceInterval=None,
#             # No feature-attribution analysis has been implemented yet.
#             featureDrivers=None,
#             forecastSeries=forecast_series,
#             explanation=(
#                 f"The trained model predicted an AQI of {predicted_aqi:.2f} "
#                 f"for {req.city} for {target_date}. "
#                 f"The supplied reference AQI is {reference_aqi:.2f}. "
#                 f"{trend_explanation} "
#                 "This is a model prediction based on supplied inputs, "
#                 "not a live AQI observation."
#             ),
#             metadata=ApiResponseMetadata(
#                 data_source="user_supplied_features",
#                 model_status="ready",
#                 model_name=model_name,
#                 prediction_type="regression",
#                 is_demo=is_demo,
#                 timestamp=now.isoformat(),
#             ),
#         )




# # from datetime import datetime, timedelta
# # from typing import Dict, Any, List
# # from sqlalchemy.orm import Session

# # from backend.app.core.config import settings
# # from backend.app.schemas.prediction import (
# #     PredictionRequest,
# #     PredictionResponse,
# #     ConfidenceInterval,
# #     FeatureDriver,
# #     ForecastSeriesPoint
# # )
# # from backend.app.schemas.common import ApiResponseMetadata
# # from backend.app.services.standards import get_epa_category, get_risk_assessment, determine_trend
# # from backend.app.ml.inference import InferenceEngine

# # CITY_BASELINES = {
# #     "Delhi": 185.0,
# #     "Mumbai": 92.0,
# #     "Pune": 78.0,
# #     "Bengaluru": 48.0,
# #     "Chennai": 65.0,
# #     "Hyderabad": 115.0
# # }

# # class PredictionService:
# #     def __init__(self, db: Session):
# #         self.db = db
# #         self.inference_engine = InferenceEngine()

# #     def predict(self, req: PredictionRequest) -> PredictionResponse:
# #         reference_aqi = CITY_BASELINES.get(req.city, 120.0)

# #         # Multipliers based on horizon
# #         horizon_factors = {
# #             "next_day": (1.08, 1),
# #             "next_3_days": (1.14, 3),
# #             "next_7_days": (1.22, 7)
# #         }
# #         factor, days = horizon_factors.get(req.horizon, (1.08, 1))

# #         # Check features if advanced mode
# #         features_dict = {}
# #         if req.mode == "advanced" and req.features:
# #             features_dict = req.features.model_dump(exclude_unset=True)

# #         predicted_val, model_name, is_demo = self.inference_engine.run_regression_inference(
# #             features_dict=features_dict
# #         )

# #         # Scale by horizon
# #         predicted_aqi = round(max(15.0, min(500.0, reference_aqi * factor + (predicted_val - 120.0) * 0.2)), 1)
# #         category_name, color, health_stmt, _ = get_epa_category(predicted_aqi)
# #         risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)
# #         trend_dir, delta, pct, explanation = determine_trend(reference_aqi, predicted_aqi)

# #         now = datetime.utcnow()
# #         forecast_series: List[ForecastSeriesPoint] = []
# #         for i in range(1, days + 1):
# #             step_date = (now + timedelta(days=i)).strftime("%Y-%m-%d")
# #             step_aqi = round(reference_aqi + ((predicted_aqi - reference_aqi) / days) * i, 1)
# #             step_cat, _, _, _ = get_epa_category(step_aqi)
# #             forecast_series.append(ForecastSeriesPoint(
# #                 date=step_date,
# #                 predictedAqi=step_aqi,
# #                 category=step_cat,
# #                 confidenceLower=max(10.0, round(step_aqi - 12.0 - i * 3.0, 1)),
# #                 confidenceUpper=min(500.0, round(step_aqi + 14.0 + i * 4.0, 1)),
# #                 isForecast=True
# #             ))

# #         return PredictionResponse(
# #             city=req.city,
# #             referenceAqi=reference_aqi,
# #             predictedAqi=predicted_aqi,
# #             category=category_name,
# #             trend=trend_dir,
# #             riskLevel=risk_level,
# #             horizon=req.horizon,
# #             predictionTimestamp=now.isoformat(),
# #             confidenceInterval=ConfidenceInterval(
# #                 lower=max(10.0, round(predicted_aqi - (days * 6.0 + 10.0), 1)),
# #                 upper=min(500.0, round(predicted_aqi + (days * 8.0 + 12.0), 1))
# #             ),
# #             featureDrivers=[
# #                 FeatureDriver(feature="PM2.5 (Fine Particulates)", weight=0.42, impact="positive"),
# #                 FeatureDriver(feature="Wind Speed & Dispersion", weight=0.23, impact="negative"),
# #                 FeatureDriver(feature="Ambient Temperature & Inversion", weight=0.16, impact="positive"),
# #                 FeatureDriver(feature="PM10 (Coarse Particulates)", weight=0.12, impact="positive"),
# #                 FeatureDriver(feature="Relative Humidity", weight=0.07, impact="positive"),
# #             ],
# #             forecastSeries=forecast_series,
# #             explanation=f"Based on atmospheric regression simulation, {req.city} AQI is projected to shift from {reference_aqi} to {predicted_aqi} over the {req.horizon.replace('_', ' ')} horizon. {explanation} Health risk evaluated at '{risk_level}'.",
# #             metadata=ApiResponseMetadata(
# #                 data_source="demo" if is_demo else "ml_model",
# #                 model_status="not_trained" if is_demo else "ready",
# #                 model_name=model_name if not is_demo else None,
# #                 prediction_type="demo" if is_demo else "regression",
# #                 is_demo=is_demo,
# #                 timestamp=now.isoformat()
# #             )
# #         )
