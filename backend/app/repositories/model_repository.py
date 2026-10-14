from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.model_registry import ModelRegistry, ModelEvaluation

class ModelRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all_models(self) -> List[ModelRegistry]:
        return self.db.query(ModelRegistry).all()

    def get_by_name(self, name: str) -> Optional[ModelRegistry]:
        return self.db.query(ModelRegistry).filter(ModelRegistry.name == name).first()

    def get_evaluations(self, model_id: str) -> List[ModelEvaluation]:
        return (
            self.db.query(ModelEvaluation)
            .filter(ModelEvaluation.model_id == model_id)
            .all()
        )
