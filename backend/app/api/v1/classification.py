from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.classification import ClassificationRequest, ClassificationResponse
from backend.app.services.classification_service import ClassificationService

router = APIRouter(prefix="/aqi", tags=["Core Feature 2 — Classification"])

@router.post("/classify", response_model=ClassificationResponse, status_code=status.HTTP_200_OK)
def classify_aqi(
    request: ClassificationRequest,
    db: Session = Depends(get_db)
):
    service = ClassificationService(db)
    return service.classify(request)
