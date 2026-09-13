import { getRegimeCall } from './regime';
import { getValuation } from './valuation';
import { getSentiment } from './sentiment';
import { getMomentum } from './momentum';
import { getScenarios } from './scenarios';
import { conviction, REGIME_FIT, type ConvictionResult } from '@/lib/model/conviction';

const ASSETS = ['equities', 'gold', 'btc', 'bonds'] as const;
type Asset = (typeof ASSETS)[number];

// harmonize each model's asset labels to canonical keys
const VAL_KEY: Record<string, Asset> = { Equities: 'equities', Gold: 'gold', BTC: 'btc' };
const MOM_KEY: Record<string, Asset> = { 'S&P 500': 'equities', Gold: 'gold', BTC: 'btc' };

export const ASSET_LABEL: Record<string, string> = {
  equities: 'Equities',
  gold: 'Gold',
  btc: 'BTC',
  bonds: 'Bonds',
};

export interface ConvictionData {
  results: ConvictionResult[];
  regime: string;
}

export async function getConviction(): Promise<ConvictionData> {
  const [regime, valuation, sentiment, momentum, scenarios] = await Promise.all([
    getRegimeCall(),
    getValuation(),
    getSentiment(),
    getMomentum(),
    getScenarios(),
  ]);

  const fit = REGIME_FIT[regime.call.regime];

  // valuation 1-10 -> -1..1 (cheap = bullish)
  const valBy: Partial<Record<Asset, number>> = {};
  for (const a of valuation.assets) {
    const key = VAL_KEY[a.asset];
    if (key) valBy[key] = (a.score - 5.5) / 4.5;
  }

  // momentum -2..2 -> -1..1
  const momBy: Partial<Record<Asset, number>> = {};
  for (const m of momentum) {
    const key = MOM_KEY[m.asset];
    if (key && m.momentum.n > 0) momBy[key] = m.momentum.score / 2;
  }

  // contrarian sentiment (positive = fear = accumulate) — a risk-asset read; bonds neutral
  const sentScore = sentiment.composite.normalized;
  const evClamp = (x: number) => Math.max(-1, Math.min(1, x / 15));

  const results = ASSETS.map((asset) =>
    conviction(asset, {
      regimeFit: fit[asset] ?? 0,
      valuation: valBy[asset] ?? 0,
      sentiment: asset === 'bonds' ? 0 : sentScore,
      momentum: momBy[asset] ?? 0,
      scenarioEv: evClamp(scenarios.ev[asset] ?? 0),
    }),
  ).sort((a, b) => b.conviction - a.conviction);

  return { results, regime: regime.call.regime };
}
