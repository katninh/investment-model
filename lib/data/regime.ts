import { getIndicatorSignals, type IndicatorRow } from './indicators';
import { classifyRegime, type RegimeCall } from '@/lib/model/regime';

export interface RegimeResult {
  call: RegimeCall;
  growth: IndicatorRow[]; // contributing growth indicators (with data)
  inflation: IndicatorRow[]; // contributing inflation indicators (with data)
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// Shared composite: growth signals are +1 when growth-positive; inflation signals
// are +1 when inflation is LOW (higher_better=false), so negate to get "rising".
// One source of truth for both regime and scenarios.
export function compositeScores(rows: IndicatorRow[]) {
  const growth = rows.filter((r) => r.category === 'growth' && r.signal);
  const inflation = rows.filter((r) => r.category === 'inflation' && r.signal);
  return {
    growth,
    inflation,
    growthScore: mean(growth.map((r) => r.signal!.signal)),
    inflationScore: -mean(inflation.map((r) => r.signal!.signal)),
  };
}

export async function getRegimeCall(): Promise<RegimeResult> {
  const rows = await getIndicatorSignals();
  const { growth, inflation, growthScore, inflationScore } = compositeScores(rows);
  return { call: classifyRegime(growthScore, inflationScore), growth, inflation };
}
