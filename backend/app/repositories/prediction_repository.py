from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.prediction_record import PredictionRecord

class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_prediction(self, prediction: PredictionRecord) -> PredictionRecord:
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction

    def get_recent(self, limit: int = 10) -> List[PredictionRecord]:
        return (
            self.db.query(PredictionRecord)
            .order_by(desc(PredictionRecord.created_at))
            .limit(limit)
            .all()
        )
