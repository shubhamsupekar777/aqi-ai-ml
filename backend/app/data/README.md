# Historical Dataset Import Pipeline

This directory provides scripts and schema validators for ingesting ground-truth air quality and meteorological CSV datasets into PostgreSQL / SQLite.

## Supported Input Datasets

The ingestion engine natively recognizes columns from standard Indian atmospheric monitoring repositories, such as:
- `cleaned_city_day.csv`
- `weather_data.csv`
- `aqi_weather_merged.csv`

Expected columns:
```text
City, Date, PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene, AQI, AQI_Bucket, temperature_2m, relative_humidity_2m, wind_speed_10m, precipitation
```

## Running an Ingestion Job

Run the batch importer CLI:

```powershell
python -m backend.app.data.import_historical_data --file path/to/your_dataset.csv
```

### Guarantees
- **Idempotency:** Re-running imports on the same dataset updates records rather than duplicating `(city, date)` rows.
- **Safety:** The source CSV is strictly read-only and never modified or deleted.
- **Auditing:** Ingestion metrics (rows read, inserted, updated, and rejected) are committed to the `data_import_jobs` table.
