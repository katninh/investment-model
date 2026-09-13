"""Pipeline entry point: python collect.py --mode daily|weekly|monthly|full

Collects FRED series into raw_observations and records run health in ingestion_log.
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

FRED_REQ_SPACING_S = 0.3  # be polite: well under FRED's 120 req/min


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


def collect_fred(mode: str) -> int:
    freqs = MODE_FREQUENCIES[mode]
    start = None
    if mode != "full":
        lookback = max(MODE_LOOKBACK_DAYS[f] for f in freqs if f in MODE_LOOKBACK_DAYS)
        start = (date.today() - timedelta(days=lookback)).isoformat()

    api_key = os.environ["FRED_API_KEY"]
    ok = err = 0
    with connect() as conn:
        indicators = fred_indicators(conn, freqs)
        print(f"fred: {len(indicators)} series (mode={mode}, start={start or 'all history'})")
        for indicator_id, series_id in indicators:
            try:
                rows = fetch_series(series_id, api_key, start=start)
                n = upsert_observations(conn, indicator_id, "api", rows)
                conn.commit()
                ok += 1
                print(f"  ✓ {indicator_id} ({series_id}): {n} obs")
            except Exception as e:  # a bad series never aborts the whole run
                conn.rollback()
                err += 1
                print(f"  ✗ {indicator_id} ({series_id}): {e}", file=sys.stderr)
            time.sleep(FRED_REQ_SPACING_S)
        log_ingestion(conn, "fred", ok, err, f"mode={mode}")
        conn.commit()

    print(f"fred done: {ok} ok, {err} err")
    return 1 if err and ok == 0 else 0  # nonzero only if everything failed


def main():
    _load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["daily", "weekly", "monthly", "full"], default="daily")
    args = ap.parse_args()
    sys.exit(collect_fred(args.mode))


if __name__ == "__main__":
    main()
