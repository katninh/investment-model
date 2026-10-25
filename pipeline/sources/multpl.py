"""Shiller CAPE from multpl.com's public monthly table (robots.txt allows; no API exists —
Nasdaq Data Link's MULTPL dataset was discontinued).

Keeps only month-start rows: the table's top row is a live intra-month estimate whose
date changes daily, which would pile up duplicate months if stored.
"""
import re
from datetime import datetime

import requests

URL = "https://www.multpl.com/shiller-pe/table/by-month"
HEADERS = {"User-Agent": "investment-model-pipeline"}
ROW = re.compile(r"<td>([A-Z][a-z]{2} \d{1,2}, \d{4})</td>\s*<td>\s*(?:&#x2002;|\s)*([\d.]+)")


def fetch_cape(timeout: int = 30):
    """Return [(obs_date, cape, None)] for month-start rows. Raises if the page shape changed."""
    resp = requests.get(URL, headers=HEADERS, timeout=timeout)
    resp.raise_for_status()
    rows = []
    for d, v in ROW.findall(resp.text):
        dt = datetime.strptime(d, "%b %d, %Y").date()
        if dt.day == 1:
            rows.append((dt.isoformat(), float(v), None))
    if not rows:
        raise RuntimeError("multpl: no CAPE rows parsed — page layout changed?")
    return rows
