import os
import sys
import argparse
from datetime import datetime
import pandas as pd
from typing import Dict, Any

from backend.app.core.database import SessionLocal
from backend.app.core.logging import logger
from backend.app.models.city import City
from backend.app.models.historical_aqi import HistoricalAQI
from backend.app.models.pollutant_record import PollutantRecord
from backend.app.models.weather_record import WeatherRecord
from backend.app.models.data_import_job import DataImportJob
from backend.app.data.validators import validate_row, parse_float_safe

def import_csv_dataset(csv_filepath: str, batch_size: int = 500) -> Dict[str, Any]:
    """
    Ingests historical air quality records from a CSV file into PostgreSQL/SQLite.
    Performs batched, idempotent upserts while protecting raw files.
    """
    if not os.path.isfile(csv_filepath):
        logger.error(f"Target CSV file not found: {csv_filepath}")
        return {"success": False, "error": f"File '{csv_filepath}' does not exist."}

    session = SessionLocal()
    job = DataImportJob(
        source_filename=os.path.basename(csv_filepath),
        status="processing",
        rows_read=0,
        rows_inserted=0,
        rows_updated=0,
        rows_rejected=0,
        started_at=datetime.utcnow()
    )
    session.add(job)
    session.commit()

    city_cache: Dict[str, City] = {}

    def get_or_create_city(name: str) -> City:
        clean_name = name.strip()
        if clean_name in city_cache:
            return city_cache[clean_name]
        
        city = session.query(City).filter(City.name == clean_name).first()
        if not city:
            city = City(name=clean_name, country="India")
            session.add(city)
            session.commit()
            session.refresh(city)
        city_cache[clean_name] = city
        return city

    rows_read = 0
    rows_inserted = 0
    rows_updated = 0
    rows_rejected = 0

    try:
        for chunk in pd.read_csv(csv_filepath, chunksize=batch_size):
            # Standardize column headers
            chunk.columns = [c.strip().lower() for c in chunk.columns]

            for _, row in chunk.iterrows():
                rows_read += 1

                city_val = row.get("city")
                date_val = str(row.get("date", "")).strip()
                aqi_val = row.get("aqi")

                is_valid, reason = validate_row(city_val, date_val, aqi_val)
                if not is_valid:
                    rows_rejected += 1
                    continue

                city = get_or_create_city(str(city_val))
                parsed_aqi = parse_float_safe(aqi_val) or 0.0
                original_bucket = str(row.get("aqi_bucket", row.get("aqi_category", "")))

                # Check if record already exists for city and date (Idempotent)
                record = session.query(HistoricalAQI).filter(
                    HistoricalAQI.city_id == city.id,
                    HistoricalAQI.observation_date == date_val
                ).first()

                if record:
                    record.aqi = parsed_aqi
                    record.original_category = original_bucket
                    rows_updated += 1
                else:
                    record = HistoricalAQI(
                        city_id=city.id,
                        observation_date=date_val,
                        aqi=parsed_aqi,
                        original_category=original_bucket,
                        data_source=f"Import: {os.path.basename(csv_filepath)}"
                    )
                    session.add(record)
                    session.flush() # Populate record.id
                    rows_inserted += 1

                # Pollutants
                pollutants = session.query(PollutantRecord).filter(
                    PollutantRecord.historical_aqi_id == record.id
                ).first()

                if not pollutants:
                    pollutants = PollutantRecord(historical_aqi_id=record.id)
                    session.add(pollutants)

                pollutants.pm25 = parse_float_safe(row.get("pm2.5", row.get("pm25")))
                pollutants.pm10 = parse_float_safe(row.get("pm10"))
                pollutants.no = parse_float_safe(row.get("no"))
                pollutants.no2 = parse_float_safe(row.get("no2"))
                pollutants.nox = parse_float_safe(row.get("nox"))
                pollutants.nh3 = parse_float_safe(row.get("nh3"))
                pollutants.co = parse_float_safe(row.get("co"))
                pollutants.so2 = parse_float_safe(row.get("so2"))
                pollutants.o3 = parse_float_safe(row.get("o3"))
                pollutants.benzene = parse_float_safe(row.get("benzene"))
                pollutants.toluene = parse_float_safe(row.get("toluene"))
                pollutants.xylene = parse_float_safe(row.get("xylene"))

                # Weather if present
                if any(k in row for k in ["temperature_2m", "temperature", "relative_humidity_2m", "humidity", "wind_speed_10m", "wind_speed"]):
                    weather = session.query(WeatherRecord).filter(
                        WeatherRecord.city_id == city.id,
                        WeatherRecord.observation_date == date_val
                    ).first()
                    if not weather:
                        weather = WeatherRecord(
                            city_id=city.id,
                            observation_date=date_val
                        )
                        session.add(weather)

                    weather.temperature = parse_float_safe(row.get("temperature_2m", row.get("temperature")))
                    weather.relative_humidity = parse_float_safe(row.get("relative_humidity_2m", row.get("humidity")))
                    weather.wind_speed = parse_float_safe(row.get("wind_speed_10m", row.get("wind_speed")))
                    weather.precipitation = parse_float_safe(row.get("precipitation", row.get("rainfall")))

            session.commit()

        job.status = "completed"
        job.rows_read = rows_read
        job.rows_inserted = rows_inserted
        job.rows_updated = rows_updated
        job.rows_rejected = rows_rejected
        job.completed_at = datetime.utcnow()
        session.commit()

        logger.info(
            f"CSV Import Completed: {rows_read} read, {rows_inserted} inserted, "
            f"{rows_updated} updated, {rows_rejected} rejected."
        )

        return {
            "success": True,
            "job_id": job.id,
            "rows_read": rows_read,
            "rows_inserted": rows_inserted,
            "rows_updated": rows_updated,
            "rows_rejected": rows_rejected
        }

    except Exception as e:
        session.rollback()
        job.status = "failed"
        job.error_summary = str(e)
        job.completed_at = datetime.utcnow()
        session.commit()
        logger.error(f"CSV import job failed: {e}")
        return {"success": False, "error": str(e)}

    finally:
        session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AQI AI Historical Data Importer")
    parser.add_argument("--file", required=True, help="Path to input CSV dataset")
    args = parser.parse_args()

    result = import_csv_dataset(args.file)
    print("Import Result:", result)
