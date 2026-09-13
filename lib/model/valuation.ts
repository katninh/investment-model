// Model 2 — Valuation (PRD §7.3). Pure, no side effects.
// Each metric is percentile-ranked against its own history, inverted where a HIGH
// reading means expensive, averaged per asset → a 1–10 score (10 = cheapest).

export interface ValMetricInput {
  id: string;
  pctRank: number; // 0..1
}

export interface AssetValuation {
  asset: string;
  score: number; // 1..10, 10 = cheapest
  cheapness: number; // 0..1
  metrics: { id: string; label: string; pctRank: number; cheapness: number }[];
}

interface ValCfg {
  asset: string;
  label: string;
  highIsExpensive: boolean; // does a HIGH reading mean expensive/unfavorable?
}

// ponytail: inline config; moves to config.ts (tunable) in Phase 4.
const VAL_CONFIG: Record<string, ValCfg> = {
  VAL_BUFFETT: { asset: 'Equities', label: 'Buffett Indicator', highIsExpensive: true },
  VAL_DOW_GOLD: { asset: 'Gold', label: 'Dow/Gold ratio', highIsExpensive: false }, // high = gold cheap vs stocks
  FRED_DFII10: { asset: 'Gold', label: '10Y Real Yield', highIsExpensive: true }, // high real rate = gold headwind
  VAL_BTC_MVRV: { asset: 'BTC', label: 'BTC MVRV', highIsExpensive: true },
};

export function valuationScores(inputs: ValMetricInput[]): AssetValuation[] {
  const byAsset = new Map<string, AssetValuation['metrics']>();

  for (const input of inputs) {
    const cfg = VAL_CONFIG[input.id];
    if (!cfg) continue;
    const cheapness = cfg.highIsExpensive ? 1 - input.pctRank : input.pctRank;
    const list = byAsset.get(cfg.asset) ?? [];
    list.push({ id: input.id, label: cfg.label, pctRank: input.pctRank, cheapness });
    byAsset.set(cfg.asset, list);
  }

  return [...byAsset.entries()]
    .map(([asset, metrics]) => {
      const cheapness = metrics.reduce((s, m) => s + m.cheapness, 0) / metrics.length;
      return { asset, cheapness, score: 1 + 9 * cheapness, metrics };
    })
    .sort((a, b) => b.score - a.score); // cheapest first
}
