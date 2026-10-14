from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.risk import RiskAssessmentRequest, RiskAssessmentResponse
from backend.app.services.risk_service import RiskService

router = APIRouter(prefix="/aqi", tags=["Core Feature 4 — Health Risk"])

@router.post("/risk-assessment", response_model=RiskAssessmentResponse, status_code=status.HTTP_200_OK)
def assess_risk(
    request: RiskAssessmentRequest,
    db: Session = Depends(get_db)
):
    service = RiskService(db)
    return service.assess_risk(request)
