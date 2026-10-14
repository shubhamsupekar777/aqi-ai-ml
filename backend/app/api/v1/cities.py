from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.repositories.city_repository import CityRepository
from backend.app.schemas.city import CityResponse

router = APIRouter(prefix="/cities", tags=["Cities"])

DEFAULT_CITIES = [
    {"id": "delhi", "name": "Delhi", "state": "Delhi (NCT)", "country": "India", "latitude": 28.6139, "longitude": 77.2090},
    {"id": "mumbai", "name": "Mumbai", "state": "Maharashtra", "country": "India", "latitude": 19.0760, "longitude": 72.8777},
    {"id": "pune", "name": "Pune", "state": "Maharashtra", "country": "India", "latitude": 18.5204, "longitude": 73.8567},
    {"id": "bengaluru", "name": "Bengaluru", "state": "Karnataka", "country": "India", "latitude": 12.9716, "longitude": 77.5946},
    {"id": "chennai", "name": "Chennai", "state": "Tamil Nadu", "country": "India", "latitude": 13.0827, "longitude": 80.2707},
    {"id": "hyderabad", "name": "Hyderabad", "state": "Telangana", "country": "India", "latitude": 17.3850, "longitude": 78.4867},
]

@router.get("", response_model=List[CityResponse])
def get_cities(db: Session = Depends(get_db)):
    repo = CityRepository(db)
    db_cities = repo.get_all()
    if db_cities:
        return db_cities
    return [CityResponse(**c) for c in DEFAULT_CITIES]

@router.get("/{city_id}", response_model=CityResponse)
def get_city_by_id(city_id: str, db: Session = Depends(get_db)):
    repo = CityRepository(db)
    city = repo.get_by_id(city_id)
    if city:
        return city
    # Check default cities list
    for c in DEFAULT_CITIES:
        if c["id"] == city_id or c["name"].lower() == city_id.lower():
            return CityResponse(**c)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"City '{city_id}' not found")
