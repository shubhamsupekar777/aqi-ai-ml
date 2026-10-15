
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "backend" / "app" / "data" / "aqi_complete_dataset.csv"
MODEL_DIR = ROOT / "backend" / "app" / "ml" / "models"
MODEL_PATH = MODEL_DIR / "aqi_next_day.joblib"

TARGET = "aqi_next_day"

FEATURES = [
    "City", "AQI",
    "PM2.5", "PM10", "NO", "NO2", "NOx", "NH3",
    "CO", "SO2", "O3", "Benzene", "Toluene", "Xylene",
    "temperature_2m", "relative_humidity_2m",
    "wind_speed_10m", "wind_direction_10m_dominant",
    "precipitation", "surface_pressure",
    "latitude", "longitude",
    "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d",
    "aqi_rolling_mean_7d",
    "day_of_week", "month", "season",
]


AQI_RANGE_COLUMNS = [
    "AQI",
    "aqi_lag_1d",
    "aqi_lag_3d",
    "aqi_lag_7d",
    "aqi_rolling_mean_7d",
    TARGET,
]

df = pd.read_csv(DATA_PATH)
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

for col in AQI_RANGE_COLUMNS:
    df[col] = pd.to_numeric(df[col], errors="coerce")

before = len(df)

valid = (
    df["Date"].notna()
    & df[AQI_RANGE_COLUMNS].notna().all(axis=1)
    & df[AQI_RANGE_COLUMNS].ge(0).all(axis=1)
    & df[AQI_RANGE_COLUMNS].le(500).all(axis=1)
    & df[FEATURES].notna().all(axis=1)
)

df = df.loc[valid].sort_values("Date").copy()

if len(df) < 100:
    raise ValueError("Too few valid rows remain. Review the data before training.")

# Split by date, not randomly, to test on later time periods.
dates = np.sort(df["Date"].unique())
cutoff = pd.Timestamp(dates[int(len(dates) * 0.8)])

train = df[df["Date"] < cutoff]
test = df[df["Date"] >= cutoff]

if train.empty or test.empty:
    raise ValueError("Chronological split produced an empty train/test set.")

X_train = train[FEATURES]
y_train = train[TARGET]
X_test = test[FEATURES]
y_test = test[TARGET]

categorical = ["City", "season"]
numeric = [c for c in FEATURES if c not in categorical]

def make_pipeline(model):
    preprocessing = ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("numeric", StandardScaler(), numeric),
    ])
    return Pipeline([
        ("preprocessing", preprocessing),
        ("model", model),
    ])

candidates = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(
        n_estimators=250,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    ),
}

results = []
best_name = None
best_rmse = float("inf")
best_pipeline = None

print(f"Original rows: {before}")
print(f"Rows retained for Model 1: {len(df)}")
print(f"Rows excluded by screening: {before - len(df)}")
print(f"Training rows: {len(train)}")
print(f"Testing rows: {len(test)}")
print(f"Test dates: {test['Date'].min().date()} to {test['Date'].max().date()}")

for name, estimator in candidates.items():
    pipeline = make_pipeline(estimator)
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    results.append({
        "model": name,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
    })

    print(f"\n{name}: MAE={mae:.3f}, RMSE={rmse:.3f}, R2={r2:.4f}")

    if rmse < best_rmse:
        best_rmse = rmse
        best_name = name
        best_pipeline = pipeline

# Refit the selected model on all screened records for deployment.
best_pipeline.fit(df[FEATURES], df[TARGET])

MODEL_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump({
    "pipeline": best_pipeline,
    "features": FEATURES,
    "model_name": best_name,
    "target": TARGET,
    "metrics": next(r for r in results if r["model"] == best_name),
    "train_test_cutoff": str(cutoff.date()),
}, MODEL_PATH)

print(f"\nSelected model: {best_name}")
print(f"Saved artifact: {MODEL_PATH}")
print("Training complete. Original CSV was not modified.")
