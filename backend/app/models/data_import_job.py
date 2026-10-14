import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.app.core.database import Base

class DataImportJob(Base):
    __tablename__ = "data_import_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_filename = Column(String(255), nullable=False)
    status = Column(String(50), default="pending") # pending, processing, completed, failed
    rows_read = Column(Integer, default=0)
    rows_inserted = Column(Integer, default=0)
    rows_updated = Column(Integer, default=0)
    rows_rejected = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
