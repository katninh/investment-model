"""bitcoin-data.com client — BTC MVRV ratio (free tier: history up to ~7 days ago)."""
import requests

URL = "https://bitcoin-data.com/v1/mvrv"


def fetch_mvrv(timeout: int = 30):
    """Return [(obs_date, mvrv, raw)] daily. Free tier omits the most recent ~7 days."""
    resp = requests.get(URL, headers={"Accept": "application/json"}, timeout=timeout)
    resp.raise_for_status()

    rows = []
    for e in resp.json():
        try:
            value = float(e["mvrv"])
            d = e["d"]  # 'YYYY-MM-DD'
        except (TypeError, ValueError, KeyError):
            continue
        rows.append((d, value, e))
    return rows
