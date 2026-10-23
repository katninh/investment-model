import { cache } from 'react';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// Fetch several daily indicators INNER-JOINED on obs_date, so the returned arrays
// are date-aligned and equal length — what integrity sign-checks and the gold
// real-yield regression need. Only dates where ALL requested ids have a value.
export const getAlignedDaily = cache(
  async (ids: string[], days = 400): Promise<{ dates: string[]; series: Record<string, number[]> }> => {
    if (ids.length === 0) return { dates: [], series: {} };
    const res = await db.execute(sql`
      SELECT obs_date AS "obsDate", indicator_id AS "id", value
      FROM raw_observations
      WHERE indicator_id IN ${ids}
        AND value IS NOT NULL
        AND obs_date >= (CURRENT_DATE - (${days} || ' days')::interval)
      ORDER BY obs_date
    `);
    const rows = res as unknown as { obsDate: Date | string; id: string; value: number }[];

    // Pivot to date -> {id: value}, then keep only fully-populated dates.
    const byDate = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const d = r.obsDate instanceof Date ? r.obsDate.toISOString().slice(0, 10) : String(r.obsDate).slice(0, 10);
      (byDate.get(d) ?? byDate.set(d, {}).get(d)!)[r.id] = r.value;
    }

    const dates: string[] = [];
    const series: Record<string, number[]> = Object.fromEntries(ids.map((id) => [id, []]));
    for (const [d, vals] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (ids.every((id) => id in vals)) {
        dates.push(d);
        for (const id of ids) series[id].push(vals[id]);
      }
    }
    return { dates, series };
  },
);
