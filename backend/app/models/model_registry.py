import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True, index=True)
    version = Column(String(50), nullable=False)
    task_type = Column(String(50), nullable=False) # regression, classification, forecasting
    algorithm = Column(String(100), nullable=False)
    framework = Column(String(100), nullable=False)
    artifact_path = Column(String(255), nullable=True)
    status = Column(String(50), default="in_development") # ready, not_trained, in_development
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    evaluations = relationship("ModelEvaluation", back_populates="model", cascade="all, delete-orphan")

class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey("model_registry.id"), nullable=False, index=True)
    
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    r2 = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1 = Column(Float, nullable=True)
    evaluation_period = Column(String(100), nullable=True)
    is_demo_estimate = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("ModelRegistry", back_populates="evaluations")
