import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { momentumScore, type MomentumScore } from '@/lib/model/momentum';

// asset label -> price indicator id
const ASSETS: Record<string, string> = {
  Gold: 'MKT_XAUUSD',
  BTC: 'MKT_BTC',
  'S&P 500': 'FRED_SP500',
  Nasdaq: 'FRED_NASDAQCOM',
};

export interface AssetMomentum {
  asset: string;
  id: string;
  momentum: MomentumScore;
}

export async function getMomentum(): Promise<AssetMomentum[]> {
  const ids = Object.values(ASSETS);
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const result = await db.execute(sql`
    SELECT indicator_id AS id,
           COALESCE(array_agg(value ORDER BY obs_date) FILTER (WHERE value IS NOT NULL), '{}') AS values
    FROM raw_observations
    WHERE indicator_id IN (${idList})
    GROUP BY indicator_id
  `);

  const byId = new Map(
    (result as unknown as { id: string; values: number[] }[]).map((r) => [r.id, r.values]),
  );

  return Object.entries(ASSETS).map(([asset, id]) => ({
    asset,
    id,
    momentum: momentumScore(byId.get(id) ?? []),
  }));
}
