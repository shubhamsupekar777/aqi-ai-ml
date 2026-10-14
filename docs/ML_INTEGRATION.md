# AQI AI — Machine Learning Integration & Model Transition Guide

## 1. Overview & Architecture

In **Phase 1**, the AQI AI platform executes with `PREDICTION_MODE=demo`, which employs a deterministic, physics-informed diurnal dispersion algorithm. This allows complete end-to-end frontend interaction, API validation, and UI visualization without requiring pre-trained weights.

In **Phase 2**, the backend is engineered to switch seamlessly to **trained machine learning estimators** (Random Forest, XGBoost, LightGBM, and PyTorch LSTM) without requiring any changes to database schemas or frontend components.

```text
backend/app/ml/
├── README.md               # Quick overview of ML folder
├── model_loader.py         # Thread-safe artifact loader with disk cache & fallback
├── inference.py            # Unified interface: dispatches between demo & ML models
├── feature_builder.py      # Leakage-free lag, rolling, and cyclical feature engineering
├── preprocessing.py        # Robust scalers, missing-value imputation, outlier winsorizing
├── model_metadata.py       # Pydantic schemas for model cards, metrics, and SHAP weights
└── models/                 # Storage directory for serialized model bundles
    ├── .gitkeep
    ├── aqi_regressor.joblib       # Trained Phase 2 Regression artifact
    ├── aqi_classifier.joblib      # Trained Phase 2 Classification artifact
    └── lstm_forecaster.pt         # Trained Phase 2 PyTorch LSTM artifact
```

---

## 2. Feature Schema & Input Ordering

To guarantee inference fidelity and avoid feature order mismatch, all models must adhere to the exact feature ordering defined in `app/ml/feature_builder.py`:

```python
FEATURE_COLUMNS = [
    # 1. Base Pollutant Concentrations (µg/m³, CO in mg/m³)
    "pm25", "pm10", "no2", "so2", "co", "o3",
    
    # 2. Meteorological Variables
    "temperature", "humidity", "wind_speed",
    
    # 3. Temporal Lag Features (strictly t - k, no future data)
    "pm25_lag_1h", "pm25_lag_3h", "pm25_lag_6h", "pm25_lag_24h",
    "pm10_lag_24h", "aqi_lag_24h",
    
    # 4. Rolling Window Statistics
    "pm25_rolling_mean_6h", "pm25_rolling_std_6h",
    "pm25_rolling_mean_24h", "pm25_rolling_max_24h",
    
    # 5. Cyclical Trigonometric Time Encodings (sin/cos to preserve circularity)
    "sin_hour", "cos_hour",      # 24-hour diurnal cycle
    "sin_dayofweek", "cos_dayofweek", # 7-day weekly traffic cycle
    "sin_month", "cos_month"     # 12-month seasonal meteorology cycle
]
```

### Cyclical Encoding Formulas
$$\text{sin\_hour} = \sin\left(\frac{2\pi \cdot \text{hour}}{24}\right), \quad \text{cos\_hour} = \cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$
$$\text{sin\_month} = \sin\left(\frac{2\pi \cdot \text{month}}{12}\right), \quad \text{cos\_month} = \cos\left(\frac{2\pi \cdot \text{month}}{12}\right)$$

---

## 3. Step-by-Step Model Drop-In Guide

Follow these steps to transition from Phase 1 demo mode to Phase 2 real ML models:

### Step 1: Train Models with Scikit-Learn or XGBoost
Train your regression pipeline on historical CPCB or EPA dataset. Example Python training snippet:

```python
import joblib
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

# Train your regressor on the FEATURE_COLUMNS matrix
model = XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.03,
    subsample=0.8,
    random_state=42
)
model.fit(X_train, y_train)

# Package into a release dictionary
artifact = {
    "model": model,
    "feature_names": FEATURE_COLUMNS,
    "metrics": {
        "mae": 11.4,
        "rmse": 16.8,
        "r2": 0.912
    },
    "version": "v2.0.0-xgb",
    "trained_at": "2026-10-15T00:00:00Z"
}

# Save artifact
joblib.dump(artifact, "backend/app/ml/models/aqi_regressor.joblib")
```

### Step 2: Copy Artifacts into `backend/app/ml/models/`
Ensure file permissions allow reading:
```bash
cp aqi_regressor.joblib C:\Users\hp\.gemini\antigravity\scratch\aqi-ai\backend\app\ml\models\aqi_regressor.joblib
```

### Step 3: Switch the Backend Mode in `.env`
Open `backend/.env` (or root `.env`) and update the prediction mode flag:
```env
PREDICTION_MODE=ml
MODEL_DIR=app/ml/models
```

### Step 4: Restart FastAPI Backend
Restart the uvicorn development server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
On boot, `ModelLoader` will output:
```text
[INFO] ModelLoader: Detected PREDICTION_MODE=ml.
[INFO] ModelLoader: Successfully loaded aqi_regressor.joblib (Version: v2.0.0-xgb, MAE: 11.4).
[INFO] ML Subsystem active. Live inference ready.
```

---

## 4. Zero-Downtime Resilience & Safe Fallback

If `PREDICTION_MODE=ml` is configured, but the model file is corrupted, missing, or throws an unhandled exception during feature construction:
1. `backend/app/ml/inference.py` catches the error.
2. Emits an error log with the stack trace.
3. Automatically falls back to the deterministic atmospheric dispersion calculation.
4. Returns the response with `"is_demo": true` and `"fallback_reason": "ML model missing or evaluation error"`.

This guarantees that the user-facing web platform **never experiences a 500 Internal Server Error** due to missing model weights.

---

## 5. Verification Commands

Run pytest against the prediction suite to ensure the inference pipeline functions properly under both demo and ML conditions:

```bash
cd C:\Users\hp\.gemini\antigravity\scratch\aqi-ai\backend
python -m pytest tests/test_predictions.py -v
```
