"""Fetch and store latest pollutant measurements from OpenAQ API v3.

The OpenAQ Latest endpoint returns the latest value in a sensor's series; that
value can be delayed and is not guaranteed to be a newly reported observation.
Raw pollutant concentrations are not consolidated CPCB AQI values.
"""

from __future__ import annotations

import hashlib
import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.city import City
from backend.app.models.openaq_measurement_observation import OpenAQMeasurementObservation
from backend.app.schemas.live_aqi import (
    LiveObservationListResponse,
    LivePollutantObservationOut,
    LiveRefreshResponse,
)

API_BASE_URL = "https://api.openaq.org/v3"
SOURCE_LABEL = "OpenAQ API v3"
IST = timezone(timedelta(hours=5, minutes=30))
MAX_LOCATIONS_TO_QUERY = 25

# Fallback coordinates are used only when no coordinates are stored for a city.
CITY_COORDINATES: dict[str, tuple[float, float]] = {
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "hyderabad": (17.3850, 78.4867),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "nagpur": (21.1458, 79.0882),
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "surat": (21.1702, 72.8311),
    "patna": (25.5941, 85.1376),
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "noida": (28.5355, 77.3910),
    "gurugram": (28.4595, 77.0266),
    "gurgaon": (28.4595, 77.0266),
    "thane": (19.2183, 72.9781),
    "nashik": (19.9975, 73.7898),
    "amritsar": (31.6340, 74.8723),
    "chandigarh": (30.7333, 76.7794),
    "silchar": (24.8333, 92.7789),
}

PARAMETER_ALIASES: dict[str, set[str]] = {
    "PM2.5": {"pm25", "pm2.5", "pm2_5", "pm2_5_mass", "fine particulate matter"},
    "PM10": {"pm10", "pm10_mass", "coarse particulate matter"},
    "NO2": {"no2", "nitrogen dioxide"},
    "NO": {"no", "nitric oxide"},
    "NOX": {"nox", "nitrogen oxides"},
    "NH3": {"nh3", "ammonia"},
    "CO": {"co", "carbon monoxide"},
    "SO2": {"so2", "sulfur dioxide", "sulphur dioxide"},
    "O3": {"o3", "ozone"},
}


def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip() or default


def _number(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _parameter_key(value: Any) -> str:
    return "".join(ch for ch in _text(value).casefold() if ch.isalnum() or ch == ".")


def _normalise_parameter(value: Any) -> str:
    key = _parameter_key(value)
    for canonical, aliases in PARAMETER_ALIASES.items():
        if key in {_parameter_key(alias) for alias in aliases} or key == _parameter_key(canonical):
            return canonical
    return _text(value).upper()


def _sensor_matches(sensor: dict[str, Any], requested_parameter: str) -> bool:
    p = sensor.get("parameter") or {}
    candidates = {
        _parameter_key(p.get("name")),
        _parameter_key(p.get("displayName")),
        _parameter_key(sensor.get("name")),
    }
    canonical = _normalise_parameter(requested_parameter)
    aliases = {_parameter_key(x) for x in PARAMETER_ALIASES.get(canonical, {canonical})}
    aliases.add(_parameter_key(canonical))
    return bool(candidates & aliases)


def _parse_observation_timestamp(value: str) -> Optional[datetime]:
    """Parse OpenAQ local/UTC date-time and return a naive IST datetime for storage."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(IST).replace(tzinfo=None)
    return parsed


def _record_key(sensor_id: str, pollutant_id: str, last_update: str) -> str:
    canonical = "|".join(part.casefold() for part in (sensor_id, pollutant_id, last_update, "latest"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class LiveAQIService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _get_json(client: httpx.Client, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            response = client.get(f"{API_BASE_URL}{path}", params=params)
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail="OpenAQ request timed out. No database changes were made.",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not connect to OpenAQ ({type(exc).__name__}).",
            ) from exc

        if response.status_code == 401:
            raise HTTPException(status_code=503, detail="OpenAQ rejected the API key. Check OPENAQ_API_KEY.")
        if response.status_code == 403:
            raise HTTPException(status_code=503, detail="OpenAQ denied the request. Check API-key permissions or quota.")
        if response.status_code == 429:
            raise HTTPException(status_code=503, detail="OpenAQ rate limit reached. Wait before refreshing again.")
        if not response.is_success:
            raise HTTPException(status_code=502, detail=f"OpenAQ returned HTTP {response.status_code} for {path}.")
        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail=f"OpenAQ returned invalid JSON for {path}.") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=502, detail=f"OpenAQ returned an unexpected response for {path}.")
        return payload

    def _resolve_coordinates(
        self,
        city: str,
        latitude: Optional[float],
        longitude: Optional[float],
    ) -> tuple[float, float]:
        if (latitude is None) != (longitude is None):
            raise HTTPException(status_code=422, detail="Supply both latitude and longitude, or neither.")
        if latitude is not None and longitude is not None:
            if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                raise HTTPException(status_code=422, detail="Latitude or longitude is outside valid bounds.")
            return float(latitude), float(longitude)

        city_row = self.db.query(City).filter(City.name.ilike(city.strip())).first()
        if city_row and city_row.latitude is not None and city_row.longitude is not None:
            return float(city_row.latitude), float(city_row.longitude)

        match = CITY_COORDINATES.get(city.strip().casefold())
        if match:
            return match
        raise HTTPException(
            status_code=422,
            detail=(
                f"No coordinates are configured for '{city}'. Add latitude/longitude to the cities table, "
                "or supply both latitude and longitude to the refresh endpoint."
            ),
        )

    def refresh(
        self,
        limit: int = 10,
        city: str = "Delhi",
        state: Optional[str] = None,
        parameter: str = "PM2.5",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_meters: int = 25000,
    ) -> LiveRefreshResponse:
        api_key = (settings.OPENAQ_API_KEY or "").strip()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENAQ_API_KEY is not configured. Add your OpenAQ key to the backend/project-root .env and restart FastAPI.",
            )
        city = city.strip()
        parameter = _normalise_parameter(parameter)
        if not city:
            raise HTTPException(status_code=422, detail="city cannot be empty.")
        if not parameter:
            raise HTTPException(status_code=422, detail="parameter cannot be empty.")
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=422, detail="limit must be between 1 and 100.")
        if radius_meters < 1 or radius_meters > 25000:
            raise HTTPException(status_code=422, detail="radius_meters must be between 1 and 25000.")

        lat, lon = self._resolve_coordinates(city, latitude, longitude)
        timeout = httpx.Timeout(30.0, connect=10.0)
        headers = {"X-API-Key": api_key, "Accept": "application/json"}
        with httpx.Client(headers=headers, timeout=timeout) as client:
            locations_payload = self._get_json(
                client,
                "/locations",
                {
                    "coordinates": f"{lat:.4f},{lon:.4f}",
                    "radius": radius_meters,
                    "iso": "IN",
                    "limit": 100,
                    "page": 1,
                },
            )
            location_rows = locations_payload.get("results")
            if not isinstance(location_rows, list):
                raise HTTPException(status_code=502, detail="OpenAQ locations response did not contain a results list.")

            candidate_locations: list[tuple[dict[str, Any], dict[str, dict[str, Any]]]] = []
            for location in location_rows:
                if not isinstance(location, dict):
                    continue
                sensors = location.get("sensors")
                if not isinstance(sensors, list):
                    continue
                sensor_map: dict[str, dict[str, Any]] = {}
                for sensor in sensors:
                    if isinstance(sensor, dict) and _sensor_matches(sensor, parameter):
                        sensor_map[str(sensor.get("id"))] = sensor
                if sensor_map:
                    candidate_locations.append((location, sensor_map))

            if not candidate_locations:
                raise HTTPException(
                    status_code=404,
                    detail=f"OpenAQ returned no locations within {radius_meters} m of {city} with a {parameter} sensor.",
                )

            raw_rows: list[dict[str, Any]] = []
            locations_checked = 0
            for location, sensor_map in candidate_locations[:MAX_LOCATIONS_TO_QUERY]:
                location_id = location.get("id")
                if location_id is None:
                    continue
                latest_payload = self._get_json(
                    client,
                    f"/locations/{int(location_id)}/latest",
                    {"limit": 100, "page": 1},
                )
                latest_rows = latest_payload.get("results")
                locations_checked += 1
                if not isinstance(latest_rows, list):
                    continue
                country_info = location.get("country") or {}
                coordinates = location.get("coordinates") or {}
                for row in latest_rows:
                    if not isinstance(row, dict):
                        continue
                    sensor_id = str(row.get("sensorsId", ""))
                    sensor = sensor_map.get(sensor_id)
                    if sensor is None:
                        continue
                    value = _number(row.get("value"))
                    dt = row.get("datetime") or {}
                    local_timestamp = _text(dt.get("local")) if isinstance(dt, dict) else ""
                    utc_timestamp = _text(dt.get("utc")) if isinstance(dt, dict) else ""
                    last_update = local_timestamp or utc_timestamp
                    if value is None or not last_update:
                        continue
                    sensor_parameter = sensor.get("parameter") or {}
                    raw_rows.append({
                        "country": _text((country_info or {}).get("name"), "India"),
                        "state": state.strip() if state and state.strip() else None,
                        "city": city,
                        "station": _text(location.get("name"), f"OpenAQ location {location_id}"),
                        "station_id": sensor_id,
                        "last_update": last_update,
                        "observed_at": _parse_observation_timestamp(last_update),
                        "latitude": _number(coordinates.get("latitude")) or lat,
                        "longitude": _number(coordinates.get("longitude")) or lon,
                        "pollutant_id": parameter,
                        "unit": _text(sensor.get("parameter", {}).get("units")) or None,
                        "value": value,
                        "min_value": None,
                        "max_value": None,
                        "avg_value": None,
                        "sample_count": None,
                        "aggregation": "latest",
                        "source": SOURCE_LABEL,
                    })
                if len(raw_rows) >= limit:
                    break

        # Deduplicate before writing, preserving the freshest values returned by the source.
        deduped: dict[str, dict[str, Any]] = {}
        for row in raw_rows:
            key = _record_key(row["station_id"], row["pollutant_id"], row["last_update"])
            deduped[key] = row
        raw_rows = list(deduped.items())[:limit]

        fetched_at = datetime.utcnow()
        inserted = updated = skipped = 0
        touched_keys: set[str] = set()
        latest_observation_at: Optional[datetime] = None
        try:
            for key, row in raw_rows:
                if key in touched_keys:
                    skipped += 1
                    continue
                touched_keys.add(key)
                row["fetched_at"] = fetched_at
                observed_at = row.get("observed_at")
                if observed_at and (latest_observation_at is None or observed_at > latest_observation_at):
                    latest_observation_at = observed_at

                existing = (
                    self.db.query(OpenAQMeasurementObservation)
                    .filter(OpenAQMeasurementObservation.record_key == key)
                    .first()
                )
                if existing is None:
                    self.db.add(OpenAQMeasurementObservation(record_key=key, **row))
                    self.db.flush()
                    inserted += 1
                else:
                    for field, value in row.items():
                        setattr(existing, field, value)
                    updated += 1
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        stored = (
            self.db.query(OpenAQMeasurementObservation)
            .filter(OpenAQMeasurementObservation.record_key.in_(list(touched_keys)))
            .order_by(OpenAQMeasurementObservation.observed_at.desc().nullslast(), desc(OpenAQMeasurementObservation.fetched_at))
            .all()
        ) if touched_keys else []

        return LiveRefreshResponse(
            success=True,
            source=SOURCE_LABEL,
            city_filter=city,
            state_filter=state.strip() if state and state.strip() else None,
            pollutant_filter=parameter,
            latitude=lat,
            longitude=lon,
            radius_meters=radius_meters,
            requested_limit=limit,
            locations_checked=locations_checked,
            received=len(raw_rows),
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            latest_observation_at=latest_observation_at,
            refreshed_at=fetched_at,
            message=(
                f"Stored {len(raw_rows)} latest {parameter} measurements from OpenAQ near {city}. "
                "The newest value in a sensor series may be delayed; check observed_at/last_update. "
                "These are pollutant concentrations, not consolidated CPCB AQI values."
            ),
            records=[LivePollutantObservationOut.model_validate(record) for record in stored],
        )

    def list_observations(
        self,
        city: Optional[str] = None,
        pollutant_id: Optional[str] = None,
        start: Optional[date] = None,
        end: Optional[date] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> LiveObservationListResponse:
        query = self.db.query(OpenAQMeasurementObservation)
        city_filter = city.strip() if city and city.strip() else None
        pollutant_filter = _normalise_parameter(pollutant_id) if pollutant_id and pollutant_id.strip() else None

        if city_filter:
            query = query.filter(OpenAQMeasurementObservation.city.ilike(city_filter))
        if pollutant_filter:
            query = query.filter(OpenAQMeasurementObservation.pollutant_id.ilike(pollutant_filter))
        if start:
            query = query.filter(OpenAQMeasurementObservation.observed_at >= datetime.combine(start, datetime.min.time()))
        if end:
            query = query.filter(OpenAQMeasurementObservation.observed_at < datetime.combine(end + timedelta(days=1), datetime.min.time()))

        total = query.count()
        rows = (
            query.order_by(
                OpenAQMeasurementObservation.observed_at.desc().nullslast(),
                desc(OpenAQMeasurementObservation.fetched_at),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )
        return LiveObservationListResponse(
            source=SOURCE_LABEL,
            city_filter=city_filter,
            pollutant_filter=pollutant_filter,
            total=total,
            limit=limit,
            offset=offset,
            retrieved_at=datetime.utcnow(),
            records=[LivePollutantObservationOut.model_validate(row) for row in rows],
        )
