"""FRED API client (plain REST, no fredapi/pandas). Returns clean numeric observations."""
import requests

FRED_URL = "https://api.stlouisfed.org/fred/series/observations"


def fetch_series(series_id: str, api_key: str, start: str | None = None, timeout: int = 30):
    """Return [(obs_date, value, raw_obs_dict)] for a FRED series.

    Missing values (FRED encodes them as ".") and non-numeric rows are skipped.
    `start` is an inclusive 'YYYY-MM-DD' observation_start; None fetches full history.
    """
    params = {"series_id": series_id, "api_key": api_key, "file_type": "json"}
    if start:
        params["observation_start"] = start

    resp = requests.get(FRED_URL, params=params, timeout=timeout)
    resp.raise_for_status()

    rows = []
    for obs in resp.json().get("observations", []):
        raw = obs.get("value")
        if raw in (None, ".", ""):
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        rows.append((obs["date"], value, obs))
    return rows
