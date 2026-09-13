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

export async function getRegimeCall(): Promise<RegimeResult> {
  const rows = await getIndicatorSignals();
  const growth = rows.filter((r) => r.category === 'growth' && r.signal);
  const inflation = rows.filter((r) => r.category === 'inflation' && r.signal);

  // growth signals are +1 when growth-positive; inflation signals are +1 when
  // inflation is LOW (higher_better=false), so negate to get "inflation rising".
  const growthScore = mean(growth.map((r) => r.signal!.signal));
  const inflationScore = -mean(inflation.map((r) => r.signal!.signal));

  return { call: classifyRegime(growthScore, inflationScore), growth, inflation };
}
