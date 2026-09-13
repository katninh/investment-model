"""Twelve Data client — daily close prices. Free tier: ETFs/forex/crypto (indices are paywalled)."""
import requests

TD_URL = "https://api.twelvedata.com/time_series"


def fetch_time_series(symbol: str, api_key: str, outputsize: int = 120, timeout: int = 30):
    """Return [(obs_date, close, raw_obs)] daily. Raises on API error status."""
    resp = requests.get(
        TD_URL,
        params={"symbol": symbol, "interval": "1day", "outputsize": outputsize, "apikey": api_key},
        timeout=timeout,
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "ok":
        raise RuntimeError(f"twelvedata {symbol}: {body.get('code')} {body.get('message')}")

    rows = []
    for v in body.get("values", []):
        try:
            close = float(v["close"])
        except (TypeError, ValueError, KeyError):
            continue
        rows.append((v["datetime"], close, v))
    return rows
