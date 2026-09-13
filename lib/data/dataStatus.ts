import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getIndicatorSignals, type IndicatorRow } from './indicators';

export interface IngestionRun {
  source: string;
  ok: number;
  err: number;
  notes: string | null;
  runAt: string;
}

export async function getDataStatus(): Promise<{ rows: IndicatorRow[]; ingestion: IngestionRun[] }> {
  const rows = await getIndicatorSignals();
  const res = await db.execute(sql`
    SELECT source, series_ok AS ok, series_err AS err, notes, run_at AS "runAt"
    FROM ingestion_log
    ORDER BY run_at DESC
    LIMIT 12
  `);

  const ingestion = (res as unknown as { source: string; ok: number; err: number; notes: string | null; runAt: Date | string }[]).map(
    (r) => ({
      source: r.source,
      ok: r.ok,
      err: r.err,
      notes: r.notes,
      runAt: (r.runAt instanceof Date ? r.runAt.toISOString() : String(r.runAt)).slice(0, 16).replace('T', ' '),
    }),
  );

  return { rows, ingestion };
}
