from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.prediction import PredictionRequest, PredictionResponse
from backend.app.services.prediction_service import PredictionService

router = APIRouter(prefix="/aqi", tags=["Core Feature 1 — Prediction"])

@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
def predict_aqi(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    service = PredictionService(db)
    return service.predict(request)
