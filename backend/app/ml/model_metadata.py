from typing import List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class ModelMetadata:
    model_name: str
    version: str
    task_type: str  # 'regression', 'classification', 'forecasting'
    algorithm: str
    framework: str
    feature_order: List[str]
    target_column: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    scaler_type: str = "StandardScaler"
    is_trained: bool = False
    train_start_date: str = ""
    train_end_date: str = ""
    evaluation_metrics: Dict[str, float] = field(default_factory=dict)

EXPECTED_FEATURES: List[str] = [
    "pm25",
    "pm10",
    "no2",
    "so2",
    "co",
    "o3",
    "temperature",
    "humidity",
    "wind_speed",
    "rainfall",
    "aqi_lag_1d",
    "aqi_lag_7d",
    "aqi_rolling_mean_7d",
    "day_of_week",
    "month"
]
