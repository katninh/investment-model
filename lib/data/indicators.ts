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

// Days past the last observation's REFERENCE date before it counts as stale (v5:
// ">1 release old"). Sources date data at the start of the period and publish later
// (Sep UNRATE is dated 09-01, out 2 Oct; FRED oil/dollar lag ~1wk; GDP ~1mo after
// quarter end), so each threshold = period + publication lag + slack. Monthly/quarterly
// are sized for the slowest regular releasers (PCE/M2 ~4wks after month end, GDP advance
// ~4wks after quarter end). The old 4/10/45/120 flagged current data stale — and
// sentiment down-weights stale inputs.
const STALE_DAYS: Record<string, number> = { daily: 10, weekly: 17, monthly: 95, quarterly: 220 };

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
    LEFT JOIN raw_observations r
      ON r.indicator_id = i.id
      -- bound history: signals over a ~15yr window (multiple cycles) — far less
      -- data to aggregate/transfer than 60yr daily series, and keeps z-scores current
      AND r.obs_date >= (CURRENT_DATE - INTERVAL '15 years')
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
