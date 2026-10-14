from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    DemographicGuideline,
    RiskDistributionItem,
    CityRiskComparisonItem
)
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.services.standards import get_epa_category, get_risk_assessment
from backend.app.services.prediction_service import CITY_BASELINES

class RiskService:
    def __init__(self, db: Session):
        self.db = db

    def assess_risk(self, req: RiskAssessmentRequest) -> RiskAssessmentResponse:
        city = req.city or "Delhi"
        reference_aqi = req.aqi if req.aqi is not None else CITY_BASELINES.get(city, 120.0)

        cat_name, _, _, _ = get_epa_category(reference_aqi)
        level, color, title, summary, precautions = get_risk_assessment(reference_aqi)

        demographics = [
            DemographicGuideline(
                group="General Population",
                exposureRisk="Moderate to High" if reference_aqi > 150 else "Low",
                recommendation="Reduce prolonged heavy physical exertion outdoors during high pollution periods." if reference_aqi > 150 else "Normal outdoor activities permitted."
            ),
            DemographicGuideline(
                group="Children & Adolescents",
                exposureRisk="High" if reference_aqi > 100 else "Low to Moderate",
                recommendation="Limit outdoor sports and active recess; prefer ventilated indoor spaces." if reference_aqi > 100 else "Standard outdoor play permitted."
            ),
            DemographicGuideline(
                group="Older Adults (65+)",
                exposureRisk="High" if reference_aqi > 100 else "Low to Moderate",
                recommendation="Avoid high-traffic roadways; schedule outdoor walks during midday hours." if reference_aqi > 100 else "Standard outdoor recreation permitted."
            ),
            DemographicGuideline(
                group="Individuals with Respiratory/Cardiovascular Conditions",
                exposureRisk="Significant Vulnerability" if reference_aqi > 50 else "Low",
                recommendation="Strictly stay indoors; keep quick-relief inhalers and medications accessible at all times." if reference_aqi > 100 else "Monitor respiratory response and maintain indoor filtration."
            )
        ]

        now = datetime.utcnow().isoformat()

        return RiskAssessmentResponse(
            city=city,
            referenceAqi=reference_aqi,
            category=cat_name,
            riskClassification=level,
            ruleIdentifier="DEMO_MULTI_TIER_RISK_RULE_V1",
            warningTitle=title,
            summary=summary,
            explanation=f"AQI value of {reference_aqi} maps to '{level}' under the transparent demo exposure rule mapping. This classification reflects ambient particulate matter exposure potential rather than an individual clinical diagnosis.",
            generalPrecautions=precautions,
            demographicGuidelines=demographics,
            riskDistribution=[
                RiskDistributionItem(level="Low Risk", count=14, percentage=23.3, color="#10B981"),
                RiskDistributionItem(level="Moderate Risk", count=24, percentage=40.0, color="#F59E0B"),
                RiskDistributionItem(level="High Risk", count=16, percentage=26.7, color="#EF4444"),
                RiskDistributionItem(level="Severe Risk", count=6, percentage=10.0, color="#881337"),
            ],
            cityRiskComparison=[
                CityRiskComparisonItem(city="Delhi", aqi=185.0, risk="High Risk", color="#EF4444"),
                CityRiskComparisonItem(city="Hyderabad", aqi=115.0, risk="High Risk", color="#EF4444"),
                CityRiskComparisonItem(city="Mumbai", aqi=92.0, risk="Moderate Risk", color="#F59E0B"),
                CityRiskComparisonItem(city="Pune", aqi=78.0, risk="Moderate Risk", color="#F59E0B"),
                CityRiskComparisonItem(city="Chennai", aqi=65.0, risk="Moderate Risk", color="#F59E0B"),
                CityRiskComparisonItem(city="Bengaluru", aqi=48.0, risk="Low Risk", color="#10B981"),
            ],
            metadata=ApiResponseMetadata(
                data_source="demo",
                model_status="not_trained",
                model_name=None,
                prediction_type="demo",
                is_demo=True,
                timestamp=now
            )
        )
