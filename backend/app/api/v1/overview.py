from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.overview_service import OverviewService

router = APIRouter(prefix="/overview", tags=["Overview"])

@router.get("")
def get_overview(
    city: str = Query("Delhi", description="Selected city name"),
    db: Session = Depends(get_db)
):
    service = OverviewService(db)
    return service.get_overview(city=city)
