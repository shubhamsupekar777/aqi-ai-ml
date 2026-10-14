from fastapi import APIRouter

from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.overview import router as overview_router
from backend.app.api.v1.cities import router as cities_router
from backend.app.api.v1.history import router as history_router
from backend.app.api.v1.predictions import router as predictions_router
from backend.app.api.v1.classification import router as classification_router
from backend.app.api.v1.trends import router as trends_router
from backend.app.api.v1.risks import router as risks_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.models import router as models_router

api_router = APIRouter()

# Include all subrouters
api_router.include_router(health_router)
api_router.include_router(overview_router)
api_router.include_router(cities_router)
api_router.include_router(history_router)
api_router.include_router(predictions_router)
api_router.include_router(classification_router)
api_router.include_router(trends_router)
api_router.include_router(risks_router)
api_router.include_router(analytics_router)
api_router.include_router(models_router)
