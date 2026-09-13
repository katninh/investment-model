"""alternative.me client — crypto Fear & Greed index (0-100), no key needed."""
import requests
from datetime import datetime, timezone

AM_URL = "https://api.alternative.me/fng/"


def fetch_fng(limit: int = 0, timeout: int = 20):
    """Return [(obs_date, value, raw)]. limit=0 fetches full history."""
    resp = requests.get(AM_URL, params={"limit": limit, "format": "json"}, timeout=timeout)
    resp.raise_for_status()

    rows = []
    for e in resp.json().get("data", []):
        try:
            value = float(e["value"])
            d = datetime.fromtimestamp(int(e["timestamp"]), tz=timezone.utc).date().isoformat()
        except (TypeError, ValueError, KeyError):
            continue
        rows.append((d, value, e))
    return rows
