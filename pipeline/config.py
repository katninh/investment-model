"""Pipeline config: mode→cadence mapping and the FRED indicator list (from the DB catalog)."""

# Which indicator frequencies each run mode collects.
MODE_FREQUENCIES = {
    "daily": ("daily",),
    "weekly": ("weekly",),
    "monthly": ("monthly", "quarterly"),
    "full": ("daily", "weekly", "monthly", "quarterly"),
}

# Incremental lookback window per mode (days). "full" ignores this and backfills all history.
MODE_LOOKBACK_DAYS = {
    "daily": 90,
    "weekly": 400,
    "monthly": 800,
}


def fred_indicators(conn, frequencies):
    """(indicator_id, series_id) for every FRED-sourced indicator in the given frequencies.

    Reads the seeded `indicators` table so the catalog stays the single source of truth.
    """
    rows = conn.execute(
        """
        SELECT id, source_id
        FROM indicators
        WHERE source_type = 'api'
          AND id LIKE 'FRED_%%'
          AND source_id IS NOT NULL
          AND frequency = ANY(%s)
        ORDER BY id
        """,
        (list(frequencies),),
    ).fetchall()
    return rows
