from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.schemas.classification import (
    ClassificationRequest,
    ClassificationResponse,
    CategoryDistributionItem,
    ClassificationHistoryItem
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_epa_category

class ClassificationService:
    def __init__(self, db: Session):
        self.db = db

    def classify(self, req: ClassificationRequest) -> ClassificationResponse:
        aqi_val = round(max(0.0, req.aqi), 1)
        category_name, color, health_stmt, cautionary_stmt = get_epa_category(aqi_val)

        category_distribution = [
            CategoryDistributionItem(category="Good", count=12, percentage=16.7, color="#10B981"),
            CategoryDistributionItem(category="Moderate", count=28, percentage=38.9, color="#F59E0B"),
            CategoryDistributionItem(category="Unhealthy for Sensitive Groups", count=18, percentage=25.0, color="#F97316"),
            CategoryDistributionItem(category="Unhealthy", count=10, percentage=13.9, color="#EF4444"),
            CategoryDistributionItem(category="Very Unhealthy", count=4, percentage=5.5, color="#8B5CF6"),
            CategoryDistributionItem(category="Hazardous", count=0, percentage=0.0, color="#881337"),
        ]

        now = datetime.utcnow().isoformat()
        history = [
            ClassificationHistoryItem(id="cls-1", timestamp=now, aqi=aqi_val, category=category_name, city=req.city or "Delhi"),
            ClassificationHistoryItem(id="cls-2", timestamp=now, aqi=142.0, category="Unhealthy for Sensitive Groups", city="Hyderabad"),
            ClassificationHistoryItem(id="cls-3", timestamp=now, aqi=45.0, category="Good", city="Bengaluru"),
            ClassificationHistoryItem(id="cls-4", timestamp=now, aqi=95.0, category="Moderate", city="Mumbai"),
        ]

        return ClassificationResponse(
            aqi=aqi_val,
            category=category_name,
            schemeIdentifier=req.scheme or "US_EPA",
            explanation=f"AQI value of {aqi_val} falls within the '{category_name}' regulatory band under the configured {req.scheme or 'US_EPA'} standard.",
            healthStatement=health_stmt,
            cautionaryStatement=cautionary_stmt,
            color=color,
            probabilities=None, # Intentionally null in Phase 1 (no fabricated confidence scores)
            history=history,
            categoryDistribution=category_distribution,
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now
            )
        )
