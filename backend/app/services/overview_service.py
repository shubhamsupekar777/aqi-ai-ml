from datetime import datetime, timedelta
import math
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_epa_category, determine_trend
# from backend.app.services.prediction_service import CITY_BASELINES
# Demo-only values for the Overview page.
# Replace with database queries when historical data is integrated.
DEMO_CITY_BASELINES = {
    "Delhi": 185.0,
    "Mumbai": 92.0,
    "Pune": 78.0,
    "Bengaluru": 48.0,
    "Chennai": 65.0,
    "Hyderabad": 115.0,
}

class OverviewService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self, city: str = "Delhi") -> Dict[str, Any]:
        # reference_aqi = CITY_BASELINES.get(city, 120.0)
        reference_aqi = DEMO_CITY_BASELINES.get(city, 120.0)
        current_cat, _, _, _ = get_epa_category(reference_aqi)

        delta_pred = 20.0 if city == "Delhi" else -4.0 if city == "Mumbai" else 6.0
        pred_next_day = reference_aqi + delta_pred
        trend_dir, delta, _, _ = determine_trend(reference_aqi, pred_next_day)

        now = datetime.utcnow()

        # 14 days historical
        historical_series = []
        for i in range(14):
            d = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
            offset = math.sin(i * 0.7) * 22.0 + (i * 1.5) - 10.0
            val = round(max(25.0, reference_aqi + offset), 1)
            cat, _, _, _ = get_epa_category(val)
            historical_series.append({
                "date": d,
                "aqi": val,
                "category": cat,
                "pm25": round(val * 0.62, 1),
                "pm10": round(val * 1.15, 1),
                "no2": round(28.0 + (i % 6) * 4.0, 1),
                "so2": round(14.0 + (i % 4) * 2.5, 1),
                "co": round(0.8 + (val / 180.0), 1),
                "o3": round(35.0 + (i % 5) * 5.0, 1)
            })

        avg_aqi = round(sum(p["aqi"] for p in historical_series) / len(historical_series), 1)

        # 7-day predicted comparison
        predicted_comparison_series = []
        for i in range(7):
            d = (now - timedelta(days=3 - i)).strftime("%Y-%m-%d")
            is_past = i <= 3
            actual = historical_series[len(historical_series) - 4 + i]["aqi"] if is_past else None
            pred = round(reference_aqi + (i - 3) * (delta / 3.0) + math.sin(i) * 5.0, 1)
            cat, _, _, _ = get_epa_category(pred)
            predicted_comparison_series.append({
                "date": d,
                "actualAqi": actual,
                "predictedAqi": pred,
                "category": cat
            })

        return {
            "city": city,
            "kpis": {
                "currentAqi": reference_aqi,
                "currentCategory": current_cat,
                "historicalAverageAqi": avg_aqi,
                "predictedNextDayAqi": pred_next_day,
                "trend": trend_dir,
                "trendDelta": delta,
                "highRiskLocationsCount": 14 if reference_aqi > 100 else 3
            },
            "historicalSeries": historical_series,
            "predictedComparisonSeries": predicted_comparison_series,
            "pollutantBreakdown": {
                "pm25": round(reference_aqi * 0.65, 1),
                "pm10": round(reference_aqi * 1.2, 1),
                "no2": 44.5,
                "so2": 18.2,
                "co": 1.4,
                "o3": 42.0,
                "nh3": 21.0,
                "no": 19.8,
                "nox": 38.6
            },
            "cityComparisons": [
                {"city": "Delhi", "aqi": 185.0, "category": "Unhealthy", "dominantPollutant": "PM2.5", "trend": "Increasing"},
                {"city": "Hyderabad", "aqi": 115.0, "category": "Unhealthy for Sensitive Groups", "dominantPollutant": "PM2.5", "trend": "Increasing"},
                {"city": "Mumbai", "aqi": 92.0, "category": "Moderate", "dominantPollutant": "PM10", "trend": "Decreasing"},
                {"city": "Pune", "aqi": 78.0, "category": "Moderate", "dominantPollutant": "O3", "trend": "Stable"},
                {"city": "Chennai", "aqi": 65.0, "category": "Moderate", "dominantPollutant": "SO2", "trend": "Decreasing"},
                {"city": "Bengaluru", "aqi": 48.0, "category": "Good", "dominantPollutant": "NO2", "trend": "Stable"}
            ],
            "categoryDistribution": [
                {"category": "Good", "count": 4, "percentage": 14.3, "color": "#10B981"},
                {"category": "Moderate", "count": 11, "percentage": 39.3, "color": "#F59E0B"},
                {"category": "Unhealthy for Sensitive Groups", "count": 7, "percentage": 25.0, "color": "#F97316"},
                {"category": "Unhealthy", "count": 5, "percentage": 17.9, "color": "#EF4444"},
                {"category": "Very Unhealthy", "count": 1, "percentage": 3.5, "color": "#8B5CF6"},
                {"category": "Hazardous", "count": 0, "percentage": 0.0, "color": "#881337"}
            ],
            "recentPredictions": [
                {
                    "id": "pred-101",
                    "city": "Delhi",
                    "timestamp": (now - timedelta(minutes=15)).isoformat(),
                    "referenceAqi": 185.0,
                    "predictedAqi": 205.0,
                    "horizon": "Next Day",
                    "category": "Very Unhealthy",
                    "trend": "Increasing",
                    "risk": "Severe Risk",
                    "isDemo": True
                },
                {
                    "id": "pred-102",
                    "city": "Mumbai",
                    "timestamp": (now - timedelta(minutes=45)).isoformat(),
                    "referenceAqi": 92.0,
                    "predictedAqi": 88.0,
                    "horizon": "Next 3 Days",
                    "category": "Moderate",
                    "trend": "Decreasing",
                    "risk": "Moderate Risk",
                    "isDemo": True
                },
                {
                    "id": "pred-103",
                    "city": "Bengaluru",
                    "timestamp": (now - timedelta(minutes=120)).isoformat(),
                    "referenceAqi": 48.0,
                    "predictedAqi": 52.0,
                    "horizon": "Next 7 Days",
                    "category": "Moderate",
                    "trend": "Stable",
                    "risk": "Low Risk",
                    "isDemo": True
                }
            ],
            "warnings": [
                {
                    "id": "warn-1",
                    "severity": "high" if reference_aqi > 150 else "moderate",
                    "title": f"{city} Particulate Exposure Advisory",
                    "message": f"Ground-level PM2.5 concentrations in {city} exceed baseline health guidelines. Sensitive cohorts should limit heavy outdoor exertion.",
                    "city": city,
                    "timestamp": now.isoformat()
                }
            ],
            "metadata": ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now.isoformat()
            ).dict()
        }
