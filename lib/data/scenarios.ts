import { getIndicatorSignals } from './indicators';
import { compositeScores } from './regime';
import {
  SCENARIOS,
  scenarioProbabilities,
  expectedReturns,
  type SignalSet,
  type ScenarioResult,
} from '@/lib/model/scenarios';

export interface ScenariosResult {
  results: ScenarioResult[];
  ev: Record<string, number>;
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
    sahmZ: z('FRED_SAHMREALTIME'),
    curveValue: byId.get('FRED_T10Y2Y')?.signal?.latest ?? 0,
  };

  const results = scenarioProbabilities(SCENARIOS, signals);
  return { results, ev: expectedReturns(results), signals };
}
