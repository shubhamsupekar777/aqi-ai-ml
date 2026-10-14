
from pathlib import Path

import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error

BACKEND_DIR = Path(__file__).resolve().parents[3]

DATA_PATH = (
    BACKEND_DIR / "app" / "data" / "aqi_complete_dataset.csv"
)

MODEL_PATH = (
    BACKEND_DIR / "app" / "ml" / "models" / "aqi_next_day.joblib"
)


def main():
    # Load trained model and dataset
    artifact = joblib.load(MODEL_PATH)
    df = pd.read_csv(DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"])

    pipeline = artifact["pipeline"]
    features = artifact["features"]
    target = artifact["target"]

    # Use a row from the held-out testing period
    cutoff = pd.Timestamp(artifact["training_cutoff"])
    test_df = df[df["Date"] >= cutoff].copy()

    test_df = test_df.dropna(subset=features + [target])

    if test_df.empty:
        raise ValueError("No valid test rows found.")

    # Select one row and predict its next-day AQI
    row = test_df.iloc[[0]]
    X = row[features]

    predicted_aqi = float(pipeline.predict(X)[0])
    actual_aqi = float(row[target].iloc[0])

    print("\n--- Model Inference Test ---")
    print(f"City: {row['City'].iloc[0]}")
    print(f"Observation date: {row['Date'].iloc[0].date()}")
    print(f"Actual next-day AQI: {actual_aqi:.2f}")
    print(f"Predicted next-day AQI: {predicted_aqi:.2f}")
    print(f"Absolute error: {abs(actual_aqi - predicted_aqi):.2f}")

    print("\nModel loaded successfully.")
    print("Inference test completed.")


if __name__ == "__main__":
    main()
