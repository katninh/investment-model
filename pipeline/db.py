"""Postgres access for the pipeline: upsert raw observations + log runs (PRD §5A.4)."""
import os
import psycopg
from psycopg.types.json import Json


def connect():
    # prepare_threshold=None: disable server-side prepared statements — required for
    # Supabase's transaction pooler (pgbouncer, port 6543).
    return psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=15, prepare_threshold=None)


def upsert_observations(conn, indicator_id: str, source_type: str, rows):
    """rows: iterable of (obs_date, value, raw_payload_dict). Idempotent per (indicator, date)."""
    rows = list(rows)
    if not rows:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO raw_observations (indicator_id, obs_date, value, raw_payload, source_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (indicator_id, obs_date)
            DO UPDATE SET value = EXCLUDED.value,
                          raw_payload = EXCLUDED.raw_payload,
                          fetched_at = now()
            """,
            [(indicator_id, d, v, Json(p), source_type) for (d, v, p) in rows],
        )
    return len(rows)


def log_ingestion(conn, source: str, ok: int, err: int, notes: str = ""):
    conn.execute(
        "INSERT INTO ingestion_log (source, series_ok, series_err, notes) VALUES (%s, %s, %s, %s)",
        (source, ok, err, notes),
    )
