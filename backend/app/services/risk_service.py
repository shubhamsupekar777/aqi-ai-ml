from datetime import datetime, timezone
from typing import List, Tuple

from fastapi import HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.schemas.common import ApiResponseMetadata
from backend.app.schemas.risk import (
    CityRiskComparisonItem,
    DemographicGuideline,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskDistributionItem,
)
from backend.app.services.standards import get_cpcb_category, get_risk_assessment


RISK_RULE_ID = "CPCB_AQI_EXPOSURE_RULE_V1"
RISK_LEVELS = ("Low Risk", "Moderate Risk", "High Risk", "Severe Risk")
RISK_COLORS = {
    "Low Risk": "#10B981",
    "Moderate Risk": "#F59E0B",
    "High Risk": "#EF4444",
    "Severe Risk": "#881337",
}


def _get_demographic_guidelines(level: str) -> List[DemographicGuideline]:
    """General population guidance based on ambient AQI tiers, not clinical advice."""
    if level == "Low Risk":
        general = "Usual outdoor activities are generally reasonable; continue checking local air-quality updates."
        children = "Normal outdoor activities are generally reasonable while local air quality remains in this tier."
        older = "Continue normal activities and follow local public-health updates."
        respiratory = "Follow advice from your healthcare professional and monitor how you feel during outdoor activity."
        labels = ("Lower concern", "Lower concern", "Lower concern", "Extra caution if sensitive")
    elif level == "Moderate Risk":
        general = "Most people can continue usual activities; consider reducing prolonged, strenuous exertion if pollution bothers you."
        children = "Consider shortening strenuous outdoor play if children develop irritation or breathing discomfort."
        older = "Consider reducing prolonged strenuous activity outdoors, particularly if symptoms occur."
        respiratory = "Consider limiting prolonged outdoor exertion and follow your existing care plan or professional advice."
        labels = ("Some caution", "Some caution", "Some caution", "Use extra caution")
    elif level == "High Risk":
        general = "Reduce prolonged or strenuous outdoor activity and check official local air-quality advisories."
        children = "Limit prolonged strenuous outdoor play and consider cleaner indoor alternatives."
        older = "Reduce prolonged outdoor exertion and avoid heavily polluted roads where practical."
        respiratory = "Limit outdoor exposure when possible and follow your clinician's existing advice."
        labels = ("Elevated", "Higher sensitivity", "Higher sensitivity", "Higher sensitivity")
    else:
        general = "Minimize outdoor exertion and follow official local air-quality and public-health advisories."
        children = "Prefer cleaner indoor activities while conditions remain severe; follow local public-health guidance."
        older = "Minimize outdoor exposure when possible and follow official public-health advisories."
        respiratory = "Minimize exposure and seek professional medical help for severe or persistent symptoms. This tool does not provide treatment advice."
        labels = ("High", "High", "High", "High")

    return [
        DemographicGuideline(group="General population", exposureRisk=labels[0], recommendation=general),
        DemographicGuideline(group="Children and adolescents", exposureRisk=labels[1], recommendation=children),
        DemographicGuideline(group="Older adults", exposureRisk=labels[2], recommendation=older),
        DemographicGuideline(group="People with heart or lung conditions", exposureRisk=labels[3], recommendation=respiratory),
    ]


class RiskService:
    """Database-backed CPCB AQI exposure rules; this is not a trained ML model."""

    def __init__(self, db: Session):
        self.db = db

    def _get_latest_by_city(self) -> List[Tuple[HistoricalAQI, City]]:
        latest_dates = (
            self.db.query(
                HistoricalAQI.city_id.label("city_id"),
                func.max(HistoricalAQI.observation_date).label("latest_date"),
            )
            .group_by(HistoricalAQI.city_id)
            .subquery()
        )
        return (
            self.db.query(HistoricalAQI, City)
            .join(City, HistoricalAQI.city_id == City.id)
            .join(
                latest_dates,
                and_(
                    HistoricalAQI.city_id == latest_dates.c.city_id,
                    HistoricalAQI.observation_date == latest_dates.c.latest_date,
                ),
            )
            .all()
        )

    @staticmethod
    def _risk_for(aqi: float):
        # Rules are documented in standards.get_risk_assessment.
        level, color, title, summary, precautions = get_risk_assessment(aqi)
        return level, color, title, summary, precautions

    def assess_risk(self, req: RiskAssessmentRequest) -> RiskAssessmentResponse:
        city_name = (req.city or "Delhi").strip()
        if not city_name:
            raise HTTPException(status_code=422, detail="City name cannot be empty.")

        observation_date = None
        observation_source = None
        is_hypothetical = req.aqi is not None

        if is_hypothetical:
            # Slider/manual assessment: explicitly treat this as a what-if scenario.
            reference_aqi = float(req.aqi)
            city = self.db.query(City).filter(City.name.ilike(city_name)).first()
            if city is not None:
                city_name = city.name
            data_source = "user_input"
        else:
            city = self.db.query(City).filter(City.name.ilike(city_name)).first()
            if city is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"City '{city_name}' was not found in the database. Choose a city from GET /api/v1/cities.",
                )

            latest = (
                self.db.query(HistoricalAQI)
                .filter(HistoricalAQI.city_id == city.id)
                .order_by(HistoricalAQI.observation_date.desc())
                .first()
            )
            if latest is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"No stored AQI observations are available for '{city.name}'.",
                )

            city_name = city.name
            reference_aqi = float(latest.aqi)
            observation_date = latest.observation_date
            observation_source = latest.data_source or "Stored historical dataset"
            data_source = "database"

        category, _, _, _ = get_cpcb_category(reference_aqi)
        level, color, title, summary, precautions = self._risk_for(reference_aqi)
        demographic_guidelines = _get_demographic_guidelines(level)

        latest_by_city = self._get_latest_by_city()
        counts = {risk_level: 0 for risk_level in RISK_LEVELS}
        for record, _city in latest_by_city:
            record_level = self._risk_for(float(record.aqi))[0]
            counts[record_level] = counts.get(record_level, 0) + 1

        total_cities = sum(counts.values())
        risk_distribution = [
            RiskDistributionItem(
                level=risk_level,
                count=counts[risk_level],
                percentage=round((counts[risk_level] / total_cities * 100.0), 1) if total_cities else 0.0,
                color=RISK_COLORS[risk_level],
            )
            for risk_level in RISK_LEVELS
        ] if total_cities else []

        comparison_rows = sorted(
            latest_by_city,
            key=lambda row: float(row[0].aqi),
            reverse=True,
        )
        # Return up to six real city observations. Ensure the selected city is
        # represented even when it is not among the six highest AQI values.
        selected_row = next((row for row in latest_by_city if row[1].name.casefold() == city_name.casefold()), None)
        comparison_rows = comparison_rows[:6]
        if selected_row is not None and all(row[1].name.casefold() != city_name.casefold() for row in comparison_rows):
            if comparison_rows:
                comparison_rows[-1] = selected_row
            else:
                comparison_rows = [selected_row]
        comparison_rows = sorted(comparison_rows, key=lambda row: float(row[0].aqi), reverse=True)

        city_comparison = []
        for record, city_row in comparison_rows:
            city_level, city_color, *_ = self._risk_for(float(record.aqi))
            city_comparison.append(
                CityRiskComparisonItem(
                    city=city_row.name,
                    aqi=round(float(record.aqi), 1),
                    risk=city_level,
                    color=city_color,
                )
            )

        now = datetime.now(timezone.utc).isoformat()
        if is_hypothetical:
            explanation = (
                f"Hypothetical AQI input {reference_aqi:g} maps to '{level}' using {RISK_RULE_ID}. "
                "This is a what-if scenario, not a measured observation or an ML prediction."
            )
        else:
            explanation = (
                f"Stored AQI {reference_aqi:g} for {city_name} on {observation_date} maps to '{level}' "
                f"using {RISK_RULE_ID}. The mapping is a transparent rule-based ambient exposure guide, "
                "not a trained health-outcome model or an individual medical assessment."
            )

        return RiskAssessmentResponse(
            city=city_name,
            observationDate=observation_date,
            observationSource=observation_source,
            referenceAqi=reference_aqi,
            category=category,
            riskClassification=level,
            ruleIdentifier=RISK_RULE_ID,
            warningTitle=title,
            summary=summary,
            explanation=explanation,
            generalPrecautions=precautions,
            demographicGuidelines=demographic_guidelines,
            riskDistribution=risk_distribution,
            cityRiskComparison=city_comparison,
            metadata=ApiResponseMetadata(
                data_source=data_source,
                model_status="not_trained",
                model_name=None,
                prediction_type="rule_based_risk_assessment",
                is_demo=is_hypothetical,
                timestamp=now,
            ),
        )


# from datetime import datetime
# from sqlalchemy.orm import Session

# from backend.app.schemas.risk import (
#     RiskAssessmentRequest,
#     RiskAssessmentResponse,
#     DemographicGuideline,
#     RiskDistributionItem,
#     CityRiskComparisonItem
# )
# from backend.app.schemas.common import ApiResponseMetadata
# from backend.app.services.standards import get_epa_category, get_risk_assessment
# from fastapi import HTTPException
# class RiskService:
#     def __init__(self, db: Session):
#         self.db = db

#     def assess_risk(self, req: RiskAssessmentRequest) -> RiskAssessmentResponse:
#         # city = req.city or "Delhi"
#         # reference_aqi = req.aqi if req.aqi is not None else CITY_BASELINES.get(city, 120.0)
#         city = req.city or "Delhi"
#         if req.aqi is None:
#             raise HTTPException(
#                 status_code=422,
#                 detail=(
#                     "AQI value is required. Historical AQI lookup by city "
#                     "AQI value is required. Historical AQI lookup by city "
#                 ),
                
#             )
#         reference_aqi = float(req.aqi)
                

#         cat_name, _, _, _ = get_epa_category(reference_aqi)
#         level, color, title, summary, precautions = get_risk_assessment(reference_aqi)

#         demographics = [
#             DemographicGuideline(
#                 group="General Population",
#                 exposureRisk="Moderate to High" if reference_aqi > 150 else "Low",
#                 recommendation="Reduce prolonged heavy physical exertion outdoors during high pollution periods." if reference_aqi > 150 else "Normal outdoor activities permitted."
#             ),
#             DemographicGuideline(
#                 group="Children & Adolescents",
#                 exposureRisk="High" if reference_aqi > 100 else "Low to Moderate",
#                 recommendation="Limit outdoor sports and active recess; prefer ventilated indoor spaces." if reference_aqi > 100 else "Standard outdoor play permitted."
#             ),
#             DemographicGuideline(
#                 group="Older Adults (65+)",
#                 exposureRisk="High" if reference_aqi > 100 else "Low to Moderate",
#                 recommendation="Avoid high-traffic roadways; schedule outdoor walks during midday hours." if reference_aqi > 100 else "Standard outdoor recreation permitted."
#             ),
#             DemographicGuideline(
#                 group="Individuals with Respiratory/Cardiovascular Conditions",
#                 exposureRisk="Significant Vulnerability" if reference_aqi > 50 else "Low",
#                 recommendation="Strictly stay indoors; keep quick-relief inhalers and medications accessible at all times." if reference_aqi > 100 else "Monitor respiratory response and maintain indoor filtration."
#             )
#         ]

#         now = datetime.utcnow().isoformat()

#         return RiskAssessmentResponse(
#             city=city,
#             referenceAqi=reference_aqi,
#             category=cat_name,
#             riskClassification=level,
#             ruleIdentifier="DEMO_MULTI_TIER_RISK_RULE_V1",
#             warningTitle=title,
#             summary=summary,
#             explanation=f"AQI value of {reference_aqi} maps to '{level}' under the transparent demo exposure rule mapping. This classification reflects ambient particulate matter exposure potential rather than an individual clinical diagnosis.",
#             generalPrecautions=precautions,
#             demographicGuidelines=demographics,
#             riskDistribution=[
#                 RiskDistributionItem(level="Low Risk", count=14, percentage=23.3, color="#10B981"),
#                 RiskDistributionItem(level="Moderate Risk", count=24, percentage=40.0, color="#F59E0B"),
#                 RiskDistributionItem(level="High Risk", count=16, percentage=26.7, color="#EF4444"),
#                 RiskDistributionItem(level="Severe Risk", count=6, percentage=10.0, color="#881337"),
#             ],
#             cityRiskComparison=[
#                 CityRiskComparisonItem(city="Delhi", aqi=185.0, risk="High Risk", color="#EF4444"),
#                 CityRiskComparisonItem(city="Hyderabad", aqi=115.0, risk="High Risk", color="#EF4444"),
#                 CityRiskComparisonItem(city="Mumbai", aqi=92.0, risk="Moderate Risk", color="#F59E0B"),
#                 CityRiskComparisonItem(city="Pune", aqi=78.0, risk="Moderate Risk", color="#F59E0B"),
#                 CityRiskComparisonItem(city="Chennai", aqi=65.0, risk="Moderate Risk", color="#F59E0B"),
#                 CityRiskComparisonItem(city="Bengaluru", aqi=48.0, risk="Low Risk", color="#10B981"),
#             ],
#             metadata=ApiResponseMetadata(
#                 data_source="demo",
#                 model_status="not_trained",
#                 model_name=None,
#                 prediction_type="demo",
#                 is_demo=True,
#                 timestamp=now
#             )
#         )
