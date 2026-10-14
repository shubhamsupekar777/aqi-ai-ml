import pandas as pd
from typing import Dict, Any
from datetime import datetime

class FeatureBuilder:
    """
    Constructs time-series features (lags, rolling averages, calendar indices).
    Strict target leakage protection: all calculations reference past observations only.
    """

    @staticmethod
    def extract_calendar_features(date_str: str) -> Dict[str, int]:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        except Exception:
            dt = datetime.utcnow()
        return {
            "day_of_week": dt.weekday(),
            "month": dt.month,
            "day_of_year": dt.timetuple().tm_yday
        }

    @staticmethod
    def build_time_series_features(historical_aqi_series: list) -> Dict[str, float]:
        """
        Calculates 1-day lag, 7-day lag, and 7-day rolling mean from past sequence.
        """
        if not historical_aqi_series:
            return {
                "aqi_lag_1d": 100.0,
                "aqi_lag_7d": 100.0,
                "aqi_rolling_mean_7d": 100.0
            }

        values = [float(x) for x in historical_aqi_series]
        lag_1d = values[-1] if len(values) >= 1 else 100.0
        lag_7d = values[-7] if len(values) >= 7 else lag_1d
        
        last_7 = values[-7:] if len(values) >= 7 else values
        rolling_mean_7d = sum(last_7) / len(last_7) if last_7 else lag_1d

        return {
            "aqi_lag_1d": round(lag_1d, 2),
            "aqi_lag_7d": round(lag_7d, 2),
            "aqi_rolling_mean_7d": round(rolling_mean_7d, 2)
        }
