import re
from typing import Tuple, Optional, Any
from datetime import datetime

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def validate_row(city: Optional[str], date_str: Optional[str], aqi_val: Any = None) -> Tuple[bool, Optional[str]]:
    """
    Validates required fields in a CSV row.
    Returns: (is_valid, error_reason)
    """
    if not city or not str(city).strip():
        return False, "Missing required 'City' identifier"

    if not date_str or not str(date_str).strip():
        return False, "Missing required 'Date' field"

    clean_date = str(date_str).strip()
    if not DATE_REGEX.match(clean_date):
        try:
            # Attempt date parsing if in alternate standard format
            parsed = datetime.strptime(clean_date, "%d-%m-%Y")
            clean_date = parsed.strftime("%Y-%m-%d")
        except Exception:
            return False, f"Invalid date format '{date_str}'; expected YYYY-MM-DD"

    if aqi_val is not None:
        try:
            val = float(aqi_val)
            if val < 0 or val > 1500:
                return False, f"AQI value '{val}' outside physiological range [0, 1500]"
        except (ValueError, TypeError):
            return False, f"Invalid non-numeric AQI value: {aqi_val}"

    return True, None

def parse_float_safe(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        import math
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None
