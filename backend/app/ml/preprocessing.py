import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.app.ml.model_metadata import EXPECTED_FEATURES

class AtmosphericPreprocessor:
    """
    Standard preprocessor for air quality and meteorological observations.
    CRITICAL: Avoids target leakage by exclusively transforming historical inputs.
    """

    def __init__(self, feature_order: Optional[List[str]] = None):
        self.feature_order = feature_order or EXPECTED_FEATURES
        self.imputation_defaults = {
            "pm25": 55.0,
            "pm10": 95.0,
            "no2": 32.0,
            "so2": 14.0,
            "co": 1.1,
            "o3": 38.0,
            "temperature": 27.0,
            "humidity": 60.0,
            "wind_speed": 8.5,
            "rainfall": 0.0,
            "aqi_lag_1d": 110.0,
            "aqi_lag_7d": 110.0,
            "aqi_rolling_mean_7d": 110.0,
            "day_of_week": 2,
            "month": 10
        }

    def transform_dict(self, input_dict: Dict[str, Any]) -> np.ndarray:
        """
        Converts a dictionary of feature inputs into a correctly ordered 2D numpy array.
        Imputes missing values with baseline medians.
        """
        row = []
        for feature in self.feature_order:
            val = input_dict.get(feature)
            if val is None or (isinstance(val, (float, int)) and np.isnan(val)):
                val = self.imputation_defaults.get(feature, 0.0)
            row.append(float(val))
        return np.array([row])

    def transform_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensures DataFrame features match exact expected ordering.
        """
        processed = df.copy()
        for feature in self.feature_order:
            if feature not in processed.columns:
                processed[feature] = self.imputation_defaults.get(feature, 0.0)
            else:
                processed[feature] = processed[feature].fillna(self.imputation_defaults.get(feature, 0.0))
        return processed[self.feature_order]
