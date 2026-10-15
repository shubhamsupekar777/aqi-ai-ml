# from datetime import date, datetime, timedelta
# from functools import lru_cache
# import math
# from pathlib import Path
# from typing import Any, Dict, Optional, Tuple

# import pandas as pd
# from fastapi import HTTPException
# from sqlalchemy import and_, desc
# from sqlalchemy.orm import Session

# from backend.app.core.config import settings
# from backend.app.core.exceptions import ModelUnavailableException
# from backend.app.models.city import City
# from backend.app.models.historical_aqi import HistoricalAQI
# from backend.app.models.pollutant_record import PollutantRecord
# from backend.app.models.prediction_record import PredictionRecord
# from backend.app.models.weather_record import WeatherRecord
# from backend.app.schemas.common import ApiResponseMetadata
# from backend.app.schemas.prediction import (
#     ForecastSeriesPoint,
#     PredictionRequest,
#     PredictionResponse,
# )
# from backend.app.services.standards import (
#     determine_trend,
#     get_cpcb_category,
#     get_risk_assessment,
# )
# from backend.app.ml.inference import InferenceEngine


# # The original merged dataset contains a few columns that the database importer
# # may not yet store (for example, wind direction, pressure, latitude and
# # longitude). Use it only as a fallback for the exact city/date row. PostgreSQL
# # remains the primary source for AQI, pollutants, weather and the reference AQI.
# FEATURE_SOURCE_PATH = (
#     Path(__file__).resolve().parents[1] / "data" / "aqi_complete_dataset.csv"
# )


# @lru_cache(maxsize=1)
# def _load_feature_source() -> Optional[pd.DataFrame]:
#     """Load the matching source dataset once; return None if it is not present."""
#     if not FEATURE_SOURCE_PATH.is_file():
#         return None

#     try:
#         frame = pd.read_csv(FEATURE_SOURCE_PATH)
#     except Exception:
#         return None

#     if "City" not in frame.columns or "Date" not in frame.columns:
#         return None

#     frame["_city_key"] = frame["City"].astype(str).str.strip().str.casefold()
#     frame["_date_key"] = pd.to_datetime(
#         frame["Date"], errors="coerce"
#     ).dt.strftime("%Y-%m-%d")
#     return frame


# def _source_row_for(city_name: str, observation_date: str) -> Optional[Dict[str, Any]]:
#     """Return the source-dataset row for the same city and observation date."""
#     frame = _load_feature_source()
#     if frame is None:
#         return None

#     matches = frame.loc[
#         (frame["_city_key"] == city_name.strip().casefold())
#         & (frame["_date_key"] == observation_date)
#     ]
#     if matches.empty:
#         return None

#     # Convert pandas/numpy scalar values into normal Python values where possible.
#     result = matches.iloc[-1].to_dict()
#     return result


# def _is_present(value: Any) -> bool:
#     """True only for non-null, finite numeric values or non-empty text."""
#     if value is None:
#         return False
#     try:
#         if pd.isna(value):
#             return False
#     except (TypeError, ValueError):
#         pass

#     if isinstance(value, str):
#         return bool(value.strip())

#     if isinstance(value, (int, float)):
#         return math.isfinite(float(value))

#     return True


# def _number_or_none(value: Any) -> Optional[float]:
#     if not _is_present(value):
#         return None
#     try:
#         number = float(value)
#     except (TypeError, ValueError):
#         return None
#     return number if math.isfinite(number) else None


# def _value_or_source(
#     database_value: Any,
#     source_row: Optional[Dict[str, Any]],
#     source_column: str,
# ) -> Tuple[Any, bool]:
#     """Prefer PostgreSQL's value; use the matching CSV row only if it is null."""
#     if _is_present(database_value):
#         return database_value, False

#     if source_row is not None:
#         fallback = source_row.get(source_column)
#         if _is_present(fallback):
#             return fallback, True

#     return None, False


# def _season_for_month(month: int) -> str:
#     """Fallback seasonal grouping; a source-dataset label is preferred when present."""
#     if month in (12, 1, 2):
#         return "Winter"
#     if month in (3, 4, 5):
#         return "Summer"
#     if month in (6, 7, 8, 9):
#         return "Monsoon"
#     return "Post-Monsoon"


# def build_training_features(city: str, features: Dict[str, Any]) -> Dict[str, Any]:
#     """Map service feature names to the exact columns expected by the trained model."""
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
#         "day_of_week": features["day_of_week"],
#         "month": features["month"],
#         "aqi_lag_1d": features["aqi_lag_1d"],
#         "aqi_lag_3d": features["aqi_lag_3d"],
#         "aqi_lag_7d": features["aqi_lag_7d"],
#         "aqi_rolling_mean_7d": features["aqi_rolling_mean_7d"],
#         "City": city,
#         "season": features["season"],
#     }


# class PredictionService:
#     def __init__(self, db: Session):
#         self.db = db
#         self.inference_engine = InferenceEngine()

#     def _get_city(self, city_name: str) -> City:
#         clean_name = city_name.strip()
#         if not clean_name:
#             raise HTTPException(status_code=422, detail="City name cannot be empty.")

#         city = self.db.query(City).filter(City.name.ilike(clean_name)).first()
#         if city is None:
#             raise HTTPException(
#                 status_code=404,
#                 detail=(
#                     f"City '{clean_name}' was not found in PostgreSQL. "
#                     "Choose a city returned by GET /api/v1/cities."
#                 ),
#             )
#         return city

#     def _get_latest_history(self, city: City):
#         """Fetch the latest eight city observations with linked pollutant/weather rows."""
#         rows = (
#             self.db.query(HistoricalAQI, PollutantRecord, WeatherRecord)
#             .outerjoin(
#                 PollutantRecord,
#                 PollutantRecord.historical_aqi_id == HistoricalAQI.id,
#             )
#             .outerjoin(
#                 WeatherRecord,
#                 and_(
#                     WeatherRecord.city_id == HistoricalAQI.city_id,
#                     WeatherRecord.observation_date == HistoricalAQI.observation_date,
#                 ),
#             )
#             .filter(HistoricalAQI.city_id == city.id)
#             .order_by(desc(HistoricalAQI.observation_date))
#             .limit(8)
#             .all()
#         )

#         if not rows:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"No historical AQI observations are stored for {city.name}.",
#             )

#         if len(rows) < 8:
#             raise HTTPException(
#                 status_code=422,
#                 detail=(
#                     f"At least 8 historical AQI observations are required to create "
#                     f"the model's lag features for {city.name}; found {len(rows)}."
#                 ),
#             )

#         return rows  # newest observation first

#     def _build_database_features(
#         self,
#         city: City,
#         history_rows,
#     ) -> Tuple[Dict[str, Any], str, bool]:
#         """Build model inputs using PostgreSQL, with same-row CSV fallback if needed."""
#         latest_record, pollutant, weather = history_rows[0]
#         observed_date = latest_record.observation_date

#         try:
#             observed_day = datetime.strptime(observed_date, "%Y-%m-%d").date()
#         except ValueError as exc:
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"Invalid stored observation date for {city.name}: {observed_date!r}.",
#             ) from exc

#         source_row = _source_row_for(city.name, observed_date)
#         used_source_fallback = False

#         def choose(db_value: Any, source_column: str) -> Any:
#             nonlocal used_source_fallback
#             selected, used_fallback = _value_or_source(db_value, source_row, source_column)
#             used_source_fallback = used_source_fallback or used_fallback
#             return selected

#         pollutant_values = {
#             "pm25": choose(pollutant.pm25 if pollutant else None, "PM2.5"),
#             "pm10": choose(pollutant.pm10 if pollutant else None, "PM10"),
#             "no": choose(pollutant.no if pollutant else None, "NO"),
#             "no2": choose(pollutant.no2 if pollutant else None, "NO2"),
#             "nox": choose(pollutant.nox if pollutant else None, "NOx"),
#             "nh3": choose(pollutant.nh3 if pollutant else None, "NH3"),
#             "co": choose(pollutant.co if pollutant else None, "CO"),
#             "so2": choose(pollutant.so2 if pollutant else None, "SO2"),
#             "o3": choose(pollutant.o3 if pollutant else None, "O3"),
#             "benzene": choose(pollutant.benzene if pollutant else None, "Benzene"),
#             "toluene": choose(pollutant.toluene if pollutant else None, "Toluene"),
#             "xylene": choose(pollutant.xylene if pollutant else None, "Xylene"),
#         }

#         weather_values = {
#             "temperature": choose(weather.temperature if weather else None, "temperature_2m"),
#             "humidity": choose(
#                 weather.relative_humidity if weather else None,
#                 "relative_humidity_2m",
#             ),
#             "wind_speed": choose(weather.wind_speed if weather else None, "wind_speed_10m"),
#             "wind_direction": choose(
#                 weather.wind_direction if weather else None,
#                 "wind_direction_10m_dominant",
#             ),
#             "rainfall": choose(
#                 weather.precipitation if weather else None,
#                 "precipitation",
#             ),
#             "surface_pressure": choose(
#                 weather.surface_pressure if weather else None,
#                 "surface_pressure",
#             ),
#         }

#         latitude = choose(city.latitude, "latitude")
#         longitude = choose(city.longitude, "longitude")

#         # Prefer the source row's precomputed lag values when it exists so inference
#         # follows the same feature engineering used for model training. If the source
#         # row is unavailable, calculate lags from the most recent stored observations.
#         newest_first_aqi = [float(row[0].aqi) for row in history_rows]
#         source_lag_columns = {
#             "aqi_lag_1d": "aqi_lag_1d",
#             "aqi_lag_3d": "aqi_lag_3d",
#             "aqi_lag_7d": "aqi_lag_7d",
#             "aqi_rolling_mean_7d": "aqi_rolling_mean_7d",
#         }
#         lag_features: Dict[str, Any] = {}
#         for feature_name, source_column in source_lag_columns.items():
#             source_value = source_row.get(source_column) if source_row else None
#             if _is_present(source_value):
#                 lag_features[feature_name] = source_value
#                 used_source_fallback = True
#             elif feature_name == "aqi_lag_1d":
#                 lag_features[feature_name] = newest_first_aqi[1]
#             elif feature_name == "aqi_lag_3d":
#                 lag_features[feature_name] = newest_first_aqi[3]
#             elif feature_name == "aqi_lag_7d":
#                 lag_features[feature_name] = newest_first_aqi[7]
#             else:
#                 lag_features[feature_name] = sum(newest_first_aqi[:7]) / 7.0

#         source_day = source_row.get("day_of_week") if source_row else None
#         source_month = source_row.get("month") if source_row else None
#         source_season = source_row.get("season") if source_row else None

#         if _is_present(source_day):
#             day_of_week = int(source_day)
#             used_source_fallback = True
#         else:
#             day_of_week = observed_day.weekday()

#         if _is_present(source_month):
#             month = int(source_month)
#             used_source_fallback = True
#         else:
#             month = observed_day.month

#         if _is_present(source_season):
#             season = str(source_season).strip()
#             used_source_fallback = True
#         else:
#             season = _season_for_month(month)

#         features: Dict[str, Any] = {
#             "aqi": float(latest_record.aqi),
#             **pollutant_values,
#             **weather_values,
#             "latitude": latitude,
#             "longitude": longitude,
#             **lag_features,
#             "day_of_week": day_of_week,
#             "month": month,
#             "season": season,
#         }

#         # Convert numeric fields from DB/CSV values to finite Python floats. Never
#         # silently substitute random or made-up values for required model inputs.
#         numeric_keys = [
#             "aqi", "pm25", "pm10", "no", "no2", "nox", "nh3", "co", "so2",
#             "o3", "benzene", "toluene", "xylene", "temperature", "humidity",
#             "wind_speed", "wind_direction", "rainfall", "surface_pressure", "latitude",
#             "longitude", "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d", "aqi_rolling_mean_7d",
#         ]
#         for key in numeric_keys:
#             features[key] = _number_or_none(features.get(key))

#         target_date = (observed_day + timedelta(days=1)).strftime("%Y-%m-%d")
#         return features, target_date, used_source_fallback

#     def predict(self, req: PredictionRequest) -> PredictionResponse:
#         # The deployed artifact was trained only for the next-day target.
#         if req.horizon != "next_day":
#             raise HTTPException(
#                 status_code=400,
#                 detail=(
#                     "This trained model supports next_day predictions only. "
#                     "Three-day and seven-day predictions are not implemented."
#                 ),
#             )

#         mode = str(settings.PREDICTION_MODE).strip().lower()
#         if mode != "ml":
#             raise HTTPException(
#                 status_code=503,
#                 detail=(
#                     "The trained-model endpoint is disabled. "
#                     f"PredictionService reads PREDICTION_MODE={mode!r}; set it to 'ml'."
#                 ),
#             )

#         city = self._get_city(req.city)
#         history_rows = self._get_latest_history(city)
#         features, target_date, used_dataset_fallback = self._build_database_features(
#             city,
#             history_rows,
#         )

#         # In Advanced Mode, only explicitly provided values override the historical
#         # baseline. Missing optional fields keep their database/source-row values.
#         if req.mode == "advanced" and req.features is not None:
#             provided_overrides = req.features.model_dump(exclude_none=True)
#             for key, value in provided_overrides.items():
#                 if key in features and value is not None:
#                     features[key] = value

#         training_features = build_training_features(city.name, features)

#         expected_numeric_features = [
#             "AQI", "PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2",
#             "O3", "Benzene", "Toluene", "Xylene", "temperature_2m",
#             "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m_dominant",
#             "precipitation", "surface_pressure", "latitude", "longitude", "day_of_week",
#             "month", "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d", "aqi_rolling_mean_7d",
#         ]
#         missing_features = [
#             key
#             for key in expected_numeric_features
#             if _number_or_none(training_features.get(key)) is None
#         ]
#         if not _is_present(training_features.get("City")) or not _is_present(
#             training_features.get("season")
#         ):
#             missing_features.append("City/season")

#         if missing_features:
#             raise HTTPException(
#                 status_code=422,
#                 detail=(
#                     "The model cannot predict because these required features are missing "
#                     "from PostgreSQL and the matching data row: "
#                     + ", ".join(missing_features)
#                     + ". Check backend/app/data/aqi_complete_dataset.csv or update and rerun "
#                     "the historical-data importer so these fields are stored."
#                 ),
#             )

#         try:
#             predicted_aqi, model_name, is_demo = (
#                 self.inference_engine.run_regression_inference(
#                     features_dict=training_features,
#                     model_filename="aqi_next_day.joblib",
#                 )
#             )
#         except ModelUnavailableException as exc:
#             raise HTTPException(status_code=503, detail=str(exc)) from exc
#         except ValueError as exc:
#             raise HTTPException(status_code=422, detail=str(exc)) from exc

#         reference_aqi = float(features["aqi"])
#         category_name, _, _, _ = get_cpcb_category(predicted_aqi)
#         risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)
#         trend_dir, _, _, trend_explanation = determine_trend(reference_aqi, predicted_aqi)

#         # Save only a successfully generated model prediction to PostgreSQL.
#         try:
#             prediction_record = PredictionRecord(
#                 city_id=city.id,
#                 reference_aqi=reference_aqi,
#                 predicted_aqi=predicted_aqi,
#                 prediction_horizon="next_day",
#                 prediction_type="regression",
#                 model_name=model_name,
#                 is_demo=bool(is_demo),
#             )
#             self.db.add(prediction_record)
#             self.db.commit()
#         except Exception as exc:
#             self.db.rollback()
#             raise HTTPException(
#                 status_code=500,
#                 detail=(
#                     "The prediction was generated, but saving it to PostgreSQL failed. "
#                     "Check the backend logs."
#                 ),
#             ) from exc

#         now = datetime.utcnow()
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

#         if req.mode == "advanced":
#             input_description = (
#                 "historical database features with the explicitly supplied advanced overrides"
#             )
#             data_source = "historical_database_with_advanced_overrides"
#         else:
#             input_description = "historical database features"
#             data_source = "historical_database"

#         if used_dataset_fallback:
#             data_source += "_and_training_dataset"
#             input_description += (
#                 "; engineered lag/calendar values followed the training dataset, and any missing database fields were supplemented from its matching city/date row"
#             )

#         explanation = (
#             f"The trained model predicted an AQI of {predicted_aqi:.2f} for {city.name} "
#             f"for {target_date}. The latest stored AQI observation is {reference_aqi:.2f} "
#             f"dated {history_rows[0][0].observation_date}. {trend_explanation} "
#             f"Inputs were built from {input_description}. This is a next-observation "
#             "model prediction based on historical data, not a live AQI reading."
#         )

#         return PredictionResponse(
#             city=city.name,
#             referenceAqi=round(reference_aqi, 2),
#             predictedAqi=predicted_aqi,
#             category=category_name,
#             trend=trend_dir,
#             riskLevel=risk_level,
#             horizon="next_day",
#             predictionTimestamp=now.isoformat(),
#             confidenceInterval=None,
#             featureDrivers=None,
#             forecastSeries=forecast_series,
#             explanation=explanation,
#             metadata=ApiResponseMetadata(
#                 data_source=data_source,
#                 model_status="ready",
#                 model_name=model_name,
#                 prediction_type="regression",
#                 is_demo=bool(is_demo),
#                 timestamp=now.isoformat(),
#             ),
#         )


from datetime import date, datetime, timedelta
from functools import lru_cache
import math
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import ModelUnavailableException
from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.prediction_record import PredictionRecord
from backend.app.models.weather_record import WeatherRecord
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.schemas.prediction import (
    ForecastSeriesPoint,
    PredictionRequest,
    PredictionResponse,
)
from backend.app.services.standards import (
    determine_trend,
    get_cpcb_category,
    get_risk_assessment,
)
from backend.app.ml.inference import InferenceEngine


# The original merged dataset contains a few columns that the database importer
# may not yet store (for example, wind direction, pressure, latitude and
# longitude). Use it only as a fallback for the exact city/date row. PostgreSQL
# remains the primary source for AQI, pollutants, weather and the reference AQI.
FEATURE_SOURCE_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "aqi_complete_dataset.csv"
)


@lru_cache(maxsize=1)
def _load_feature_source() -> Optional[pd.DataFrame]:
    """Load the matching source dataset once; return None if it is not present."""
    if not FEATURE_SOURCE_PATH.is_file():
        return None

    try:
        frame = pd.read_csv(FEATURE_SOURCE_PATH)
    except Exception:
        return None

    if "City" not in frame.columns or "Date" not in frame.columns:
        return None

    frame["_city_key"] = frame["City"].astype(str).str.strip().str.casefold()
    frame["_date_key"] = pd.to_datetime(
        frame["Date"], errors="coerce"
    ).dt.strftime("%Y-%m-%d")
    return frame


def _source_row_for(city_name: str, observation_date: str) -> Optional[Dict[str, Any]]:
    """Return the source-dataset row for the same city and observation date."""
    frame = _load_feature_source()
    if frame is None:
        return None

    matches = frame.loc[
        (frame["_city_key"] == city_name.strip().casefold())
        & (frame["_date_key"] == observation_date)
    ]
    if matches.empty:
        return None

    # Convert pandas/numpy scalar values into normal Python values where possible.
    result = matches.iloc[-1].to_dict()
    return result


def _is_present(value: Any) -> bool:
    """True only for non-null, finite numeric values or non-empty text."""
    if value is None:
        return False
    try:
        if pd.isna(value):
            return False
    except (TypeError, ValueError):
        pass

    if isinstance(value, str):
        return bool(value.strip())

    if isinstance(value, (int, float)):
        return math.isfinite(float(value))

    return True


def _number_or_none(value: Any) -> Optional[float]:
    if not _is_present(value):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _value_or_source(
    database_value: Any,
    source_row: Optional[Dict[str, Any]],
    source_column: str,
) -> Tuple[Any, bool]:
    """Prefer PostgreSQL's value; use the matching CSV row only if it is null."""
    if _is_present(database_value):
        return database_value, False

    if source_row is not None:
        fallback = source_row.get(source_column)
        if _is_present(fallback):
            return fallback, True

    return None, False


def _season_for_month(month: int) -> str:
    """Fallback seasonal grouping; a source-dataset label is preferred when present."""
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Summer"
    if month in (6, 7, 8, 9):
        return "Monsoon"
    return "Post-Monsoon"


def build_training_features(city: str, features: Dict[str, Any]) -> Dict[str, Any]:
    """Map service feature names to the exact columns expected by the trained model."""
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
        "day_of_week": features["day_of_week"],
        "month": features["month"],
        "aqi_lag_1d": features["aqi_lag_1d"],
        "aqi_lag_3d": features["aqi_lag_3d"],
        "aqi_lag_7d": features["aqi_lag_7d"],
        "aqi_rolling_mean_7d": features["aqi_rolling_mean_7d"],
        "City": city,
        "season": features["season"],
    }


class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.inference_engine = InferenceEngine()

    def _get_city(self, city_name: str) -> City:
        clean_name = city_name.strip()
        if not clean_name:
            raise HTTPException(status_code=422, detail="City name cannot be empty.")

        city = self.db.query(City).filter(City.name.ilike(clean_name)).first()
        if city is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"City '{clean_name}' was not found in PostgreSQL. "
                    "Choose a city returned by GET /api/v1/cities."
                ),
            )
        return city

    def _get_latest_history(self, city: City):
        """Fetch the latest eight city observations with linked pollutant/weather rows."""
        rows = (
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
            .limit(8)
            .all()
        )

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No historical AQI observations are stored for {city.name}.",
            )

        if len(rows) < 8:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"At least 8 historical AQI observations are required to create "
                    f"the model's lag features for {city.name}; found {len(rows)}."
                ),
            )

        return rows  # newest observation first

    def _build_database_features(
        self,
        city: City,
        history_rows,
    ) -> Tuple[Dict[str, Any], str, bool]:
        """Build model inputs using PostgreSQL, with same-row CSV fallback if needed."""
        latest_record, pollutant, weather = history_rows[0]
        observed_date = latest_record.observation_date

        try:
            observed_day = datetime.strptime(observed_date, "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid stored observation date for {city.name}: {observed_date!r}.",
            ) from exc

        source_row = _source_row_for(city.name, observed_date)
        used_source_fallback = False

        def choose(db_value: Any, source_column: str) -> Any:
            nonlocal used_source_fallback
            selected, used_fallback = _value_or_source(db_value, source_row, source_column)
            used_source_fallback = used_source_fallback or used_fallback
            return selected

        pollutant_values = {
            "pm25": choose(pollutant.pm25 if pollutant else None, "PM2.5"),
            "pm10": choose(pollutant.pm10 if pollutant else None, "PM10"),
            "no": choose(pollutant.no if pollutant else None, "NO"),
            "no2": choose(pollutant.no2 if pollutant else None, "NO2"),
            "nox": choose(pollutant.nox if pollutant else None, "NOx"),
            "nh3": choose(pollutant.nh3 if pollutant else None, "NH3"),
            "co": choose(pollutant.co if pollutant else None, "CO"),
            "so2": choose(pollutant.so2 if pollutant else None, "SO2"),
            "o3": choose(pollutant.o3 if pollutant else None, "O3"),
            "benzene": choose(pollutant.benzene if pollutant else None, "Benzene"),
            "toluene": choose(pollutant.toluene if pollutant else None, "Toluene"),
            "xylene": choose(pollutant.xylene if pollutant else None, "Xylene"),
        }

        weather_values = {
            "temperature": choose(weather.temperature if weather else None, "temperature_2m"),
            "humidity": choose(
                weather.relative_humidity if weather else None,
                "relative_humidity_2m",
            ),
            "wind_speed": choose(weather.wind_speed if weather else None, "wind_speed_10m"),
            "wind_direction": choose(
                weather.wind_direction if weather else None,
                "wind_direction_10m_dominant",
            ),
            "rainfall": choose(
                weather.precipitation if weather else None,
                "precipitation",
            ),
            "surface_pressure": choose(
                weather.surface_pressure if weather else None,
                "surface_pressure",
            ),
        }

        latitude = choose(city.latitude, "latitude")
        longitude = choose(city.longitude, "longitude")

        # Prefer the source row's precomputed lag values when it exists so inference
        # follows the same feature engineering used for model training. If the source
        # row is unavailable, calculate lags from the most recent stored observations.
        newest_first_aqi = [float(row[0].aqi) for row in history_rows]
        source_lag_columns = {
            "aqi_lag_1d": "aqi_lag_1d",
            "aqi_lag_3d": "aqi_lag_3d",
            "aqi_lag_7d": "aqi_lag_7d",
            "aqi_rolling_mean_7d": "aqi_rolling_mean_7d",
        }
        lag_features: Dict[str, Any] = {}
        for feature_name, source_column in source_lag_columns.items():
            source_value = source_row.get(source_column) if source_row else None
            if _is_present(source_value):
                lag_features[feature_name] = source_value
                used_source_fallback = True
            elif feature_name == "aqi_lag_1d":
                lag_features[feature_name] = newest_first_aqi[1]
            elif feature_name == "aqi_lag_3d":
                lag_features[feature_name] = newest_first_aqi[3]
            elif feature_name == "aqi_lag_7d":
                lag_features[feature_name] = newest_first_aqi[7]
            else:
                lag_features[feature_name] = sum(newest_first_aqi[:7]) / 7.0

        source_day = source_row.get("day_of_week") if source_row else None
        source_month = source_row.get("month") if source_row else None
        source_season = source_row.get("season") if source_row else None

        if _is_present(source_day):
            day_of_week = int(source_day)
            used_source_fallback = True
        else:
            day_of_week = observed_day.weekday()

        if _is_present(source_month):
            month = int(source_month)
            used_source_fallback = True
        else:
            month = observed_day.month

        if _is_present(source_season):
            season = str(source_season).strip()
            used_source_fallback = True
        else:
            season = _season_for_month(month)

        features: Dict[str, Any] = {
            "aqi": float(latest_record.aqi),
            **pollutant_values,
            **weather_values,
            "latitude": latitude,
            "longitude": longitude,
            **lag_features,
            "day_of_week": day_of_week,
            "month": month,
            "season": season,
        }

        # Convert numeric fields from DB/CSV values to finite Python floats. Never
        # silently substitute random or made-up values for required model inputs.
        numeric_keys = [
            "aqi", "pm25", "pm10", "no", "no2", "nox", "nh3", "co", "so2",
            "o3", "benzene", "toluene", "xylene", "temperature", "humidity",
            "wind_speed", "wind_direction", "rainfall", "surface_pressure", "latitude",
            "longitude", "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d", "aqi_rolling_mean_7d",
        ]
        for key in numeric_keys:
            features[key] = _number_or_none(features.get(key))

        target_date = (observed_day + timedelta(days=1)).strftime("%Y-%m-%d")
        return features, target_date, used_source_fallback

    def get_feature_defaults(self, city_name: str) -> Dict[str, Any]:
        """Return editable UI defaults from the latest stored city observation.

        PostgreSQL is the primary source. When a database field is missing, the
        same-city/same-date row from the training dataset may supplement it, just
        as it does for prediction inference. This method does not create a
        prediction or write to the database.
        """
        city = self._get_city(city_name)
        history_rows = self._get_latest_history(city)
        features, _target_date, used_dataset_fallback = self._build_database_features(
            city,
            history_rows,
        )

        visible_features = {
            "pm25": features.get("pm25"),
            "pm10": features.get("pm10"),
            "no2": features.get("no2"),
            "so2": features.get("so2"),
            "co": features.get("co"),
            "o3": features.get("o3"),
            "temperature": features.get("temperature"),
            "humidity": features.get("humidity"),
            "windSpeed": features.get("wind_speed"),
            "rainfall": features.get("rainfall"),
        }

        # Keep API values JSON-safe and explicitly represent missing observations
        # as null so the frontend can leave those inputs empty.
        for key, value in visible_features.items():
            visible_features[key] = _number_or_none(value)

        return {
            "city": city.name,
            "observationDate": history_rows[0][0].observation_date,
            "source": (
                "historical_database_and_training_dataset"
                if used_dataset_fallback
                else "historical_database"
            ),
            "features": visible_features,
        }

    def predict(self, req: PredictionRequest) -> PredictionResponse:
        # The deployed artifact was trained only for the next-day target.
        if req.horizon != "next_day":
            raise HTTPException(
                status_code=400,
                detail=(
                    "This trained model supports next_day predictions only. "
                    "Three-day and seven-day predictions are not implemented."
                ),
            )

        mode = str(settings.PREDICTION_MODE).strip().lower()
        if mode != "ml":
            raise HTTPException(
                status_code=503,
                detail=(
                    "The trained-model endpoint is disabled. "
                    f"PredictionService reads PREDICTION_MODE={mode!r}; set it to 'ml'."
                ),
            )

        city = self._get_city(req.city)
        history_rows = self._get_latest_history(city)
        features, target_date, used_dataset_fallback = self._build_database_features(
            city,
            history_rows,
        )

        # In Advanced Mode, only explicitly provided values override the historical
        # baseline. Missing optional fields keep their database/source-row values.
        if req.mode == "advanced" and req.features is not None:
            provided_overrides = req.features.model_dump(exclude_none=True)
            for key, value in provided_overrides.items():
                if key in features and value is not None:
                    features[key] = value

        training_features = build_training_features(city.name, features)

        expected_numeric_features = [
            "AQI", "PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2",
            "O3", "Benzene", "Toluene", "Xylene", "temperature_2m",
            "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m_dominant",
            "precipitation", "surface_pressure", "latitude", "longitude", "day_of_week",
            "month", "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d", "aqi_rolling_mean_7d",
        ]
        missing_features = [
            key
            for key in expected_numeric_features
            if _number_or_none(training_features.get(key)) is None
        ]
        if not _is_present(training_features.get("City")) or not _is_present(
            training_features.get("season")
        ):
            missing_features.append("City/season")

        if missing_features:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The model cannot predict because these required features are missing "
                    "from PostgreSQL and the matching data row: "
                    + ", ".join(missing_features)
                    + ". Check backend/app/data/aqi_complete_dataset.csv or update and rerun "
                    "the historical-data importer so these fields are stored."
                ),
            )

        try:
            predicted_aqi, model_name, is_demo = (
                self.inference_engine.run_regression_inference(
                    features_dict=training_features,
                    model_filename="aqi_next_day.joblib",
                )
            )
        except ModelUnavailableException as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        reference_aqi = float(features["aqi"])
        category_name, _, _, _ = get_cpcb_category(predicted_aqi)
        risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)
        trend_dir, _, _, trend_explanation = determine_trend(reference_aqi, predicted_aqi)

        # Save only a successfully generated model prediction to PostgreSQL.
        try:
            prediction_record = PredictionRecord(
                city_id=city.id,
                reference_aqi=reference_aqi,
                predicted_aqi=predicted_aqi,
                prediction_horizon="next_day",
                prediction_type="regression",
                model_name=model_name,
                is_demo=bool(is_demo),
            )
            self.db.add(prediction_record)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=(
                    "The prediction was generated, but saving it to PostgreSQL failed. "
                    "Check the backend logs."
                ),
            ) from exc

        now = datetime.utcnow()
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

        if req.mode == "advanced":
            input_description = (
                "historical database features with the explicitly supplied advanced overrides"
            )
            data_source = "historical_database_with_advanced_overrides"
        else:
            input_description = "historical database features"
            data_source = "historical_database"

        if used_dataset_fallback:
            data_source += "_and_training_dataset"
            input_description += (
                "; engineered lag/calendar values followed the training dataset, and any missing database fields were supplemented from its matching city/date row"
            )

        explanation = (
            f"The trained model predicted an AQI of {predicted_aqi:.2f} for {city.name} "
            f"for {target_date}. The latest stored AQI observation is {reference_aqi:.2f} "
            f"dated {history_rows[0][0].observation_date}. {trend_explanation} "
            f"Inputs were built from {input_description}. This is a next-observation "
            "model prediction based on historical data, not a live AQI reading."
        )

        return PredictionResponse(
            city=city.name,
            referenceAqi=round(reference_aqi, 2),
            predictedAqi=predicted_aqi,
            category=category_name,
            trend=trend_dir,
            riskLevel=risk_level,
            horizon="next_day",
            predictionTimestamp=now.isoformat(),
            confidenceInterval=None,
            featureDrivers=None,
            forecastSeries=forecast_series,
            explanation=explanation,
            metadata=ApiResponseMetadata(
                data_source=data_source,
                model_status="ready",
                model_name=model_name,
                prediction_type="regression",
                is_demo=bool(is_demo),
                timestamp=now.isoformat(),
            ),
        )




# from datetime import datetime, timedelta
# from typing import Any, Dict

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

#         mode = str(settings.PREDICTION_MODE).strip().lower()
#         print(f"[DEBUG predict] PREDICTION_MODE={mode!r}")

#         if mode != "ml":
#             raise HTTPException(
#                 status_code=503,
#                 detail=(
#                     "The trained-model endpoint is disabled. "
#                     f"PredictionService reads PREDICTION_MODE={mode!r}."
#                 ),
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

#         # Use CPCB categories for the India-focused dashboard.
#         category_name, _, _, _ = get_cpcb_category(predicted_aqi)
#         risk_level, _, _, _, _ = get_risk_assessment(predicted_aqi)

#         trend_dir, _, _, trend_explanation = determine_trend(
#             reference_aqi, predicted_aqi
#         )

#         # Save the successful ML prediction to PostgreSQL.
#         try:
#             city_name = req.city.strip()
#             if not city_name:
#                 raise ValueError("City name cannot be empty.")

#             city_record = (
#                 self.db.query(City)
#                 .filter(City.name.ilike(city_name))
#                 .first()
#             )

#             # Create the city if it does not exist yet.
#             if city_record is None:
#                 city_record = City(
#                     name=city_name,
#                     country="India",
#                 )
#                 self.db.add(city_record)
#                 self.db.flush()

#             prediction_record = PredictionRecord(
#                 city_id=city_record.id,
#                 reference_aqi=reference_aqi,
#                 predicted_aqi=predicted_aqi,
#                 prediction_horizon=req.horizon,
#                 prediction_type="regression",
#                 model_name=model_name,
#                 is_demo=is_demo,
#             )

#             self.db.add(prediction_record)
#             self.db.commit()

#         except Exception as exc:
#             self.db.rollback()
#             raise HTTPException(
#                 status_code=500,
#                 detail=(
#                     "The prediction was generated, but saving it to "
#                     "PostgreSQL failed. Check the backend logs."
#                 ),
#             ) from exc

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
