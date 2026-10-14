# AQI AI — Historical Dataset Schema & Ingestion Guide

## 1. Overview & Data Sources

The **AQI AI** ingestion subsystem accepts continuous ambient air monitoring records from open and government sources, including:
1. **Central Pollution Control Board (CPCB) India:** Official daily and hourly station datasets (e.g., Kaggle *Air Quality Data in India* (2015–2020)).
2. **US EPA AirNow / OpenAQ:** Standardized global ambient particulate and gas sensor networks.
3. **ERA5 / Open-Meteo Reanalysis:** Meteorological observations for atmospheric boundary-layer modeling.

The ingestion engine is located in `backend/app/data/import_historical_data.py` and features schema mapping, boundary validation, and idempotent database upserts.

---

## 2. Ingestion Schema Specification

### 2.1 Core Atmospheric Columns
| Column Name | Required | Standard Units | Valid Physical Range | Description |
| :--- | :---: | :---: | :---: | :--- |
| `City` | Yes | string | — | Monitored metropolitan area or station city name |
| `Date` / `Timestamp` | Yes | ISO 8601 / `YYYY-MM-DD` | — | Observation date or UTC datetime stamp |
| `PM2.5` | Yes | $\mu g/m^3$ | `0.0 – 1000.0` | Fine particulate matter ($< 2.5\,\mu m$) |
| `PM10` | Optional | $\mu g/m^3$ | `0.0 – 1500.0` | Inhalable coarse particulate matter ($< 10\,\mu m$) |
| `NO2` | Optional | $\mu g/m^3$ | `0.0 – 500.0` | Nitrogen Dioxide combustion tracer |
| `SO2` | Optional | $\mu g/m^3$ | `0.0 – 500.0` | Sulfur Dioxide industrial byproduct |
| `CO` | Optional | $mg/m^3$ | `0.0 – 50.0` | Carbon Monoxide incomplete combustion |
| `O3` | Optional | $\mu g/m^3$ | `0.0 – 400.0` | Ground-level Tropospheric Ozone photochemical oxidant |
| `AQI` | Optional | index (0–500) | `0.0 – 500.0` | Precomputed statutory air quality index |
| `AQI_Bucket` | Optional | string | — | Categorical classification label |

### 2.2 Optional Meteorological Columns (for Phase 2 ML)
| Column Name | Units | Valid Range | Physical Significance |
| :--- | :---: | :---: | :--- |
| `Temperature` | $^\circ C$ | `-20.0 – 55.0` | Controls convection and photochemical ozone generation |
| `Humidity` | $\%$ | `0.0 – 100.0` | Promotes hygroscopic aerosol particle growth and smog haze |
| `Wind_Speed` | $km/h$ | `0.0 – 120.0` | Horizontal ventilation and pollutant dispersion |
| `Wind_Direction`| Degrees ($0-360^\circ$) | `0 – 360` | Identifies upwind emission plumes |

---

## 3. Command-Line Ingestion Instructions

The backend provides a high-throughput CLI tool supporting chunked ingestion and batch transactions into PostgreSQL or SQLite:

```bash
# Navigate to backend directory
cd C:\Users\hp\.gemini\antigravity\scratch\aqi-ai\backend

# Run ingestion for a specific city dataset
python app/data/import_historical_data.py --csv path/to/city_day.csv --city "Delhi" --batch-size 1000

# Run ingestion across all cities present in a unified CSV
python app/data/import_historical_data.py --csv path/to/all_cities.csv --auto-detect-cities
```

### Ingestion Output Example
```text
[INFO] Initializing Historical Data Importer...
[INFO] Reading source CSV: data/raw/delhi_2015_2020.csv (Total rows: 2009)
[INFO] Schema validated: 8 pollutant columns detected.
[INFO] Processing batch 1/3 (Rows 1-1000)... Success.
[INFO] Processing batch 2/3 (Rows 1001-2000)... Success.
[INFO] Processing batch 3/3 (Rows 2001-2009)... Success.
[INFO] Completed: 2009 records upserted. DataImportJob ID: 41. Errors: 0.
```

---

## 4. Data Quality & Preprocessing Rules

The `app/data/validators.py` and `app/ml/preprocessing.py` modules enforce the following scientific quality checks:

1. **Negative Value Elimination:**
   Raw sensor calibration spikes frequently output negative sensor voltages. All negative values for mass concentrations are clipped or coerced to zero.
2. **Extreme Outlier Capping:**
   Particulate sensor readings exceeding physically plausible planetary boundary layer thresholds ($\text{PM}_{2.5} > 1000\,\mu g/m^3$, $\text{PM}_{10} > 1500\,\mu g/m^3$) are flagged and winsorized at the 99.9th percentile.
3. **Temporal Continuity & Gap Imputation:**
   - **Small gaps ($\le 3$ hours):** Linear piecewise interpolation.
   - **Medium gaps ($4-24$ hours):** Diurnal profile rolling median from equivalent weekday hours.
   - **Extended gaps ($> 24$ hours):** Excluded from continuous lag construction to prevent training contamination.
4. **Target Leakage Prevention:**
   When calculating future target variables (e.g. $AQI_{t+24}$), strict temporal splitting is enforced:
   - Rolling features and lag features $\text{Lag}_k(x_t) = x_{t-k}$ are computed exclusively using historical data prior to time $t$.
   - Forward-looking rolling means or target values are strictly forbidden in training feature sets.
