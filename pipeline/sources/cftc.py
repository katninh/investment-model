"""CFTC Commitments of Traders — gold net speculative positioning.

Official annual bulk files (legacy, futures-only), no key: cftc.gov/files/dea/history/
deacot{YEAR}.zip. (The publicreporting.cftc.gov Socrata API is firewalled for scripts.)
Net spec = non-commercial long − short, COMEX gold (contract code 088691). Weekly,
as of Tuesday, released Friday.
"""
import csv
import io
import zipfile

import requests

URL = "https://www.cftc.gov/files/dea/history/deacot{year}.zip"
GOLD_CODE = "088691"
HEADERS = {"User-Agent": "investment-model-pipeline"}


def fetch_cot_gold(years, timeout: int = 60):
    """Return [(obs_date, net_spec, raw)] for each year in `years` (oldest first)."""
    rows = []
    for year in years:
        resp = requests.get(URL.format(year=year), headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(resp.content))
        text = z.read(z.namelist()[0]).decode("latin-1")
        for r in csv.DictReader(io.StringIO(text)):
            if r.get("CFTC Contract Market Code", "").strip() != GOLD_CODE:
                continue
            try:
                long_ = int(r["Noncommercial Positions-Long (All)"])
                short = int(r["Noncommercial Positions-Short (All)"])
            except (KeyError, ValueError):
                continue
            d = r["As of Date in Form YYYY-MM-DD"].strip()
            rows.append((d, float(long_ - short), {"long": long_, "short": short}))
    return rows
