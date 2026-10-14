# AQI AI — Machine Learning Directory & Model Registry

This directory contains the machine learning inference pipelines, feature engineering, and model artifact loading architecture for AQI AI.

## Directory Structure

```text
ml/
├── README.md               # This documentation
├── feature_builder.py      # Time-series feature generation (lags, rolling stats)
├── inference.py            # Primary inference orchestration
├── model_loader.py         # Safe artifact loading from disk with cache
├── model_metadata.py       # Feature order and model hyperparameters
├── preprocessing.py        # Missing value imputation and numerical scaling
└── models/                 # Destination folder for serialized model weights
    └── .gitkeep
```

## Adding Trained Models (Phase 2)

To deploy trained models into the platform:

1. Train your model using historical data without target leakage.
2. Ensure the feature ordering matches `EXPECTED_FEATURES` in `model_metadata.py`.
3. Save the trained model using `joblib`:
   ```python
   import joblib
   joblib.dump(model, "backend/app/ml/models/random_forest_aqi.joblib")
   ```
4. Update `.env` to enable real ML inference:
   ```env
   PREDICTION_MODE=ml
   ```
5. Test inference using `POST /api/v1/aqi/predict`.
