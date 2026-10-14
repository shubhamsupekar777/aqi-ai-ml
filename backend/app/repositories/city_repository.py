from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.city import City

class CityRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[City]:
        return self.db.query(City).order_by(City.name).all()

    def get_by_id(self, city_id: str) -> Optional[City]:
        return self.db.query(City).filter(City.id == city_id).first()

    def get_by_name(self, name: str) -> Optional[City]:
        return self.db.query(City).filter(City.name.ilike(name.strip())).first()

    def create(self, city: City) -> City:
        self.db.add(city)
        self.db.commit()
        self.db.refresh(city)
        return city
