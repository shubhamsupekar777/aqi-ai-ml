# Live pollutant ingestion setup

This patch adds a backend-only, first-stage ingestion path for the data.gov.in / CPCB resource. It stores each city/station/pollutant/time row separately and does not interpret `avg_value` as AQI.

## Files included

- `backend/app/core/config.py`
- `backend/app/models/live_pollutant_observation.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/live_aqi.py`
- `backend/app/services/live_aqi_service.py`
- `backend/app/api/v1/live_aqi.py`
- `backend/app/api/router.py`

`backend/app/main.py` already imports `backend.app.models` and calls `Base.metadata.create_all()` at startup, so the new model is registered and its table is created when the backend starts.

## API key

Add the following to the project-root `.env` file (not `.env.example`):

```env
DATA_GOV_IN_API_KEY=YOUR_PERSONAL_DATA_GOV_IN_KEY
```

The API key is optional at app startup, but the refresh endpoint returns HTTP 503 until it is configured. Never put the key into frontend code or commit the populated `.env` file.

## Run

From the project root:

```powershell
python -m py_compile backend/app/core/config.py backend/app/models/live_pollutant_observation.py backend/app/schemas/live_aqi.py backend/app/services/live_aqi_service.py backend/app/api/v1/live_aqi.py backend/app/api/router.py
python -m uvicorn backend.app.main:app --reload
```

Then in Swagger (`http://127.0.0.1:8000/docs`):

1. Execute `POST /api/v1/live-aqi/refresh` with `limit=10`, `offset=0`.
2. Execute `GET /api/v1/live-aqi/observations` to inspect saved rows.
3. Optional filters: `city=Silchar`, `pollutant_id=PM10`.

The refresh endpoint is capped at 10 rows for this first verification stage. The source response may have a much larger `total`, and `avg_value` is a pollutant concentration for the specific `pollutant_id`, not a consolidated AQI score. The model deliberately preserves the original `last_update` string because the source example does not include an explicit timezone offset.
