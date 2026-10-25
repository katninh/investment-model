import { getIndicatorSignals, type IndicatorRow } from './indicators';
import { classifyRegime, regimeTransitionOdds, type RegimeCall, type RegimeTransition } from '@/lib/model/regime';

export interface RegimeResult {
  call: RegimeCall;
  transitions: RegimeTransition[]; // 3m & 12m odds over the 5 regimes
  growth: IndicatorRow[]; // contributing growth indicators (with data)
  inflation: IndicatorRow[]; // contributing inflation indicators (with data)
}

// Bounded momentum nudge from the 3m rate-of-change of a group's indicators.
// tanh keeps it in ~[-1,1] so a hot month can't swing the projection wildly.
const MOM_SCALE = 10;
function momNudge(rows: IndicatorRow[], sign: 1 | -1): number {
  const m = rows.filter((r) => r.signal);
  if (m.length === 0) return 0;
  const avg = m.reduce((s, r) => s + r.signal!.mom3m, 0) / m.length;
  return Math.tanh(sign * avg * MOM_SCALE);
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
  // Raw 3m rate-of-change: a rising series means strengthening growth / rising
  // inflation, so both groups take sign +1 (matches the +1 = rising convention).
  const transitions = regimeTransitionOdds(
    growthScore,
    inflationScore,
    momNudge(growth, 1),
    momNudge(inflation, 1),
  );
  return { call: classifyRegime(growthScore, inflationScore), transitions, growth, inflation };
}
