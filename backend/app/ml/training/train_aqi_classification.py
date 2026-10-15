"""Train and evaluate a Random Forest classifier for Indian CPCB AQI buckets.

Target:
    AQI_Bucket

Important leakage protection:
    The same-row numerical AQI column is deliberately excluded because the
    target category is derived from AQI. Future targets such as aqi_next_day
    and aqi_next_7d are also excluded.

Run from the repository root:
    python -m backend.app.ml.training.train_aqi_classification

Expected input:
    backend/app/data/aqi_complete_dataset.csv

Output:
    backend/app/ml/models/aqi_classification.joblib
"""

from __future__ import annotations

import json
import sys
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
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# File is backend/app/ml/training/train_aqi_classification.py.
BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_PATH = BACKEND_DIR / "app" / "data" / "aqi_complete_dataset.csv"
MODEL_DIR = BACKEND_DIR / "app" / "ml" / "models"
MODEL_PATH = MODEL_DIR / "aqi_classification.joblib"

TARGET = "AQI_Bucket"
DATE_COLUMN = "Date"

# Do not add "AQI" to these features: AQI_Bucket is derived from it.
# The lag/rolling variables are historical features already present in the
# dataset, not same-row/future target values.
NUMERIC_FEATURES = [
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

# CPCB label order makes the confusion matrix easier to read consistently.
CPCB_CATEGORY_ORDER = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]


def _print_section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def _load_and_validate_dataset(path: Path) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Confirm that aqi_complete_dataset.csv exists in backend/app/data/."
        )

    df = pd.read_csv(path)
    df.columns = [str(column).strip() for column in df.columns]

    required_columns = set(FEATURE_COLUMNS + [TARGET, DATE_COLUMN])
    missing_columns = sorted(required_columns - set(df.columns))
    if missing_columns:
        raise ValueError(
            "The classification dataset is missing required columns: "
            + ", ".join(missing_columns)
        )

    # Parse dates strictly so the chronological split is reproducible.
    df[DATE_COLUMN] = pd.to_datetime(df[DATE_COLUMN], errors="coerce")
    df = df.dropna(subset=[DATE_COLUMN, TARGET]).copy()
    df[TARGET] = df[TARGET].astype(str).str.strip()

    invalid_target = df[TARGET].isin(["", "nan", "None", "NaN"])
    df = df.loc[~invalid_target].copy()

    # Ensure numeric columns are represented as numeric; invalid values become
    # NaN and are handled by the training-only median imputers in the pipeline.
    for column in NUMERIC_FEATURES:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    for column in CATEGORICAL_FEATURES:
        df[column] = df[column].replace(r"^\s*$", np.nan, regex=True)

    # Keep known CPCB labels in official bucket order, but don't silently drop
    # any non-empty dataset labels. Unexpected labels are reported explicitly.
    observed_labels = set(df[TARGET].unique())
    unexpected_labels = sorted(observed_labels - set(CPCB_CATEGORY_ORDER))
    if unexpected_labels:
        print(
            "WARNING: Dataset contains AQI_Bucket labels outside the expected "
            f"CPCB bucket names: {unexpected_labels}"
        )

    if df.empty:
        raise ValueError("No rows with a valid date and AQI_Bucket label remain.")

    return df.sort_values(DATE_COLUMN).reset_index(drop=True)


def _chronological_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.Timestamp]:
    unique_dates = np.sort(df[DATE_COLUMN].dropna().unique())
    if len(unique_dates) < 2:
        raise ValueError("At least two distinct dates are required for a time-based split.")

    split_index = int(len(unique_dates) * 0.80)
    split_index = min(max(split_index, 1), len(unique_dates) - 1)
    split_date = pd.Timestamp(unique_dates[split_index])

    train_df = df.loc[df[DATE_COLUMN] < split_date].copy()
    test_df = df.loc[df[DATE_COLUMN] >= split_date].copy()

    if train_df.empty or test_df.empty:
        raise ValueError("Chronological split produced an empty training or test set.")

    # A class present only in the test interval cannot be learned by the model.
    unseen_test_labels = sorted(set(test_df[TARGET]) - set(train_df[TARGET]))
    if unseen_test_labels:
        print(
            "WARNING: These labels occur in the test interval but not the training "
            f"interval, so the model cannot learn them: {unseen_test_labels}"
        )

    return train_df, test_df, split_date


def main() -> None:
    _print_section("AQI CLASSIFICATION — DATA VALIDATION")
    print(f"Dataset: {DATA_PATH}")
    df = _load_and_validate_dataset(DATA_PATH)

    print(f"Rows available: {len(df):,}")
    print(f"Date range: {df[DATE_COLUMN].min().date()} to {df[DATE_COLUMN].max().date()}")
    print(f"Cities: {df['City'].nunique()}")
    print(f"Features: {len(FEATURE_COLUMNS)}")
    print(f"Target: {TARGET}")
    print("Numerical AQI column included as input: NO (leakage prevented)")
    print("Future target columns included as input: NO")

    _print_section("AQI BUCKET LABEL COUNTS")
    print(df[TARGET].value_counts().reindex(
        [label for label in CPCB_CATEGORY_ORDER if label in set(df[TARGET])],
        fill_value=0,
    ).to_string())

    train_df, test_df, split_date = _chronological_split(df)
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET]

    # Fit imputers and encoders only on the training interval to avoid leakage.
    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median"))]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessing = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    n_jobs=-1,
                    min_samples_leaf=2,
                    max_features="sqrt",
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )

    _print_section("TRAINING")
    print(f"Training rows: {len(train_df):,}")
    print(f"Test rows: {len(test_df):,}")
    print(f"Training dates: {train_df[DATE_COLUMN].min().date()} to {train_df[DATE_COLUMN].max().date()}")
    print(f"Test dates: {test_df[DATE_COLUMN].min().date()} to {test_df[DATE_COLUMN].max().date()}")
    print(f"Split date: {split_date.date()}")

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    label_order = [label for label in CPCB_CATEGORY_ORDER if label in set(y_train) | set(y_test)]
    other_labels = sorted((set(y_train) | set(y_test)) - set(label_order))
    label_order.extend(other_labels)

    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_precision": float(precision_score(y_test, y_pred, labels=label_order, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, y_pred, labels=label_order, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_test, y_pred, labels=label_order, average="macro", zero_division=0)),
        "test_rows": int(len(test_df)),
        "training_rows": int(len(train_df)),
        "split_date": split_date.strftime("%Y-%m-%d"),
    }

    _print_section("EVALUATION METRICS — CHRONOLOGICAL HOLDOUT")
    print(f"Accuracy:       {metrics['accuracy']:.4f}")
    print(f"Macro precision:{metrics['macro_precision']:.4f}")
    print(f"Macro recall:   {metrics['macro_recall']:.4f}")
    print(f"Macro F1-score: {metrics['macro_f1']:.4f}")

    _print_section("CLASSIFICATION REPORT")
    print(classification_report(y_test, y_pred, labels=label_order, zero_division=0))

    _print_section("CONFUSION MATRIX (rows=actual, columns=predicted)")
    cm = confusion_matrix(y_test, y_pred, labels=label_order)
    print(pd.DataFrame(cm, index=label_order, columns=label_order).to_string())

    # Store all information the inference endpoint needs, plus evaluation
    # details for later display. Save only after model training has succeeded.
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "pipeline": pipeline,
        "features": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "target": TARGET,
        "classes": [str(value) for value in pipeline.named_steps["classifier"].classes_],
        "model_name": "RandomForestClassifier_AQI_Bucket",
        "model_version": "1.0.0",
        "classification_standard": "INDIA_CPCB",
        "training_cutoff": split_date.strftime("%Y-%m-%d"),
        "metrics": metrics,
        "label_order": label_order,
        "confusion_matrix": cm.tolist(),
    }
    joblib.dump(artifact, MODEL_PATH)

    metrics_path = MODEL_DIR / "aqi_classification_metrics.json"
    with metrics_path.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    _print_section("SAVED ARTIFACTS")
    print(f"Trained model: {MODEL_PATH}")
    print(f"Metrics JSON:  {metrics_path}")
    print("Training finished successfully. Review the evaluation report before deploying this model.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
