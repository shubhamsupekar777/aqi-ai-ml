import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "AQI AI — Environmental Intelligence Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    # Defaults to PostgreSQL, gracefully falls back to local SQLite if PostgreSQL is unavailable
    DATABASE_URL: str = "postgresql+psycopg://aqi_user:aqi_password@localhost:5432/aqi_ai"
    SQLITE_FALLBACK_URL: str = "sqlite:///./aqi_ai.db"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # ML & Prediction
    PREDICTION_MODE: str = "demo"  # 'demo' or 'ml'
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")
    
    # Categorization Standard
    DEFAULT_AQI_STANDARD: str = "US_EPA"  # 'US_EPA' or 'INDIA_CPCB'

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
