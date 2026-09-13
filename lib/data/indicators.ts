import { cache } from 'react';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { computeSignal, type Signal } from '@/lib/model/signals';

export interface IndicatorRow {
  id: string;
  name: string;
  category: string;
  sourceType: string;
  frequency: string;
  unit: string | null;
  lastDate: string | null; // YYYY-MM-DD
  n: number; // observation count
  stale: boolean;
  signal: Signal | null; // null when there is no data yet
}

interface RawRow {
  id: string;
  name: string;
  category: string;
  sourceType: string;
  frequency: string;
  unit: string | null;
  higherBetter: boolean | null;
  values: number[];
  lastDate: Date | string | null;
}

// How many days past the last observation counts as stale, per cadence.
const STALE_DAYS: Record<string, number> = { daily: 4, weekly: 10, monthly: 45, quarterly: 120 };

function toISODate(d: Date | string | null): string | null {
  if (d == null) return null;
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

// cache(): dedupe to a single execution per request, even when many models call it.
export const getIndicatorSignals = cache(async (): Promise<IndicatorRow[]> => {
  const result = await db.execute(sql`
    SELECT i.id, i.name, i.category,
           i.source_type   AS "sourceType",
           i.frequency, i.unit,
           i.higher_better AS "higherBetter",
           COALESCE(
             array_agg(r.value ORDER BY r.obs_date) FILTER (WHERE r.value IS NOT NULL),
             '{}'
           ) AS values,
           MAX(r.obs_date) AS "lastDate"
    FROM indicators i
    LEFT JOIN raw_observations r ON r.indicator_id = i.id
    GROUP BY i.id
    ORDER BY i.category, i.id
  `);

  const rows = result as unknown as RawRow[];
  const now = Date.now();

  return rows.map((row) => {
    const values = row.values ?? [];
    const lastDate = toISODate(row.lastDate);
    const n = values.length;
    const signal = n > 0 ? computeSignal(values, row.higherBetter) : null;

    let stale: boolean;
    if (!lastDate) {
      stale = true; // no data at all
    } else {
      const ageDays = (now - new Date(lastDate).getTime()) / 86_400_000;
      stale = ageDays > (STALE_DAYS[row.frequency] ?? 45);
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      sourceType: row.sourceType,
      frequency: row.frequency,
      unit: row.unit,
      lastDate,
      n,
      stale,
      signal,
    };
  });
});
