import { getIndicatorSignals } from './indicators';
import { getConviction } from './conviction';
import { constructPortfolio, type Allocation } from '@/lib/model/portfolio';
import type { RegimeCall } from '@/lib/model/regime';
import type { ConvictionResult } from '@/lib/model/conviction';
import type { ScenarioResult } from '@/lib/model/scenarios';

const PRICE_IDS: { id: string; label: string }[] = [
  { id: 'MKT_XAUUSD', label: 'Gold' },
  { id: 'MKT_BTC', label: 'BTC' },
  { id: 'FRED_SP500', label: 'S&P 500' },
  { id: 'FRED_VIXCLS', label: 'VIX' },
  { id: 'FRED_DTWEXBGS', label: 'USD' },
  { id: 'FRED_DGS10', label: '10Y' },
];

export interface PriceTile {
  label: string;
  latest: number | null;
  change: number | null; // 1-day fractional change
}

export interface DashboardData {
  prices: PriceTile[];
  regime: RegimeCall;
  conviction: ConvictionResult[];
  scenarios: ScenarioResult[];
  ev: Record<string, number>;
  allocations: Allocation[];
  asOf: string;
}

export async function getDashboard(): Promise<DashboardData> {
  const [conviction, rows] = await Promise.all([getConviction(), getIndicatorSignals()]);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const prices: PriceTile[] = PRICE_IDS.map(({ id, label }) => {
    const s = byId.get(id)?.signal ?? null;
    return { label, latest: s?.latest ?? null, change: s?.mom1m ?? null };
  });

  return {
    prices,
    regime: conviction.models.regime.call,
    conviction: conviction.results,
    scenarios: conviction.models.scenarios.results,
    ev: conviction.models.scenarios.ev,
    allocations: constructPortfolio(conviction.results),
    asOf: new Date().toISOString().slice(0, 10),
  };
}
