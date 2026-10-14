
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd

from backend.app.core.config import settings
from backend.app.core.exceptions import ModelUnavailableException
from backend.app.ml.model_loader import ModelLoader


class InferenceEngine:
    def run_regression_inference(
        self,
        features_dict: Dict[str, Any],
        model_filename: str = "aqi_next_day.joblib",
    ) -> Tuple[float, str, bool]:

        if settings.PREDICTION_MODE != "ml":
            raise ModelUnavailableException(
                "Real-model mode is required for this inference path. "
                "Configure PREDICTION_MODE=ml."
            )

        artifact = ModelLoader.load_model(model_filename)

        if not isinstance(artifact, dict) or "pipeline" not in artifact:
            raise ModelUnavailableException(
                f"Valid trained artifact not available: {model_filename}"
            )

        expected_features = artifact["features"]
        row = {}

        for feature in expected_features:
            if feature not in features_dict:
                raise ValueError(
                    f"Missing required model feature: {feature}"
                )
            row[feature] = features_dict[feature]

        X = pd.DataFrame([row], columns=expected_features)
        prediction = float(artifact["pipeline"].predict(X)[0])

        if not np.isfinite(prediction):
            raise ValueError("Model returned an invalid prediction.")

        return round(prediction, 2), "aqi_next_day", False













# import os
# from typing import Dict, Any, Tuple
# from backend.app.core.config import settings
# from backend.app.core.exceptions import ModelUnavailableException
# from backend.app.core.logging import logger
# from backend.app.ml.model_loader import ModelLoader
# from backend.app.ml.preprocessing import AtmosphericPreprocessor

# class InferenceEngine:
#     """
#     Inference orchestrator for AQI regression and classification models.
#     Supports 'demo' mode and 'ml' mode as configured by PREDICTION_MODE.
#     """

#     def __init__(self):
#         self.preprocessor = AtmosphericPreprocessor()

#     def run_regression_inference(
#         self,
#         features_dict: Dict[str, Any],
#         model_filename: str = "random_forest_aqi.joblib"
#     ) -> Tuple[float, str, bool]:
#         """
#         Runs numerical regression inference.
#         Returns: (predicted_aqi, model_name, is_demo)
#         """
#         if settings.PREDICTION_MODE == "ml":
#             model = ModelLoader.load_model(model_filename)
#             if model is None:
#                 raise ModelUnavailableException(
#                     f"Requested ML model '{model_filename}' is not deployed in {settings.MODEL_DIR}. "
#                     "Ensure Phase 2 model weights are trained and persisted."
#                 )

#             features_array = self.preprocessor.transform_dict(features_dict)
#             prediction = float(model.predict(features_array)[0])
#             return prediction, model_filename.replace(".joblib", ""), False

#         # In demo mode: simulate realistic deterministic output
#         pm25 = float(features_dict.get("pm25", 70.0))
#         wind = float(features_dict.get("wind_speed", 8.0))
#         temp = float(features_dict.get("temperature", 28.0))
        
#         simulated = pm25 * 1.55 - (wind * 2.2) + (35.0 - temp) * 0.8 + 25.0
#         predicted_aqi = max(15.0, min(500.0, simulated))
#         return round(predicted_aqi, 1), "DemoRuleEstimator_v1", True



# from typing import Dict, Any, Tuple

# from backend.app.core.config import settings
# from backend.app.core.exceptions import ModelUnavailableException
# from backend.app.ml.model_loader import ModelLoader


# class InferenceEngine:
#     """
#     Runs trained AQI regression inference in ML mode.
#     Demo mode remains available when configured.
#     """

#     def run_regression_inference(
#         self,
#         features_dict: Dict[str, Any],
#         model_filename: str = "aqi_next_day.joblib",
#     ) -> Tuple[float, str, bool]:

#         if settings.PREDICTION_MODE == "ml":
#             artifact = ModelLoader.load_model(model_filename)

#             if artifact is None:
#                 raise ModelUnavailableException(
#                     f"Model '{model_filename}' was not found or could not be loaded "
#                     f"from {settings.MODEL_DIR}."
#                 )

#             # Our training script saves a dictionary containing the pipeline.
#             if not isinstance(artifact, dict) or "pipeline" not in artifact:
#                 raise ModelUnavailableException(
#                     f"Artifact '{model_filename}' does not contain a trained pipeline."
#                 )

#             pipeline = artifact["pipeline"]
#             expected_features = artifact["features"]

#             # Build a single-row DataFrame in the exact training feature order.
#             import pandas as pd

#             row = {}
#             for feature in expected_features:
#                 if feature not in features_dict:
#                     raise ValueError(
#                         f"Missing required model input: '{feature}'."
#                     )
#                 row[feature] = features_dict[feature]

#             import numpy as np

#             features_df = pd.DataFrame([row])

#             prediction = float(pipeline.predict(features_df)[0])

#             if not np.isfinite(prediction):
#                 raise ValueError("The AQI model returned a non-finite prediction.")

#             return (
#                 round(prediction, 2),
#                 "aqi_next_day",
#                 False,
#             )

#         # Demo mode: clearly marked simulated output.
#         pm25 = float(features_dict.get("pm25", 70.0))
#         wind = float(features_dict.get("wind_speed", 8.0))
#         temp = float(features_dict.get("temperature", 28.0))

#         simulated = (
#             pm25 * 1.55
#             - wind * 2.2
#             + (35.0 - temp) * 0.8
#             + 25.0
#         )

#         predicted_aqi = max(15.0, min(500.0, simulated))

#         return round(predicted_aqi, 1), "DemoRuleEstimator_v1", True
