"""Pipeline entry point: python collect.py --mode daily|weekly|monthly|full

Collects each source into raw_observations; records per-source health in ingestion_log.
Collection only — no signal math (that lives in TS, PRD §5A.1).
"""
import argparse
import os
import sys
import time
from datetime import date, timedelta

from db import connect, upsert_observations, log_ingestion
from config import MODE_FREQUENCIES, MODE_LOOKBACK_DAYS, fred_indicators
from sources.fred import fetch_series
from sources.twelvedata import fetch_time_series
from sources.coingecko import fetch_market_chart
from sources.alternative_me import fetch_fng

# Non-FRED indicator ownership (id -> provider symbol/param).
TWELVEDATA_IDS = {"MKT_XAUUSD": "XAU/USD", "MKT_GLD": "GLD", "MKT_XLE": "XLE"}
COINGECKO_IDS = {"MKT_BTC": "bitcoin"}


def _load_env():
    """Load pipeline/.env for local runs; real env (e.g. GitHub Actions) takes precedence."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())


def _run_series(conn, indicator_id, fetch_fn):
    """Fetch + upsert one series with its own transaction; return (ok, err, n)."""
    try:
        rows = fetch_fn()
        n = upsert_observations(conn, indicator_id, "api", rows)
        conn.commit()
        print(f"  ✓ {indicator_id}: {n} obs")
        return 1, 0, n
    except Exception as e:  # one bad series never aborts the run
        conn.rollback()
        print(f"  ✗ {indicator_id}: {e}", file=sys.stderr)
        return 0, 1, 0


def collect_fred(conn, mode):
    freqs = MODE_FREQUENCIES[mode]
    start = None
    if mode != "full":
        lookback = max(MODE_LOOKBACK_DAYS[f] for f in freqs if f in MODE_LOOKBACK_DAYS)
        start = (date.today() - timedelta(days=lookback)).isoformat()
    api_key = os.environ["FRED_API_KEY"]
    ok = err = 0
    for indicator_id, series_id in fred_indicators(conn, freqs):
        o, e, _ = _run_series(conn, indicator_id, lambda s=series_id: fetch_series(s, api_key, start=start))
        ok += o
        err += e
        time.sleep(0.3)  # well under FRED's 120 req/min
    return ok, err


def collect_prices(conn, mode):
    api_key = os.environ["TWELVEDATA_API_KEY"]
    outputsize = 5000 if mode == "full" else 120
    ok = err = 0
    for indicator_id, symbol in TWELVEDATA_IDS.items():
        o, e, _ = _run_series(conn, indicator_id, lambda s=symbol: fetch_time_series(s, api_key, outputsize))
        ok += o
        err += e
        time.sleep(2)  # Twelve Data free tier ~8 credits/min
    return ok, err


def collect_crypto(conn, mode):
    ok = err = 0
    for indicator_id, coin in COINGECKO_IDS.items():
        o, e, _ = _run_series(conn, indicator_id, lambda c=coin: fetch_market_chart(c, days="365"))
        ok += o
        err += e
    return ok, err


def collect_sentiment(conn, mode):
    limit = 0 if mode == "full" else 90  # 0 = full history (alternative.me)
    return _run_series(conn, "SENT_CRYPTO_FG", lambda: fetch_fng(limit))[:2]


# (source_name, fn, modes it runs in)
SOURCES = [
    ("fred", collect_fred, {"daily", "weekly", "monthly", "full"}),
    ("prices", collect_prices, {"daily", "full"}),
    ("crypto", collect_crypto, {"daily", "full"}),
    ("sentiment", collect_sentiment, {"daily", "full"}),
]


def run(mode):
    total_ok = total_err = 0
    with connect() as conn:
        for name, fn, modes in SOURCES:
            if mode not in modes:
                continue
            print(f"[{name}]")
            try:
                ok, err = fn(conn, mode)
            except Exception as e:  # a source-level fatal (e.g. missing key) is isolated too
                ok, err = 0, 1
                print(f"  ! {name} fatal: {e}", file=sys.stderr)
            log_ingestion(conn, name, ok, err, f"mode={mode}")
            conn.commit()
            total_ok += ok
            total_err += err
    print(f"TOTAL: {total_ok} ok, {total_err} err")
    return 1 if total_ok == 0 else 0


def main():
    _load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["daily", "weekly", "monthly", "full"], default="daily")
    args = ap.parse_args()
    sys.exit(run(args.mode))


if __name__ == "__main__":
    main()
