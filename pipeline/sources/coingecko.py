"""CoinGecko client — daily price history (no key needed at low volume).

Free tier caps history at ~365 days; enough for a rolling z-score.
"""
import requests
from datetime import datetime, timezone

CG_URL = "https://api.coingecko.com/api/v3/coins/{id}/market_chart"


def fetch_market_chart(coin_id: str, days: str = "365", timeout: int = 30):
    """Return [(obs_date, price_usd, raw)] daily, de-duplicated by date (last wins)."""
    resp = requests.get(
        CG_URL.format(id=coin_id),
        params={"vs_currency": "usd", "days": str(days), "interval": "daily"},
        timeout=timeout,
    )
    resp.raise_for_status()

    by_date = {}
    for ms, price in resp.json().get("prices", []):
        d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).date().isoformat()
        by_date[d] = (d, float(price), {"ts": ms, "price": price})  # last point of a date wins
    return list(by_date.values())
