"""Train a smoothed, three-day AQI trend classifier.

Trend labels compare the mean of the next three consecutive daily AQI observations
with the mean of the current and previous two consecutive observations.
The future observations are used only to create labels, never as model features.

This version is saved separately from the original next-day classifier so that
its performance can be reviewed before replacing the baseline artifact.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
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
MODEL_PATH = MODEL_DIR / "aqi_trend_classifier_v2.joblib"
METRICS_PATH = MODEL_DIR / "aqi_trend_classifier_v2_metrics.json"

DATE_COL = "Date"
CITY_COL = "City"
AQI_COL = "AQI"
TREND_COL = "trend_direction"
STABILITY_THRESHOLD = 5.0
FUTURE_DAYS = 3

NUMERIC_FEATURES = [
    "AQI", "PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2", "O3",
    "Benzene", "Toluene", "Xylene", "temperature_2m", "relative_humidity_2m",
    "wind_speed_10m", "wind_direction_10m_dominant", "precipitation",
    "surface_pressure", "latitude", "longitude", "day_of_week", "month",
    "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d", "aqi_rolling_mean_7d",
]
CATEGORICAL_FEATURES = ["City", "season"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
CLASS_LABELS = ["Decreasing", "Stable", "Increasing"]


def make_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline([("imputer", SimpleImputer(strategy="median"))])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
    ], remainder="drop")


def build_smoothed_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Create labels only when a full, consecutive 3-day future and past window exists."""
    df = df.sort_values([CITY_COL, DATE_COL]).copy()
    grouped = df.groupby(CITY_COL, sort=False)

    # Past window includes today's AQI and the two immediately preceding days.
    for offset in (1, 2):
        df[f"_past_aqi_{offset}"] = grouped[AQI_COL].shift(offset)
        df[f"_past_date_{offset}"] = grouped[DATE_COL].shift(offset)

    # Future window starts tomorrow and spans the next 3 consecutive days.
    for offset in (1, 2, 3):
        df[f"_future_aqi_{offset}"] = grouped[AQI_COL].shift(-offset)
        df[f"_future_date_{offset}"] = grouped[DATE_COL].shift(-offset)

    one_day = pd.Timedelta(days=1)
    valid = df[f"_past_date_1"].eq(df[DATE_COL] - one_day)
    valid &= df[f"_past_date_2"].eq(df[DATE_COL] - pd.Timedelta(days=2))
    for offset in (1, 2, 3):
        valid &= df[f"_future_date_{offset}"].eq(df[DATE_COL] + pd.Timedelta(days=offset))
        valid &= df[f"_future_aqi_{offset}"].between(0, 500)
    valid &= df[AQI_COL].between(0, 500)
    valid &= df["_past_aqi_1"].between(0, 500)
    valid &= df["_past_aqi_2"].between(0, 500)

    result = df.loc[valid].copy()
    recent_mean = result[[AQI_COL, "_past_aqi_1", "_past_aqi_2"]].mean(axis=1)
    future_mean = result[["_future_aqi_1", "_future_aqi_2", "_future_aqi_3"]].mean(axis=1)
    delta = future_mean - recent_mean
    result[TREND_COL] = np.select(
        [delta < -STABILITY_THRESHOLD, delta > STABILITY_THRESHOLD],
        ["Decreasing", "Increasing"],
        default="Stable",
    )
    result["_recent_mean"] = recent_mean
    result["_future_mean"] = future_mean
    result["_trend_delta"] = delta
    return result.sort_values([DATE_COL, CITY_COL]).reset_index(drop=True)


def evaluate_model(name: str, estimator, X_train, y_train, X_test, y_test):
    pipeline = Pipeline([
        ("preprocessing", make_preprocessor()),
        ("model", estimator),
    ])
    pipeline.fit(X_train, y_train)
    predicted = pipeline.predict(X_test)
    metrics = {
        "model_name": name,
        "accuracy": float(accuracy_score(y_test, predicted)),
        "balanced_accuracy": float(balanced_accuracy_score(y_test, predicted)),
        "macro_precision": float(precision_score(y_test, predicted, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, predicted, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_test, predicted, average="macro", zero_division=0)),
        "classification_report": classification_report(
            y_test, predicted, labels=CLASS_LABELS, output_dict=True, zero_division=0
        ),
        "confusion_matrix": confusion_matrix(y_test, predicted, labels=CLASS_LABELS).tolist(),
    }
    return pipeline, metrics, predicted


def main() -> None:
    print("\n" + "=" * 80)
    print("AQI TREND CLASSIFICATION V2 — 3-DAY SMOOTHED TARGET")
    print("=" * 80)
    print(f"Dataset: {DATA_PATH}")
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df.columns = [str(column).strip() for column in df.columns]
    required = set(FEATURE_COLUMNS + [DATE_COL, AQI_COL])
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors="coerce")
    df[AQI_COL] = pd.to_numeric(df[AQI_COL], errors="coerce")
    df = df.dropna(subset=[DATE_COL, CITY_COL, AQI_COL]).copy()
    df = df[df[AQI_COL].between(0, 500)].copy()
    original_rows = len(df)

    labeled = build_smoothed_labels(df)
    if labeled.empty:
        raise ValueError("No rows have complete consecutive past/future windows for the smoothed target.")

    unique_dates = np.sort(labeled[DATE_COL].unique())
    if len(unique_dates) < 10:
        raise ValueError("Not enough unique dates for chronological evaluation.")
    split_index = int(len(unique_dates) * 0.80)
    split_date = pd.Timestamp(unique_dates[split_index])

    # Exclude training examples whose 3-day target window touches the test period.
    train_df = labeled[labeled[DATE_COL] + pd.Timedelta(days=FUTURE_DAYS) < split_date].copy()
    test_df = labeled[labeled[DATE_COL] >= split_date].copy()
    if train_df.empty or test_df.empty:
        raise ValueError("Chronological split produced an empty train or test set.")

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TREND_COL]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TREND_COL]

    print(f"Rows with valid AQI before window construction: {original_rows:,}")
    print(f"Rows retained with consecutive past/future windows: {len(labeled):,}")
    print(f"Rows omitted due to missing dates/values or incomplete windows: {original_rows-len(labeled):,}")
    print(f"Date range: {labeled[DATE_COL].min().date()} to {labeled[DATE_COL].max().date()}")
    print(f"Cities: {labeled[CITY_COL].nunique()}")
    print(f"Features: {len(FEATURE_COLUMNS)} (current/past observations only)")
    print("Target: next 3-day mean AQI vs trailing 3-day mean AQI")
    print(f"Trend tolerance: +/-{STABILITY_THRESHOLD:.1f} AQI")
    print("Future AQI values are used only to create training labels, not model inputs.")
    print("\nLABEL COUNTS")
    print(labeled[TREND_COL].value_counts().reindex(CLASS_LABELS, fill_value=0).to_string())
    print("\nCHRONOLOGICAL SPLIT")
    print(f"Train rows: {len(train_df):,} ({train_df[DATE_COL].min().date()} to {train_df[DATE_COL].max().date()})")
    print(f"Test rows:  {len(test_df):,} ({test_df[DATE_COL].min().date()} to {test_df[DATE_COL].max().date()})")
    print(f"Split date: {split_date.date()}")

    candidates = [
        ("RandomForestClassifier_AQI_Trend_3Day", RandomForestClassifier(
            n_estimators=350, random_state=42, n_jobs=-1,
            min_samples_leaf=3, class_weight="balanced_subsample"
        )),
        ("ExtraTreesClassifier_AQI_Trend_3Day", ExtraTreesClassifier(
            n_estimators=350, random_state=42, n_jobs=-1,
            min_samples_leaf=3, class_weight="balanced"
        )),
    ]

    results = []
    trained = []
    for name, estimator in candidates:
        print(f"\nEvaluating {name}...")
        pipeline, metrics, _ = evaluate_model(name, estimator, X_train, y_train, X_test, y_test)
        trained.append((pipeline, metrics))
        results.append({key: metrics[key] for key in (
            "model_name", "accuracy", "balanced_accuracy", "macro_precision", "macro_recall", "macro_f1"
        )})
        print(f"Accuracy: {metrics['accuracy']:.4f}")
        print(f"Balanced accuracy: {metrics['balanced_accuracy']:.4f}")
        print(f"Macro F1: {metrics['macro_f1']:.4f}")
        print(classification_report(y_test, pipeline.predict(X_test), labels=CLASS_LABELS, zero_division=0))
        print("Confusion matrix (rows=actual, columns=predicted):")
        print(pd.DataFrame(metrics["confusion_matrix"], index=CLASS_LABELS, columns=CLASS_LABELS).to_string())

    best_index = max(range(len(trained)), key=lambda i: trained[i][1]["macro_f1"])
    best_pipeline, best_metrics = trained[best_index]
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "pipeline": best_pipeline,
        "features": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "target": TREND_COL,
        "target_definition": "mean(AQI[t+1:t+3]) - mean(AQI[t-2:t])",
        "target_horizon_days": FUTURE_DAYS,
        "stability_threshold": STABILITY_THRESHOLD,
        "class_labels": CLASS_LABELS,
        "model_name": best_metrics["model_name"],
        "training_cutoff": split_date.strftime("%Y-%m-%d"),
    }
    joblib.dump(artifact, MODEL_PATH)

    metrics_payload: dict[str, Any] = {
        "selected_model": best_metrics["model_name"],
        "target_definition": "next 3-day mean AQI compared with trailing 3-day mean AQI",
        "target_horizon_days": FUTURE_DAYS,
        "stability_threshold": STABILITY_THRESHOLD,
        "features": FEATURE_COLUMNS,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_start": train_df[DATE_COL].min().strftime("%Y-%m-%d"),
        "train_end": train_df[DATE_COL].max().strftime("%Y-%m-%d"),
        "test_start": test_df[DATE_COL].min().strftime("%Y-%m-%d"),
        "test_end": test_df[DATE_COL].max().strftime("%Y-%m-%d"),
        "split_date": split_date.strftime("%Y-%m-%d"),
        "label_counts": {str(k): int(v) for k, v in labeled[TREND_COL].value_counts().items()},
        "candidate_results": results,
        "chosen_metrics": best_metrics,
    }
    METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

    print("\n=" * 40)
    print("SAVED V2 EXPERIMENT ARTIFACTS")
    print(f"Selected model: {best_metrics['model_name']}")
    print(f"Model: {MODEL_PATH}")
    print(f"Metrics: {METRICS_PATH}")
    print("Review Model 1 and Model 2 candidate metrics before replacing the original trend model.")


if __name__ == "__main__":
    main()
