# from fastapi import APIRouter, Depends, status
# from sqlalchemy.orm import Session
# from backend.app.core.database import get_db
# from backend.app.schemas.prediction import PredictionRequest, PredictionResponse
# from backend.app.services.prediction_service import PredictionService

# router = APIRouter(prefix="/aqi", tags=["Core Feature 1 — Prediction"])

# @router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
# def predict_aqi(
#     request: PredictionRequest,
#     db: Session = Depends(get_db)
# ):
#     service = PredictionService(db)
#     return service.predict(request)
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.prediction import PredictionRequest, PredictionResponse
from backend.app.services.prediction_service import PredictionService

router = APIRouter(prefix="/aqi", tags=["Core Feature 1 — Prediction"])


@router.get("/prediction-features")
def get_prediction_feature_defaults(
    city: str = Query(..., min_length=1, description="City name returned by GET /api/v1/cities"),
    db: Session = Depends(get_db),
):
    """Return the latest stored model-input values for editable Advanced Mode fields."""
    service = PredictionService(db)
    return service.get_feature_defaults(city)


@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
def predict_aqi(
    request: PredictionRequest,
    db: Session = Depends(get_db),
):
    service = PredictionService(db)
    return service.predict(request)
