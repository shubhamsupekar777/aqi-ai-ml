import os
import joblib
from typing import Optional, Any, Dict
from backend.app.core.config import settings
from backend.app.core.logging import logger

class ModelLoader:
    """
    Safely loads trained machine learning model artifacts from MODEL_DIR.
    Handles missing models cleanly without crashing application startup.
    """

    _loaded_models: Dict[str, Any] = {}

    @classmethod
    def get_model_path(cls, model_filename: str) -> str:
        return os.path.join(settings.MODEL_DIR, model_filename)

    @classmethod
    def is_model_available(cls, model_filename: str) -> bool:
        path = cls.get_model_path(model_filename)
        return os.path.isfile(path)

    @classmethod
    def load_model(cls, model_filename: str) -> Optional[Any]:
        if model_filename in cls._loaded_models:
            return cls._loaded_models[model_filename]

        path = cls.get_model_path(model_filename)
        if not os.path.isfile(path):
            logger.warning(f"Model artifact '{model_filename}' not found at {path}")
            return None

        try:
            model = joblib.load(path)
            cls._loaded_models[model_filename] = model
            logger.info(f"Successfully loaded ML model artifact: {model_filename}")
            return model
        except Exception as e:
            logger.error(f"Failed to load ML model artifact '{model_filename}': {e}")
            return None
