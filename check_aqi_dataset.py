import pandas as pd
import numpy as np

path = r"backend\app\data\aqi_complete_dataset.csv"
df = pd.read_csv(path)
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

print("\n=== DATASET SUMMARY ===")
print("Rows and columns:", df.shape)
print("Cities:", df["City"].nunique())
print("Date range:", df["Date"].min(), "to", df["Date"].max())
print("Duplicate city-date pairs:", df.duplicated(["City", "Date"]).sum())

print("\n=== AQI AND FEATURE RANGES ===")
columns = [
    "AQI", "aqi_lag_1d", "aqi_lag_3d", "aqi_lag_7d",
    "aqi_rolling_mean_7d", "aqi_next_day", "aqi_next_7d"
]

for col in columns:
    s = pd.to_numeric(df[col], errors="coerce")
    print(
        f"{col}: min={s.min()}, max={s.max()}, "
        f"negative={(s < 0).sum()}, above_500={(s > 500).sum()}"
    )

print("\n=== AQI CATEGORY COUNTS ===")
print(df["AQI_Bucket"].value_counts(dropna=False).to_string())

# Verify lag values against observations on the exact prior calendar date.
lookup = df[["City", "Date", "AQI"]].drop_duplicates(["City", "Date"])

print("\n=== LAG ALIGNMENT CHECK ===")
for days, col in [(1, "aqi_lag_1d"), (3, "aqi_lag_3d"), (7, "aqi_lag_7d")]:
    past = lookup.rename(columns={
        "Date": "past_date",
        "AQI": "actual_past_AQI"
    })
    check = df[["City", "Date", col]].copy()
    check["past_date"] = check["Date"] - pd.Timedelta(days=days)
    check = check.merge(past, on=["City", "past_date"], how="left")
    available = check["actual_past_AQI"].notna()
    matches = np.isclose(
        check.loc[available, col],
        check.loc[available, "actual_past_AQI"]
    )
    print(
        f"{col}: comparable={available.sum()}, "
        f"mismatches={(~matches).sum()}"
    )

# Verify future targets against AQI recorded on the exact future date.
print("\n=== FUTURE TARGET CHECK ===")
for days, col in [(1, "aqi_next_day"), (7, "aqi_next_7d")]:
    future = lookup.rename(columns={
        "Date": "future_date",
        "AQI": "actual_future_AQI"
    })
    check = df[["City", "Date", col]].copy()
    check["future_date"] = check["Date"] + pd.Timedelta(days=days)
    check = check.merge(future, on=["City", "future_date"], how="left")
    available = check["actual_future_AQI"].notna()
    matches = np.isclose(
        check.loc[available, col],
        check.loc[available, "actual_future_AQI"]
    )
    print(
        f"{col}: comparable={available.sum()}, "
        f"mismatches={(~matches).sum()}"
    )

print("\nValidation complete. No dataset values were modified.")
