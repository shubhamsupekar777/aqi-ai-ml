from datetime import datetime, timedelta
import math
from typing import List
from sqlalchemy.orm import Session

from backend.app.schemas.model import (
    ModelRegistrySchema,
    ModelMetricSchema,
    ModelComparisonPoint,
    ModelPerformanceResponse
)
from backend.app.schemas.common import ApiResponseMetadata

class ModelService:
    def __init__(self, db: Session):
        self.db = db

    def get_performance(self) -> ModelPerformanceResponse:
        now = datetime.utcnow()

        models = [
            ModelRegistrySchema(
                id="rf-reg-v1",
                name="RandomForestRegressor_AQI",
                version="1.0.0-draft",
                taskType="regression",
                algorithm="Random Forest",
                framework="scikit-learn 1.4+",
                status="in_development",
                isTrained=False,
                description="Ensemble of 150 decision trees trained on multi-station particulate and weather features."
            ),
            ModelRegistrySchema(
                id="xgb-reg-v1",
                name="XGBoostRegressor_AQI",
                version="1.0.0-draft",
                taskType="regression",
                algorithm="XGBoost",
                framework="xgboost 2.0+",
                status="in_development",
                isTrained=False,
                description="Gradient boosted trees with regularization for non-linear meteorological interactions."
            ),
            ModelRegistrySchema(
                id="lgb-reg-v1",
                name="LightGBMRegressor_AQI",
                version="1.0.0-draft",
                taskType="regression",
                algorithm="LightGBM",
                framework="lightgbm 4.3+",
                status="in_development",
                isTrained=False,
                description="Histogram-based fast gradient boosting with leaf-wise tree growth."
            ),
            ModelRegistrySchema(
                id="ens-stack-v1",
                name="StackingEnsemble_AQI",
                version="1.0.0-draft",
                taskType="regression",
                algorithm="Stacking Ensemble",
                framework="scikit-learn 1.4+",
                status="not_trained",
                isTrained=False,
                description="Ridge Meta-Learner combining Random Forest, XGBoost, and LightGBM base estimators."
            ),
            ModelRegistrySchema(
                id="lstm-seq-v1",
                name="DeepLSTM_Seq2Seq_AQI",
                version="0.1.0-planned",
                taskType="forecasting",
                algorithm="LSTM Deep Learning",
                framework="PyTorch / TensorFlow",
                status="not_trained",
                isTrained=False,
                description="Multi-layer recurrent LSTM cell architecture for multi-step temporal sequence forecasting."
            )
        ]

        # Phase 1: Un-trained / demo preview metrics
        metrics = [
            ModelMetricSchema(
                modelName="RandomForestRegressor_AQI",
                algorithm="Random Forest",
                taskType="regression",
                mae=14.8,
                rmse=21.2,
                r2=0.84,
                evaluationRecordsAvailable=False,
                isDemoEstimate=True
            ),
            ModelMetricSchema(
                modelName="XGBoostRegressor_AQI",
                algorithm="XGBoost",
                taskType="regression",
                mae=12.1,
                rmse=18.5,
                r2=0.88,
                evaluationRecordsAvailable=False,
                isDemoEstimate=True
            ),
            ModelMetricSchema(
                modelName="LightGBMRegressor_AQI",
                algorithm="LightGBM",
                taskType="regression",
                mae=12.6,
                rmse=18.9,
                r2=0.87,
                evaluationRecordsAvailable=False,
                isDemoEstimate=True
            ),
            ModelMetricSchema(
                modelName="StackingEnsemble_AQI",
                algorithm="Stacking Ensemble",
                taskType="regression",
                mae=10.9,
                rmse=16.7,
                r2=0.91,
                evaluationRecordsAvailable=False,
                isDemoEstimate=True
            )
        ]

        comparison_points = []
        for i in range(7):
            d = (now - timedelta(days=7 - i)).strftime("%Y-%m-%d")
            base = 150.0 + math.sin(i) * 30.0
            comparison_points.append(ModelComparisonPoint(
                date=d,
                actual=round(base, 1),
                rfPred=round(base + (5.0 if i % 2 == 0 else -7.0), 1),
                xgbPred=round(base + (3.0 if i % 2 == 0 else -4.0), 1),
                lgbmPred=round(base + (4.0 if i % 2 == 0 else -5.0), 1),
                ensemblePred=round(base + (2.0 if i % 2 == 0 else -2.0), 1)
            ))

        return ModelPerformanceResponse(
            models=models,
            metrics=metrics,
            comparisonPoints=comparison_points,
            evaluationRecordsAvailable=False,
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now.isoformat()
            )
        )
