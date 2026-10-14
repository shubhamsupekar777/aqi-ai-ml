# AQI AI — REST API Reference & Specification

## 1. Overview & General Conventions

- **Base URL:** `http://localhost:8000`
- **Versioned Prefix:** `/api/v1`
- **Content-Type:** `application/json`
- **Authentication:** None in Phase 1 (Academic & Prototyping Scope)
- **Response Enveloping:** All major endpoints return response objects containing operational data accompanied by structured metadata (`meta`).

### Standard Response Metadata Schema (`ApiResponseMetadata`)
Every response includes a `meta` block indicating execution context:
```json
{
  "timestamp": "2026-10-13T21:00:00Z",
  "is_demo": true,
  "model_version": "v1.0.0-demo",
  "data_source": "synthetic_atmospheric_simulation",
  "disclaimer": "Simulated environmental intelligence for demonstration and prototyping purposes."
}
```

---

## 2. Health & Diagnostics Endpoints

### 2.1 Service Health
`GET /health`
- **Description:** Returns application status and uptime.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "app": "AQI AI Backend",
  "version": "1.0.0",
  "mode": "demo"
}
```

### 2.2 Database Connectivity Health
`GET /health/database`
- **Description:** Inspects database pool status and active database engine.
- **Response (200 OK):**
```json
{
  "status": "connected",
  "engine": "postgresql",
  "connection_string_masked": "postgresql+psycopg://postgres:***@localhost:5432/aqi_ai"
}
```

---

## 3. Cities & Geographic Scope

### 3.1 List Monitored Cities
`GET /api/v1/cities`
- **Description:** Returns all configured monitoring stations and geographic coordinates.
- **Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Delhi",
    "state": "Delhi (NCT)",
    "country": "India",
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  {
    "id": 2,
    "name": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "latitude": 19.0760,
    "longitude": 72.8777
  }
]
```

### 3.2 Get City Details
`GET /api/v1/cities/{id}`
- **Parameters:** `id` (integer, path parameter)
- **Response (200 OK):** City object or 404 if not found.

---

## 4. Feature 1: AQI Prediction (Regression)

### 4.1 Generate AQI Prediction
`POST /api/v1/aqi/predict`
- **Description:** Predicts continuous numerical AQI value for a specified horizon (1h to 72h) with confidence intervals and key driving features.
- **Request Body:**
```json
{
  "city_id": 1,
  "horizon_hours": 24,
  "standard": "epa",
  "current_aqi": 185.0,
  "pm25": 112.5,
  "pm10": 190.0,
  "no2": 45.2,
  "so2": 15.0,
  "co": 1.2,
  "o3": 28.0,
  "temperature": 26.5,
  "humidity": 68.0,
  "wind_speed": 4.2
}
```
- **Response (200 OK):**
```json
{
  "city_id": 1,
  "horizon_hours": 24,
  "predicted_aqi": 204.6,
  "confidence_interval_lower": 182.1,
  "confidence_interval_upper": 227.1,
  "current_aqi": 185.0,
  "delta": 19.6,
  "dominant_pollutant": "PM2.5",
  "driving_factors": [
    { "factor": "PM2.5 Stagnation", "importance": 0.42, "description": "High particulate loading from preceding 12h." },
    { "factor": "Low Boundary Layer Wind", "importance": 0.28, "description": "Wind speeds below 5 km/h reduce ventilation." },
    { "factor": "Diurnal Inversion", "importance": 0.18, "description": "Nighttime temperature drop traps emissions near surface." }
  ],
  "meta": {
    "timestamp": "2026-10-13T21:00:00Z",
    "is_demo": true,
    "model_version": "v1.0.0-demo"
  }
}
```

---

## 5. Feature 2: Air Quality Classification

### 5.1 Classify Air Quality
`POST /api/v1/aqi/classify`
- **Description:** Categorizes numerical AQI or pollutant concentrations into regulatory health severity categories with health messages and action items.
- **Request Body:**
```json
{
  "aqi": 215.0,
  "standard": "epa",
  "pollutants": {
    "pm25": 165.0,
    "pm10": 240.0,
    "no2": 52.0
  }
}
```
- **Response (200 OK):**
```json
{
  "aqi": 215.0,
  "standard": "epa",
  "category": "Very Unhealthy",
  "color": "#9333ea",
  "dominant_pollutant": "PM2.5",
  "health_implications": "Health alert: The risk of health effects is increased for everyone.",
  "recommended_actions": [
    "Sensitive groups should avoid all physical outdoor activities.",
    "General public should wear N95/FFP2 masks when outdoors.",
    "Keep indoor air purifiers running with sealed windows."
  ],
  "probabilities": null,
  "meta": {
    "timestamp": "2026-10-13T21:00:00Z",
    "is_demo": true,
    "model_version": "v1.0.0-demo"
  }
}
```

---

## 6. Feature 3: Pollution Trends

### 6.1 Current Pollution Trend
`GET /api/v1/aqi/trends?city_id=1&hours=24`
- **Parameters:**
  - `city_id` (integer, query)
  - `hours` (integer, default 24)
- **Response (200 OK):**
```json
{
  "city_id": 1,
  "window_hours": 24,
  "trend": "increasing",
  "direction_arrow": "↗",
  "rate_of_change_per_hour": 2.45,
  "current_aqi": 182.0,
  "past_average_aqi": 145.2,
  "delta": 36.8,
  "summary": "Air quality is deteriorating at a moderate pace over the past 24 hours.",
  "historical_data": [
    { "timestamp": "2026-10-12T21:00:00Z", "aqi": 138.0 },
    { "timestamp": "2026-10-13T09:00:00Z", "aqi": 165.0 },
    { "timestamp": "2026-10-13T21:00:00Z", "aqi": 182.0 }
  ],
  "meta": {
    "timestamp": "2026-10-13T21:00:00Z",
    "is_demo": true,
    "model_version": "v1.0.0-demo"
  }
}
```

### 6.2 Forecast Trend Trajectory
`POST /api/v1/aqi/trends/forecast`
- **Description:** Projects trend trajectory over the upcoming 24–72 hour period.
- **Request Body:**
```json
{
  "city_id": 1,
  "forecast_hours": 24,
  "current_aqi": 182.0
}
```
- **Response (200 OK):**
```json
{
  "city_id": 1,
  "forecast_hours": 24,
  "trend": "increasing",
  "expected_peak_aqi": 224.0,
  "expected_peak_time": "2026-10-14T08:00:00Z",
  "confidence": "moderate",
  "recommendation": "Plan intensive outdoor activities during afternoon ventilation window.",
  "meta": {
    "timestamp": "2026-10-13T21:00:00Z",
    "is_demo": true,
    "model_version": "v1.0.0-demo"
  }
}
```

---

## 7. Feature 4: Pollution / Health Risk Assessment

### 7.1 Multi-Tier Risk Evaluation
`POST /api/v1/aqi/risk-assessment`
- **Description:** Assesses cumulative acute and chronic exposure risk, stratified into Low, Moderate, High, or Severe Risk tiers with demographic advisories.
- **Request Body:**
```json
{
  "aqi": 210.0,
  "exposure_hours": 6.0,
  "vulnerable_population": true,
  "activity_level": "moderate"
}
```
- **Response (200 OK):**
```json
{
  "risk_tier": "Severe",
  "risk_score": 82.5,
  "aqi": 210.0,
  "color": "#ef4444",
  "advisory_summary": "Extremely high health risk from prolonged particulate exposure.",
  "group_guidance": {
    "children_and_elderly": "Remain indoors with mechanical air filtration; suspend outdoor recess.",
    "respiratory_cardiac_patients": "Keep quick-relief bronchodilators at hand; consult healthcare providers if experiencing tight chest.",
    "general_public": "Avoid strenuous endurance exertion outdoors; wear certified N95 masks."
  },
  "protective_equipment": [
    "Certified N95 / FFP2 particulate respirators",
    "HEPA H13/H14 continuous indoor filtration",
    "Electrolyte hydration to reduce mucus membrane irritation"
  ],
  "meta": {
    "timestamp": "2026-10-13T21:00:00Z",
    "is_demo": true,
    "model_version": "v1.0.0-demo"
  }
}
```

---

## 8. Analytics & Historical Endpoints

### 8.1 Environmental Summary
`GET /api/v1/analytics/summary?city_id=1`
- Returns 30-day mean, median, 95th percentile AQI, and standard deviations.

### 8.2 Category Distribution
`GET /api/v1/analytics/category-distribution?city_id=1&period_days=30`
- Returns count and percentage of days spent in each regulatory tier.

### 8.3 Pollutant Correlation Matrix
`GET /api/v1/analytics/pollutant-correlations?city_id=1`
- Returns Pearson cross-correlation coefficients between PM2.5, PM10, NO2, SO2, CO, O3, Temperature, and Wind Speed.

### 8.4 Historical Timeseries
`GET /api/v1/aqi/history?city_id=1&start_date=2026-09-01&end_date=2026-10-01&page=1&page_size=50`
- Paginated historical telemetry records supporting multi-pollutant filtering and CSV export.

---

## 9. Model Registry & Performance Metrics

### 9.1 Model Benchmarks
`GET /api/v1/models`
- Returns catalog of registered regression and classification models with training status (`is_trained: false` in Phase 1 demo mode), benchmark evaluation metrics, and target algorithms.

### 9.2 Real-Time Model Status
`GET /api/v1/models/status`
- Returns active inference engine mode (`demo` vs `ml`), loaded artifacts, and memory consumption.
