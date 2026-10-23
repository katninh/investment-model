import { getIndicatorSignals } from './indicators';
import { compositeScores } from './regime';
import {
  SCENARIOS,
  scenarioProbabilities,
  expectedReturns,
  goldScenarioTargets,
  type SignalSet,
  type ScenarioResult,
  type GoldTargets,
} from '@/lib/model/scenarios';

export interface ScenariosResult {
  results: ScenarioResult[];
  ev: Record<string, number>;
  goldTargets: GoldTargets | null; // null when gold spot is unavailable
  signals: SignalSet;
}

export async function getScenarios(): Promise<ScenariosResult> {
  const rows = await getIndicatorSignals();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const z = (id: string) => byId.get(id)?.signal?.zScore ?? 0;
  const { growthScore, inflationScore } = compositeScores(rows);

  const signals: SignalSet = {
    growthScore,
    inflationScore,
    realRateZ: z('FRED_DFII10'),
    hySpreadZ: z('FRED_BAMLH0A0HYM2'),
    vixZ: z('FRED_VIXCLS'),
    sahmLatest: byId.get('FRED_SAHMREALTIME')?.signal?.latest ?? 0,
    curveValue: byId.get('FRED_T10Y2Y')?.signal?.latest ?? 0,
  };

  const results = scenarioProbabilities(SCENARIOS, signals);
  const goldSpot = byId.get('MKT_XAUUSD')?.signal?.latest ?? null;
  return {
    results,
    ev: expectedReturns(results),
    goldTargets: goldSpot != null ? goldScenarioTargets(results, goldSpot) : null,
    signals,
  };
}
