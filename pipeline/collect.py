"""Pipeline entry point: python collect.py --mode daily|weekly|monthly|full

Collects each source into raw_observations; records per-source health in ingestion_log.
Collection only — no signal math (that lives in TS, PRD §5A.1).
"""
import argparse
import bisect
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
from sources.cnn import fetch_fear_greed
from sources.bitcoin_data import fetch_mvrv

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


def _run_series(conn, indicator_id, fetch_fn, source_type="api"):
    """Fetch + upsert one series with its own transaction; return (ok, err, n)."""
    try:
        rows = fetch_fn()
        n = upsert_observations(conn, indicator_id, source_type, rows)
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
    ok = err = 0
    for indicator_id, fetch in [
        ("SENT_CRYPTO_FG", lambda: fetch_fng(limit)),
        ("SENT_CNN_FG", fetch_fear_greed),  # best-effort; ~1yr history regardless of mode
    ]:
        o, e, _ = _run_series(conn, indicator_id, fetch)
        ok += o
        err += e
    return ok, err


def collect_valuation(conn, mode):
    # BTC MVRV (bitcoin-data.com); free tier is delayed ~7 days.
    return _run_series(conn, "VAL_BTC_MVRV", fetch_mvrv)[:2]


def _read_series(conn, indicator_id):
    """Read a stored series as [(date_str, value, None)] ordered by date."""
    rows = conn.execute(
        "SELECT obs_date, value FROM raw_observations "
        "WHERE indicator_id = %s AND value IS NOT NULL ORDER BY obs_date",
        (indicator_id,),
    ).fetchall()
    return [(str(d), float(v), None) for (d, v) in rows]


def _ratio(numer, denom, ffill=False):
    """numer/denom aligned by date. ffill=True uses the most recent denom <= each numer date
    (for lower-frequency denominators like quarterly GDP); else an exact date join."""
    out = []
    if ffill:
        ds = sorted(denom, key=lambda r: r[0])
        dates = [r[0] for r in ds]
        vals = [r[1] for r in ds]
        for d, nv, _ in numer:
            i = bisect.bisect_right(dates, d) - 1
            if i < 0 or vals[i] == 0:
                continue
            out.append((d, nv / vals[i], {"n": nv, "d": vals[i]}))
    else:
        dmap = {r[0]: r[1] for r in denom}
        for d, nv, _ in numer:
            dv = dmap.get(d)
            if not dv:
                continue
            out.append((d, nv / dv, {"n": nv, "d": dv}))
    return out


def collect_derived(conn, mode):
    """Compute ratio indicators from FRED inputs + stored gold (deterministic, not model logic)."""
    key = os.environ["FRED_API_KEY"]
    start = None if mode == "full" else (date.today() - timedelta(days=800)).isoformat()
    gold = _read_series(conn, "MKT_XAUUSD")
    jobs = [
        # Buffett proxy = Fed Z.1 corporate-equities market value / nominal GDP (both quarterly,
        # full history — Wilshire 5000 was delisted from FRED). Quarterly ⇒ always full history.
        ("VAL_BUFFETT", lambda: _ratio(fetch_series("NCBEILQ027S", key),
                                       fetch_series("GDP", key), ffill=True)),
        # Dow/Gold = DJIA / gold (both daily → exact date join)
        ("VAL_DOW_GOLD", lambda: _ratio(fetch_series("DJIA", key, start=start), gold)),
        # Copper/Gold = copper (monthly) / gold (daily, forward-filled)
        ("DERIV_COPPER_GOLD", lambda: _ratio(fetch_series("PCOPPUSDM", key), gold, ffill=True)),
    ]
    ok = err = 0
    for indicator_id, fn in jobs:
        o, e, _ = _run_series(conn, indicator_id, fn, source_type="derived")
        ok += o
        err += e
        time.sleep(0.3)
    return ok, err


# (source_name, fn, modes it runs in)
SOURCES = [
    ("fred", collect_fred, {"daily", "weekly", "monthly", "full"}),
    ("prices", collect_prices, {"daily", "full"}),
    ("crypto", collect_crypto, {"daily", "full"}),
    ("sentiment", collect_sentiment, {"daily", "full"}),
    ("valuation", collect_valuation, {"daily", "full"}),
    ("derived", collect_derived, {"daily", "full"}),  # needs gold in DB (runs after prices)
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
