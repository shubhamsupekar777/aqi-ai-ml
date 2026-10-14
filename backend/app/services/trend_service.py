from datetime import datetime, timedelta
import math
from typing import List
from sqlalchemy.orm import Session

from backend.app.schemas.trend import TrendResponse, TrendDataPoint
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_epa_category, determine_trend
from backend.app.services.prediction_service import CITY_BASELINES

class TrendService:
    def __init__(self, db: Session):
        self.db = db

    def get_trends(self, city: str = "Delhi", horizon_days: int = 7) -> TrendResponse:
        reference_aqi = CITY_BASELINES.get(city, 120.0)
        current_cat, _, _, _ = get_epa_category(reference_aqi)

        now = datetime.utcnow()
        historical_series: List[TrendDataPoint] = []
        for i in range(14):
            d = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
            offset = math.sin(i * 0.65) * 18.0 - 8.0 + (i * 0.9)
            val = round(max(20.0, reference_aqi + offset), 1)
            cat, _, _, _ = get_epa_category(val)
            historical_series.append(TrendDataPoint(
                date=d,
                aqi=val,
                category=cat,
                isForecast=False
            ))

        # Project endpoint based on city trajectory
        delta_target = 20.0 if city == "Delhi" else -10.0 if city == "Mumbai" else 4.0
        target_aqi = round(reference_aqi + delta_target * (horizon_days / 7.0), 1)
        trend_dir, delta, pct, explanation = determine_trend(reference_aqi, target_aqi)

        forecast_series: List[TrendDataPoint] = []
        for i in range(1, horizon_days + 1):
            d = (now + timedelta(days=i)).strftime("%Y-%m-%d")
            step_aqi = round(reference_aqi + ((target_aqi - reference_aqi) / horizon_days) * i, 1)
            cat, _, _, _ = get_epa_category(step_aqi)
            forecast_series.append(TrendDataPoint(
                date=d,
                aqi=step_aqi,
                category=cat,
                isForecast=True,
                lowerBound=max(10.0, round(step_aqi - (8.0 + i * 3.0), 1)),
                upperBound=min(500.0, round(step_aqi + (10.0 + i * 4.0), 1))
            ))

        combined_series = historical_series + forecast_series

        return TrendResponse(
            city=city,
            referenceAqi=reference_aqi,
            currentCategory=current_cat,
            trendDirection=trend_dir,
            delta=delta,
            percentageChange=pct,
            horizonDays=horizon_days,
            calculationMethod="Slope and variance boundary filtering (±3 AQI margin)",
            explanation=f"Demo forecast values project a shift of {'+' if delta > 0 else ''}{delta} AQI ({'+' if pct > 0 else ''}{pct}%) across the {horizon_days}-day window. The system therefore classifies this sample trend as {trend_dir}.",
            historicalSeries=historical_series,
            forecastSeries=forecast_series,
            combinedSeries=combined_series,
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now.isoformat()
            )
        )
