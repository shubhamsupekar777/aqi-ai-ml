
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_PATH = BACKEND_DIR / "app" / "data" / "aqi_complete_dataset.csv"
MODEL_DIR = BACKEND_DIR / "app" / "ml" / "models"
MODEL_PATH = MODEL_DIR / "aqi_next_day.joblib"

TARGET = "aqi_next_day"

NUMERIC_FEATURES = [
    "AQI",
    "PM2.5",
    "PM10",
    "NO",
    "NO2",
    "NOx",
    "NH3",
    "CO",
    "SO2",
    "O3",
    "Benzene",
    "Toluene",
    "Xylene",
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m_dominant",
    "precipitation",
    "surface_pressure",
    "latitude",
    "longitude",
    "day_of_week",
    "month",
    "aqi_lag_1d",
    "aqi_lag_3d",
    "aqi_lag_7d",
    "aqi_rolling_mean_7d",
]

CATEGORICAL_FEATURES = ["City", "season"]


def main():
    df = pd.read_csv(DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"], errors="raise")

    required = (
        NUMERIC_FEATURES
        + CATEGORICAL_FEATURES
        + ["Date", TARGET]
    )

    missing_columns = set(required) - set(df.columns)
    if missing_columns:
        raise ValueError(f"Missing columns: {sorted(missing_columns)}")

    if df[required].isna().any().any():
        raise ValueError(
            "Missing values found in model columns. "
            "Investigate and handle them before training."
        )

   
    unique_dates = np.sort(df["Date"].unique())
    split_index = int(len(unique_dates) * 0.80)
    cutoff_date = unique_dates[split_index]

    # train_df = df[df["Date"] < cutoff_date].copy()
    # test_df = df[df["Date"] >= cutoff_date].copy()
    
    train_df = df[
        df["Date"] + pd.Timedelta(days=1) < cutoff_date].copy()
    test_df = df[df["Date"] >= cutoff_date].copy()

    if train_df.empty or test_df.empty:
        raise ValueError("Not enough data for chronological split.")

    feature_columns = NUMERIC_FEATURES + CATEGORICAL_FEATURES

    X_train = train_df[feature_columns]
    y_train = train_df[TARGET]
    X_test = test_df[feature_columns]
    y_test = test_df[TARGET]

    preprocessing = ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", NUMERIC_FEATURES),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORICAL_FEATURES,
            ),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=42,
                    n_jobs=-1,
                    min_samples_leaf=2,
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    
    baseline_predictions = test_df["AQI"].to_numpy()
    baseline_mae = mean_absolute_error(
    y_test, baseline_predictions
)
    baseline_rmse = np.sqrt(
    mean_squared_error(y_test, baseline_predictions)
)
    print("\n--- Baseline Comparison ---")
    print(f"Baseline MAE:  {baseline_mae:.3f}")
    print(f"Baseline RMSE: {baseline_rmse:.3f}")
    print(f"Model MAE:     {mean_absolute_error(y_test, predictions):.3f}")
    print(f"Model RMSE:    {np.sqrt(mean_squared_error(y_test, predictions)):.3f}")

    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(
        {
            "pipeline": pipeline,
            "features": feature_columns,
            "target": TARGET,
            "model_name": "RandomForestRegressor",
            "training_cutoff": str(cutoff_date),
        },
        MODEL_PATH,
    )

    print("Training completed.")
    print(f"Training rows: {len(train_df)}")
    print(f"Testing rows: {len(test_df)}")
    print(f"Test starts: {pd.Timestamp(cutoff_date).date()}")
    print(f"MAE:  {mae:.3f}")
    print(f"RMSE: {rmse:.3f}")
    print(f"R²:   {r2:.3f}")
    print(f"Saved model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
