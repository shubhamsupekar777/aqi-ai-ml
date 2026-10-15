
"""Model registry built from the AQI AI project's actual local artifacts.

This service deliberately does not synthesize model-comparison points or
placeholder MAE/RMSE/R² values. Classification/trend metrics are read from the
JSON reports created by the training scripts; the regression training script
currently prints its holdout metrics rather than saving a report, so the most
recent verified run's metrics are used only when its artifact is present and no
metrics JSON exists.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.schemas.common import ApiResponseMetadata
from backend.app.schemas.model import (
    ModelMetricSchema,
    ModelPerformanceResponse,
    ModelRegistrySchema,
)

MODEL_DIR = Path(__file__).resolve().parents[1] / "ml" / "models"

REGRESSION_ARTIFACT = "aqi_next_day.joblib"
CLASSIFICATION_ARTIFACT = "aqi_classification.joblib"
TREND_ARTIFACT = "aqi_trend_classifier_v2.joblib"

# Actual chronological holdout results from the trained aqi_next_day.joblib
# run in this project (not simulated benchmark targets). If that training is
# rerun, prefer aqi_regression_metrics.json when present.
REGRESSION_VERIFIED_FALLBACK = {"mae": 16.107, "rmse": 24.818, "r2": 0.8976}

# Fallbacks are the reported evaluation results from the project's trained
# artifacts. Saved metric reports take precedence whenever present.
CLASSIFICATION_VERIFIED_FALLBACK = {
    "accuracy": 0.8135,
    "macro_precision": 0.8149,
    "macro_recall": 0.7602,
    "macro_f1": 0.7757,
}
TREND_VERIFIED_FALLBACK = {
    "accuracy": 0.5323,
    "balanced_accuracy": 0.4920,
    "macro_precision": None,
    "macro_recall": None,
    "macro_f1": 0.4861,
    "stable_recall": 0.23,
}


def _read_json(path: Path) -> Dict[str, Any]:
    """Read a metrics JSON without breaking the registry if it is absent/bad."""
    try:
        if not path.is_file():
            return {}
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
        return value if isinstance(value, dict) else {}
    except (OSError, json.JSONDecodeError, TypeError):
        return {}


def _first_number(data: Dict[str, Any], *keys: str) -> Optional[float]:
    for key in keys:
        value = data.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _artifact_time(path: Path) -> Optional[str]:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    except OSError:
        return None


def _registered_model(
    *,
    model_id: str,
    name: str,
    version: str,
    task_type: str,
    algorithm: str,
    framework: str,
    artifact_filename: Optional[str],
    description: str,
    always_ready: bool = False,
) -> ModelRegistrySchema:
    artifact = MODEL_DIR / artifact_filename if artifact_filename else None
    exists = artifact.is_file() if artifact else False
    ready = always_ready or exists
    return ModelRegistrySchema(
        id=model_id,
        name=name,
        version=version,
        taskType=task_type,
        algorithm=algorithm,
        framework=framework,
        status="ready" if ready else "not_trained",
        isTrained=exists,
        artifactPath=(str(artifact.relative_to(MODEL_DIR.parents[3])) if exists and artifact else None),
        description=description,
        lastTrained=_artifact_time(artifact) if exists and artifact else None,
    )


class ModelService:
    def __init__(self, db: Session):
        # Kept for API dependency consistency. This registry reads the model
        # artifacts/reports rather than adding fictional rows to the database.
        self.db = db

    def get_performance(self) -> ModelPerformanceResponse:
        regression_artifact = MODEL_DIR / REGRESSION_ARTIFACT
        classification_artifact = MODEL_DIR / CLASSIFICATION_ARTIFACT
        trend_artifact = MODEL_DIR / TREND_ARTIFACT
        regression_exists = regression_artifact.is_file()
        classification_exists = classification_artifact.is_file()
        trend_exists = trend_artifact.is_file()

        models = [
            _registered_model(
                model_id="aqi-regression-next-day",
                name="RandomForestRegressor_AQI_NextDay",
                version="1.0.0",
                task_type="regression",
                algorithm="Random Forest",
                framework="scikit-learn",
                artifact_filename=REGRESSION_ARTIFACT,
                description=(
                    "Trained next-day numerical AQI regressor using pollutant, weather, "
                    "calendar, location and lag features. Evaluated on a chronological holdout."
                ),
            ),
            _registered_model(
                model_id="aqi-cpcb-classifier",
                name="RandomForestClassifier_AQI_Bucket",
                version="1.0.0",
                task_type="classification",
                algorithm="Random Forest",
                framework="scikit-learn",
                artifact_filename=CLASSIFICATION_ARTIFACT,
                description=(
                    "Classifies the Indian CPCB AQI bucket from pollutant, weather, "
                    "calendar, location and lag features; numerical AQI is excluded as an input."
                ),
            ),
            _registered_model(
                model_id="aqi-trend-3day",
                name="RandomForestClassifier_AQI_Trend_3Day",
                version="2.0.0",
                task_type="classification",
                algorithm="Random Forest",
                framework="scikit-learn",
                artifact_filename=TREND_ARTIFACT,
                description=(
                    "Predicts a 3-day smoothed Increasing/Stable/Decreasing trend class. "
                    "Artifact is executable, but holdout performance is modest; treat as experimental."
                ),
            ),
            _registered_model(
                model_id="cpcb-exposure-rule-v1",
                name="CPCB_AQI_Exposure_Rule_V1",
                version="1.0.0",
                task_type="classification",
                algorithm="Rule Engine",
                framework="Python · transparent AQI thresholds",
                artifact_filename=None,
                description=(
                    "Deterministic AQI-based exposure guidance. This is a rule engine, "
                    "not a trained machine-learning model; no ML evaluation metrics apply."
                ),
                always_ready=True,
            ),
        ]

        metrics = []

        if regression_exists:
            regression_saved = _read_json(MODEL_DIR / "aqi_regression_metrics.json")
            source = regression_saved or REGRESSION_VERIFIED_FALLBACK
            mae = _first_number(source, "mae", "MAE")
            rmse = _first_number(source, "rmse", "RMSE")
            r2 = _first_number(source, "r2", "r2_score", "R2")
            metrics.append(
                ModelMetricSchema(
                    modelName="RandomForestRegressor_AQI_NextDay",
                    algorithm="Random Forest",
                    taskType="regression",
                    mae=mae,
                    rmse=rmse,
                    r2=r2,
                    evaluationRecordsAvailable=mae is not None and rmse is not None and r2 is not None,
                    isDemoEstimate=False,
                )
            )

        if classification_exists:
            saved = _read_json(MODEL_DIR / "aqi_classification_metrics.json")
            source = saved or CLASSIFICATION_VERIFIED_FALLBACK
            accuracy = _first_number(source, "accuracy")
            precision = _first_number(source, "macro_precision", "precision")
            recall = _first_number(source, "macro_recall", "recall")
            f1 = _first_number(source, "macro_f1", "f1")
            metrics.append(
                ModelMetricSchema(
                    modelName="RandomForestClassifier_AQI_Bucket",
                    algorithm="Random Forest",
                    taskType="classification",
                    accuracy=accuracy,
                    precision=precision,
                    recall=recall,
                    f1=f1,
                    evaluationRecordsAvailable=accuracy is not None and f1 is not None,
                    isDemoEstimate=False,
                )
            )

        if trend_exists:
            saved_payload = _read_json(MODEL_DIR / "aqi_trend_classifier_v2_metrics.json")
            selected = saved_payload.get("chosen_metrics", {})
            source = selected if isinstance(selected, dict) and selected else TREND_VERIFIED_FALLBACK
            report = source.get("classification_report", {}) if isinstance(source, dict) else {}
            stable = report.get("Stable", {}) if isinstance(report, dict) else {}
            stable_recall = _first_number(stable, "recall") if isinstance(stable, dict) else None
            if stable_recall is None:
                stable_recall = _first_number(source, "stable_recall")
            metrics.append(
                ModelMetricSchema(
                    modelName="RandomForestClassifier_AQI_Trend_3Day",
                    algorithm="Random Forest",
                    taskType="classification",
                    accuracy=_first_number(source, "accuracy"),
                    precision=_first_number(source, "macro_precision"),
                    recall=_first_number(source, "macro_recall"),
                    f1=_first_number(source, "macro_f1"),
                    balancedAccuracy=_first_number(source, "balanced_accuracy"),
                    stableRecall=stable_recall,
                    evaluationRecordsAvailable=(
                        _first_number(source, "accuracy") is not None
                        and _first_number(source, "macro_f1") is not None
                    ),
                    isDemoEstimate=False,
                )
            )

        trained_ml_count = sum((regression_exists, classification_exists, trend_exists))
        have_evaluations = any(item.evaluationRecordsAvailable for item in metrics)
        now = datetime.now(timezone.utc).isoformat()

        return ModelPerformanceResponse(
            models=models,
            metrics=metrics,
            # Do not invent row-level predictions for the comparison chart.
            comparisonPoints=[],
            evaluationRecordsAvailable=have_evaluations,
            metadata=ApiResponseMetadata(
                data_source="ml_model" if trained_ml_count else "database",
                model_status="ready" if trained_ml_count else "not_trained",
                model_name="AQI_AI_Model_Registry",
                prediction_type="model_registry",
                is_demo=False,
                timestamp=now,
            ),
        )



# from datetime import datetime, timedelta
# import math
# from typing import List
# from sqlalchemy.orm import Session

# from backend.app.schemas.model import (
#     ModelRegistrySchema,
#     ModelMetricSchema,
#     ModelComparisonPoint,
#     ModelPerformanceResponse
# )
# from backend.app.schemas.common import ApiResponseMetadata

# class ModelService:
#     def __init__(self, db: Session):
#         self.db = db

#     def get_performance(self) -> ModelPerformanceResponse:
#         now = datetime.utcnow()

#         models = [
#             ModelRegistrySchema(
#                 id="rf-reg-v1",
#                 name="RandomForestRegressor_AQI",
#                 version="1.0.0-draft",
#                 taskType="regression",
#                 algorithm="Random Forest",
#                 framework="scikit-learn 1.4+",
#                 status="in_development",
#                 isTrained=False,
#                 description="Ensemble of 150 decision trees trained on multi-station particulate and weather features."
#             ),
#             ModelRegistrySchema(
#                 id="xgb-reg-v1",
#                 name="XGBoostRegressor_AQI",
#                 version="1.0.0-draft",
#                 taskType="regression",
#                 algorithm="XGBoost",
#                 framework="xgboost 2.0+",
#                 status="in_development",
#                 isTrained=False,
#                 description="Gradient boosted trees with regularization for non-linear meteorological interactions."
#             ),
#             ModelRegistrySchema(
#                 id="lgb-reg-v1",
#                 name="LightGBMRegressor_AQI",
#                 version="1.0.0-draft",
#                 taskType="regression",
#                 algorithm="LightGBM",
#                 framework="lightgbm 4.3+",
#                 status="in_development",
#                 isTrained=False,
#                 description="Histogram-based fast gradient boosting with leaf-wise tree growth."
#             ),
#             ModelRegistrySchema(
#                 id="ens-stack-v1",
#                 name="StackingEnsemble_AQI",
#                 version="1.0.0-draft",
#                 taskType="regression",
#                 algorithm="Stacking Ensemble",
#                 framework="scikit-learn 1.4+",
#                 status="not_trained",
#                 isTrained=False,
#                 description="Ridge Meta-Learner combining Random Forest, XGBoost, and LightGBM base estimators."
#             ),
#             ModelRegistrySchema(
#                 id="lstm-seq-v1",
#                 name="DeepLSTM_Seq2Seq_AQI",
#                 version="0.1.0-planned",
#                 taskType="forecasting",
#                 algorithm="LSTM Deep Learning",
#                 framework="PyTorch / TensorFlow",
#                 status="not_trained",
#                 isTrained=False,
#                 description="Multi-layer recurrent LSTM cell architecture for multi-step temporal sequence forecasting."
#             )
#         ]

#         # Phase 1: Un-trained / demo preview metrics
#         metrics = [
#             ModelMetricSchema(
#                 modelName="RandomForestRegressor_AQI",
#                 algorithm="Random Forest",
#                 taskType="regression",
#                 mae=14.8,
#                 rmse=21.2,
#                 r2=0.84,
#                 evaluationRecordsAvailable=False,
#                 isDemoEstimate=True
#             ),
#             ModelMetricSchema(
#                 modelName="XGBoostRegressor_AQI",
#                 algorithm="XGBoost",
#                 taskType="regression",
#                 mae=12.1,
#                 rmse=18.5,
#                 r2=0.88,
#                 evaluationRecordsAvailable=False,
#                 isDemoEstimate=True
#             ),
#             ModelMetricSchema(
#                 modelName="LightGBMRegressor_AQI",
#                 algorithm="LightGBM",
#                 taskType="regression",
#                 mae=12.6,
#                 rmse=18.9,
#                 r2=0.87,
#                 evaluationRecordsAvailable=False,
#                 isDemoEstimate=True
#             ),
#             ModelMetricSchema(
#                 modelName="StackingEnsemble_AQI",
#                 algorithm="Stacking Ensemble",
#                 taskType="regression",
#                 mae=10.9,
#                 rmse=16.7,
#                 r2=0.91,
#                 evaluationRecordsAvailable=False,
#                 isDemoEstimate=True
#             )
#         ]

#         comparison_points = []
#         for i in range(7):
#             d = (now - timedelta(days=7 - i)).strftime("%Y-%m-%d")
#             base = 150.0 + math.sin(i) * 30.0
#             comparison_points.append(ModelComparisonPoint(
#                 date=d,
#                 actual=round(base, 1),
#                 rfPred=round(base + (5.0 if i % 2 == 0 else -7.0), 1),
#                 xgbPred=round(base + (3.0 if i % 2 == 0 else -4.0), 1),
#                 lgbmPred=round(base + (4.0 if i % 2 == 0 else -5.0), 1),
#                 ensemblePred=round(base + (2.0 if i % 2 == 0 else -2.0), 1)
#             ))

#         return ModelPerformanceResponse(
#             models=models,
#             metrics=metrics,
#             comparisonPoints=comparison_points,
#             evaluationRecordsAvailable=False,
#             metadata=ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now.isoformat()
#             )
#         )
