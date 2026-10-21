import os
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AQI AI — Environmental Intelligence Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:Shubham12345@localhost:5432/aqi"
    SQLITE_FALLBACK_URL: str = "sqlite:///./aqi_ai.db"

    # Legacy source keys kept temporarily so other existing integrations are not broken.
    DATA_GOV_IN_API_KEY: Optional[str] = None
    DATA_GOV_IN_RESOURCE_ID: str = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
    AQI_API_KEY: Optional[str] = None  # XKDR key; not used by the OpenAQ live-observation service

    # OpenAQ API v3. Keep this key only in backend/root .env, never in React.
    OPENAQ_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # ML & Prediction
    PREDICTION_MODE: str = "demo"  # 'demo' or 'ml'
    MODEL_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "ml", "models"
    )

    # Categorization Standard
    DEFAULT_AQI_STANDARD: str = "US_EPA"  # 'US_EPA' or 'INDIA_CPCB'

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        if isinstance(v, (list, str)):
            return v  # type: ignore[return-value]
        return ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
