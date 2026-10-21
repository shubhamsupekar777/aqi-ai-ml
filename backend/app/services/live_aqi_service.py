"""Fetch and store raw station pollutant observations from data.gov.in.

This service deliberately does not convert pollutant_avg into an AQI value:
these are pollutant concentrations, not a consolidated city AQI.
"""

from __future__ import annotations

import hashlib
import math
from datetime import datetime
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.live_pollutant_observation import LivePollutantObservation
from backend.app.schemas.live_aqi import (
    LiveObservationListResponse,
    LivePollutantObservationOut,
    LiveRefreshResponse,
)

SOURCE_LABEL = "data.gov.in / Central Pollution Control Board"
# API_BASE_URL = "https://api.data.gov.in/resource/{resource_id}"
API_BASE_URL = "https://www.data.gov.in/backend/dataapi/v1/resource/{resource_id}"


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


def _parse_source_timestamp(value: str) -> Optional[datetime]:
    # Keep the exact source string too. The API's last_update sample has no
    # timezone offset, so we do not silently label this parsed value as UTC.
    for pattern in ("%d-%m-%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, pattern)
        except ValueError:
            continue
    return None


def _record_key(country: str, city: str, station: str, pollutant_id: str, last_update: str) -> str:
    # Stable, compact key avoids oversized composite text indexes in PostgreSQL.
    canonical = "|".join(
        (country.casefold(), city.casefold(), station.casefold(), pollutant_id.casefold(), last_update)
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class LiveAQIService:
    def __init__(self, db: Session):
        self.db = db

    def refresh(self, limit: int = 10, offset: int = 0) -> LiveRefreshResponse:
        api_key = (settings.DATA_GOV_IN_API_KEY or "").strip()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="DATA_GOV_IN_API_KEY is not configured. Add your personal key to the project-root .env file and restart FastAPI.",
            )

        resource_id = settings.DATA_GOV_IN_RESOURCE_ID.strip()
        url = API_BASE_URL.format(resource_id=resource_id)
        params = {"api-key": api_key, "format": "json", "offset": offset, "limit": limit}
        try:
            response = httpx.get(
                url,
                params=params,
                headers={"Accept": "application/json"},
                timeout=25.0,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPStatusError as exc:
            # Do not include the URL in the error: it contains the API key.
            raise HTTPException(
                status_code=502,
                detail=f"data.gov.in returned HTTP {exc.response.status_code}. Check the API key, access and request limits.",
            ) from exc
        except (httpx.RequestError, ValueError) as exc:
            raise HTTPException(
                status_code=502,
                detail="Could not retrieve a valid JSON response from data.gov.in. Check connectivity and try again.",
            ) from exc

        raw_records = payload.get("records") if isinstance(payload, dict) else None
        if not isinstance(raw_records, list):
            raise HTTPException(
                status_code=502,
                detail="data.gov.in response did not contain a records list. Check that the resource ID and API parameters are correct.",
            )
        api_status = _text(payload.get("status"), "ok").casefold()
        if api_status not in {"ok", "success"}:
            raise HTTPException(status_code=502, detail="data.gov.in reported that the request was not successful.")

        fetched_at = datetime.utcnow()
        inserted = updated = skipped = 0
        touched_keys: set[str] = set()

        try:
            for source_row in raw_records:
                if not isinstance(source_row, dict):
                    skipped += 1
                    continue

                country = _text(source_row.get("country"), "India")
                state = _text(source_row.get("state")) or None
                city = _text(source_row.get("city"))
                station = _text(source_row.get("station"))
                pollutant_id = _text(source_row.get("pollutant_id")).upper()
                last_update = _text(source_row.get("last_update"))

                # These fields make each station/pollutant measurement identifiable.
                if not city or not station or not pollutant_id or not last_update:
                    skipped += 1
                    continue

                key = _record_key(country, city, station, pollutant_id, last_update)
                if key in touched_keys:
                    skipped += 1
                    continue
                touched_keys.add(key)

                values = {
                    "country": country,
                    "state": state,
                    "city": city,
                    "station": station,
                    "last_update": last_update,
                    "observed_at": _parse_source_timestamp(last_update),
                    "latitude": _number(source_row.get("latitude")),
                    "longitude": _number(source_row.get("longitude")),
                    "pollutant_id": pollutant_id,
                    "min_value": _number(source_row.get("min_value")),
                    "max_value": _number(source_row.get("max_value")),
                    "avg_value": _number(source_row.get("avg_value")),
                    "source": "data.gov.in / Central Pollution Control Board",
                    "fetched_at": fetched_at,
                }

                existing = (
                    self.db.query(LivePollutantObservation)
                    .filter(LivePollutantObservation.record_key == key)
                    .first()
                )
                if existing is None:
                    existing = LivePollutantObservation(record_key=key, **values)
                    self.db.add(existing)
                    # SessionLocal uses autoflush=False, so flush to make duplicate
                    # keys in this same transaction visible to the next query.
                    self.db.flush()
                    inserted += 1
                else:
                    for field, value in values.items():
                        setattr(existing, field, value)
                    updated += 1

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        stored = (
            self.db.query(LivePollutantObservation)
            .filter(LivePollutantObservation.record_key.in_(list(touched_keys)))
            .order_by(desc(LivePollutantObservation.fetched_at))
            .all()
        ) if touched_keys else []

        total = payload.get("total")
        try:
            total_available = int(total) if total is not None else None
        except (TypeError, ValueError):
            total_available = None

        return LiveRefreshResponse(
            success=True,
            source=SOURCE_LABEL,
            requested_limit=limit,
            offset=offset,
            received=len(raw_records),
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            total_available=total_available,
            refreshed_at=fetched_at,
            message=(
                "Pollutant observations fetched and stored. avg_value is a pollutant reading, "
                "not a consolidated AQI value."
            ),
            records=[LivePollutantObservationOut.model_validate(row) for row in stored],
        )

    def list_observations(
        self,
        city: Optional[str] = None,
        pollutant_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> LiveObservationListResponse:
        query = self.db.query(LivePollutantObservation)
        city_filter = city.strip() if city and city.strip() else None
        pollutant_filter = pollutant_id.strip().upper() if pollutant_id and pollutant_id.strip() else None

        if city_filter:
            query = query.filter(LivePollutantObservation.city.ilike(city_filter))
        if pollutant_filter:
            query = query.filter(LivePollutantObservation.pollutant_id.ilike(pollutant_filter))

        total = query.count()
        rows = (
            query.order_by(
                LivePollutantObservation.observed_at.desc().nullslast(),
                LivePollutantObservation.fetched_at.desc(),
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
