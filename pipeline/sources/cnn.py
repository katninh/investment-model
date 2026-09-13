"""CNN Fear & Greed client — composite index (0-100).

Best-effort: CNN's endpoint 403s requests without browser headers, and may still
block datacenter IPs (e.g. GitHub Actions). Reliable locally; wrap failures upstream.
"""
import requests
from datetime import datetime, timezone

URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.cnn.com/",
}


def fetch_fear_greed(timeout: int = 20):
    """Return [(obs_date, score, raw)] daily, de-duplicated by date."""
    resp = requests.get(URL, headers=HEADERS, timeout=timeout)
    resp.raise_for_status()

    data = resp.json().get("fear_and_greed_historical", {}).get("data", [])
    by_date = {}
    for pt in data:
        try:
            score = float(pt["y"])
            ms = float(pt["x"])
        except (TypeError, ValueError, KeyError):
            continue
        d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).date().isoformat()
        by_date[d] = (d, score, pt)
    return list(by_date.values())
