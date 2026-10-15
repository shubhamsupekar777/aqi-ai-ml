import pandas as pd

path = r"backend\app\data\aqi_complete_dataset.csv"
df = pd.read_csv(path)
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

print("\n=== AQI DISTRIBUTION ===")
print(df["AQI"].describe(percentiles=[.50, .90, .95, .99]).to_string())

print("\n=== HIGHEST AQI RECORDS ===")
cols = [
    "City", "Date", "AQI", "AQI_Bucket",
    "PM2.5", "PM10", "NO2", "CO", "SO2", "O3"
]
print(
    df.nlargest(25, "AQI")[cols].to_string(index=False)
)

print("\n=== RECORDS ABOVE 500 BY CITY ===")
high = df[df["AQI"] > 500]
print("Total:", len(high))
print(high.groupby("City").size().sort_values(ascending=False).to_string())

print("\n=== AQI RANGE BY CATEGORY ===")
print(
    df.groupby("AQI_Bucket")["AQI"]
      .agg(["count", "min", "median", "max"])
      .to_string()
)

print("\n=== AQI ABOVE 500 BY CATEGORY ===")
print(high["AQI_Bucket"].value_counts().to_string())

print("\n=== EXTREME POLLUTANT VALUES ===")
for col in ["PM2.5", "PM10", "NO2", "CO", "SO2", "O3"]:
    print(
        f"{col}: min={df[col].min()}, "
        f"median={df[col].median()}, max={df[col].max()}"
    )

print("\nInspection complete. Original CSV was not modified.")
