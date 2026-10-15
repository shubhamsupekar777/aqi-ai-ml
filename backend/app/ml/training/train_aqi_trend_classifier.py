"""Train a Random Forest classifier for next-day AQI trend direction.

Target labels are derived from the observed current AQI and the precomputed
next-day target in aqi_complete_dataset.csv:
  - Increasing: next-day AQI - current AQI > 3
  - Decreasing: next-day AQI - current AQI < -3
  - Stable:     absolute change <= 3

The tolerance matches backend.app.services.standards.determine_trend.
Current AQI is a valid input feature; future AQI is used only to create the
label and is never included as a model input.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_PATH = BACKEND_DIR / "app" / "data" / "aqi_complete_dataset.csv"
MODEL_DIR = BACKEND_DIR / "app" / "ml" / "models"
MODEL_PATH = MODEL_DIR / "aqi_trend_classifier.joblib"
METRICS_PATH = MODEL_DIR / "aqi_trend_classifier_metrics.json"

TARGET_AQI_COLUMN = "aqi_next_day"
CURRENT_AQI_COLUMN = "AQI"
TREND_COLUMN = "trend_direction"
STABILITY_THRESHOLD = 3.0

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
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
CLASS_LABELS = ["Decreasing", "Stable", "Increasing"]


def make_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median"))]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def build_trend_labels(frame: pd.DataFrame) -> pd.Series:
    delta = frame[TARGET_AQI_COLUMN].astype(float) - frame[CURRENT_AQI_COLUMN].astype(float)
    labels = np.where(
        delta > STABILITY_THRESHOLD,
        "Increasing",
        np.where(delta < -STABILITY_THRESHOLD, "Decreasing", "Stable"),
    )
    return pd.Series(labels, index=frame.index, name=TREND_COLUMN)


def main() -> None:
    print("\n" + "=" * 80)
    print("AQI TREND CLASSIFICATION — DATA VALIDATION")
    print("=" * 80)
    print(f"Dataset: {DATA_PATH}")

    if not DATA_PATH.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}. Make sure the file exists at backend/app/data/aqi_complete_dataset.csv."
        )

    df = pd.read_csv(DATA_PATH)
    df.columns = [column.strip() for column in df.columns]

    required = set(FEATURE_COLUMNS + ["Date", TARGET_AQI_COLUMN])
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df[CURRENT_AQI_COLUMN] = pd.to_numeric(df[CURRENT_AQI_COLUMN], errors="coerce")
    df[TARGET_AQI_COLUMN] = pd.to_numeric(df[TARGET_AQI_COLUMN], errors="coerce")

    original_count = len(df)
    df = df.dropna(subset=["Date", CURRENT_AQI_COLUMN, TARGET_AQI_COLUMN]).copy()

    # Keep labels in the project's 0–500 AQI display range. This removes
    # invalid/extreme values without using future data as model features.
    df = df[
        df[CURRENT_AQI_COLUMN].between(0, 500)
        & df[TARGET_AQI_COLUMN].between(0, 500)
    ].copy()
    if df.empty:
        raise ValueError("No valid rows remain after filtering current and next-day AQI values to 0–500.")

    df[TREND_COLUMN] = build_trend_labels(df)
    df = df.sort_values(["Date", "City"]).reset_index(drop=True)

    unique_dates = np.sort(df["Date"].dropna().unique())
    if len(unique_dates) < 10:
        raise ValueError("Not enough unique dates for a reliable chronological train/test split.")
    split_index = int(len(unique_dates) * 0.80)
    split_date = pd.Timestamp(unique_dates[split_index])

    # Exclude the final pre-cutoff day from training so its next-day label
    # cannot overlap the chronological test period.
    train_df = df[df["Date"] + pd.Timedelta(days=1) < split_date].copy()
    test_df = df[df["Date"] >= split_date].copy()

    if train_df.empty or test_df.empty:
        raise ValueError("Chronological split produced an empty training or test set.")

    # Verify we can evaluate every target class present in the overall data.
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TREND_COLUMN]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TREND_COLUMN]

    print(f"Rows in original dataset: {original_count:,}")
    print(f"Rows retained with valid AQI and next-day target (0–500): {len(df):,}")
    print(f"Rows omitted for missing/invalid target: {original_count - len(df):,}")
    print(f"Date range: {df['Date'].min().date()} to {df['Date'].max().date()}")
    print(f"Cities: {df['City'].nunique()}")
    print(f"Features: {len(FEATURE_COLUMNS)} ({len(NUMERIC_FEATURES)} numeric + {len(CATEGORICAL_FEATURES)} categorical)")
    print(f"Target: {TREND_COLUMN}, built from {TARGET_AQI_COLUMN} - {CURRENT_AQI_COLUMN}")
    print(f"AQI input is included as the observed baseline: YES")
    print(f"Future target AQI included as a model input: NO")
    print(f"Stability tolerance: +/-{STABILITY_THRESHOLD:.1f} AQI")

    print("\nTREND LABEL COUNTS — ALL ELIGIBLE ROWS")
    print(df[TREND_COLUMN].value_counts().reindex(CLASS_LABELS, fill_value=0).to_string())
    print("\nTRAINING")
    print(f"Training rows: {len(train_df):,}")
    print(f"Test rows: {len(test_df):,}")
    print(f"Training dates: {train_df['Date'].min().date()} to {train_df['Date'].max().date()}")
    print(f"Test dates: {test_df['Date'].min().date()} to {test_df['Date'].max().date()}")
    print(f"Split date: {split_date.date()}")
    print("\nTraining label counts:")
    print(y_train.value_counts().reindex(CLASS_LABELS, fill_value=0).to_string())
    print("\nTest label counts:")
    print(y_test.value_counts().reindex(CLASS_LABELS, fill_value=0).to_string())

    pipeline = Pipeline(
        steps=[
            ("preprocessing", make_preprocessor()),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    n_jobs=-1,
                    min_samples_leaf=2,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )

    print("\nFitting RandomForestClassifier...")
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    balanced_accuracy = balanced_accuracy_score(y_test, predictions)
    macro_precision = precision_score(y_test, predictions, average="macro", zero_division=0)
    macro_recall = recall_score(y_test, predictions, average="macro", zero_division=0)
    macro_f1 = f1_score(y_test, predictions, average="macro", zero_division=0)
    report: dict[str, Any] = classification_report(
        y_test,
        predictions,
        labels=CLASS_LABELS,
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_test, predictions, labels=CLASS_LABELS)

    print("\n" + "=" * 80)
    print("EVALUATION METRICS — CHRONOLOGICAL HOLDOUT")
    print("=" * 80)
    print(f"Accuracy:        {accuracy:.4f}")
    print(f"Balanced accuracy: {balanced_accuracy:.4f}")
    print(f"Macro precision: {macro_precision:.4f}")
    print(f"Macro recall:    {macro_recall:.4f}")
    print(f"Macro F1-score:  {macro_f1:.4f}")
    print("\nCLASSIFICATION REPORT")
    print(
        classification_report(
            y_test,
            predictions,
            labels=CLASS_LABELS,
            zero_division=0,
        )
    )
    print("CONFUSION MATRIX (rows=actual, columns=predicted)")
    print(pd.DataFrame(cm, index=CLASS_LABELS, columns=CLASS_LABELS).to_string())

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "pipeline": pipeline,
        "features": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "target": TREND_COLUMN,
        "target_source": f"{TARGET_AQI_COLUMN} - {CURRENT_AQI_COLUMN}",
        "stability_threshold": STABILITY_THRESHOLD,
        "class_labels": CLASS_LABELS,
        "model_name": "RandomForestClassifier_AQI_Trend",
        "training_cutoff": split_date.strftime("%Y-%m-%d"),
    }
    joblib.dump(artifact, MODEL_PATH)

    metrics = {
        "model_name": "RandomForestClassifier_AQI_Trend",
        "target": TREND_COLUMN,
        "target_source": f"{TARGET_AQI_COLUMN} - {CURRENT_AQI_COLUMN}",
        "stability_threshold": STABILITY_THRESHOLD,
        "features": FEATURE_COLUMNS,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_start": train_df["Date"].min().strftime("%Y-%m-%d"),
        "train_end": train_df["Date"].max().strftime("%Y-%m-%d"),
        "test_start": test_df["Date"].min().strftime("%Y-%m-%d"),
        "test_end": test_df["Date"].max().strftime("%Y-%m-%d"),
        "split_date": split_date.strftime("%Y-%m-%d"),
        "class_counts_all": {str(k): int(v) for k, v in df[TREND_COLUMN].value_counts().items()},
        "accuracy": float(accuracy),
        "balanced_accuracy": float(balanced_accuracy),
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "macro_f1": float(macro_f1),
        "classification_report": report,
        "confusion_matrix_labels": CLASS_LABELS,
        "confusion_matrix": cm.tolist(),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("\nSAVED ARTIFACTS")
    print(f"Trained model: {MODEL_PATH}")
    print(f"Metrics JSON:  {METRICS_PATH}")
    print("Training finished successfully. Review the evaluation report before deploying this model.")


if __name__ == "__main__":
    main()
