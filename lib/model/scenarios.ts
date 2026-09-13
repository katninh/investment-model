// Model 5 — Scenario Probability (PRD §7.6). Pure, no side effects.
// Each scenario's measurable triggers are checked against the current SignalSet;
// met-trigger weights become a score, normalized to probabilities summing to 1.
// Expected per-asset returns are ASSUMPTIONS (12–18mo), config-driven and tunable.

export interface SignalSet {
  growthScore: number; // -1..1, +1 growth strengthening (from regime)
  inflationScore: number; // -1..1, +1 inflation rising (from regime)
  realRateZ: number; // z-score of 10Y TIPS real yield
  hySpreadZ: number; // z-score of HY credit spreads
  vixZ: number; // z-score of VIX
  sahmZ: number; // z-score of Sahm rule
  curveValue: number; // 2s10s level (negative = inverted)
}

export interface Trigger {
  label: string;
  test: (s: SignalSet) => boolean;
  weight: number;
}

export interface Scenario {
  code: string;
  name: string;
  triggers: Trigger[];
  assetReturns: Record<string, number>; // % expected 12–18mo
}

export interface ScenarioResult {
  code: string;
  name: string;
  score: number;
  probability: number; // 0..1
  metTriggers: string[];
  allTriggers: { label: string; met: boolean }[];
  assetReturns: Record<string, number>;
}

export const ASSETS = ['equities', 'gold', 'btc', 'bonds', 'cash'] as const;

// ponytail: inline scenario defs + assumed returns; move to config.ts (tunable) in Phase 4.
export const SCENARIOS: Scenario[] = [
  {
    code: 'A',
    name: 'Soft Landing',
    triggers: [
      { label: 'Growth holding up', test: (s) => s.growthScore > 0.2, weight: 2 },
      { label: 'Inflation easing', test: (s) => s.inflationScore < 0, weight: 2 },
      { label: 'Credit spreads calm', test: (s) => s.hySpreadZ < 0.5, weight: 1 },
      { label: 'Low volatility', test: (s) => s.vixZ < 0.5, weight: 1 },
    ],
    assetReturns: { equities: 15, gold: 2, btc: 25, bonds: 5, cash: 4 },
  },
  {
    code: 'B',
    name: 'Overheat',
    triggers: [
      { label: 'Growth strong', test: (s) => s.growthScore > 0.2, weight: 2 },
      { label: 'Inflation rising', test: (s) => s.inflationScore > 0.2, weight: 2 },
      { label: 'Positive real rates', test: (s) => s.realRateZ > 0, weight: 1 },
    ],
    assetReturns: { equities: 5, gold: 12, btc: 10, bonds: -5, cash: 4 },
  },
  {
    code: 'C',
    name: 'Stagflation',
    triggers: [
      { label: 'Growth slowing', test: (s) => s.growthScore < 0, weight: 2 },
      { label: 'Inflation sticky', test: (s) => s.inflationScore > 0.2, weight: 2 },
      { label: 'Real rates elevated', test: (s) => s.realRateZ > 0.5, weight: 1 },
    ],
    assetReturns: { equities: -8, gold: 20, btc: 5, bonds: -3, cash: 4 },
  },
  {
    code: 'D',
    name: 'Recession',
    triggers: [
      { label: 'Growth falling', test: (s) => s.growthScore < -0.2, weight: 2 },
      { label: 'Sahm rule triggering', test: (s) => s.sahmZ > 0.5, weight: 2 },
      { label: 'Credit stress', test: (s) => s.hySpreadZ > 0.5, weight: 2 },
      { label: 'Curve inverted', test: (s) => s.curveValue < 0, weight: 1 },
      { label: 'Volatility elevated', test: (s) => s.vixZ > 0.5, weight: 1 },
    ],
    assetReturns: { equities: -20, gold: 12, btc: -35, bonds: 18, cash: 4 },
  },
  {
    code: 'E',
    name: 'Reflation / Easing',
    triggers: [
      { label: 'Real rates falling', test: (s) => s.realRateZ < 0, weight: 2 },
      { label: 'Inflation easing', test: (s) => s.inflationScore < 0, weight: 1 },
      { label: 'Growth not collapsing', test: (s) => s.growthScore > -0.2, weight: 1 },
    ],
    assetReturns: { equities: 12, gold: 15, btc: 40, bonds: 8, cash: 3 },
  },
];

export function scenarioProbabilities(scenarios: Scenario[], s: SignalSet): ScenarioResult[] {
  const raw = scenarios.map((sc) => {
    const allTriggers = sc.triggers.map((t) => ({ label: t.label, met: t.test(s) }));
    const score = sc.triggers.reduce((sum, t) => sum + (t.test(s) ? t.weight : 0), 0);
    return { sc, score, allTriggers };
  });

  const total = raw.reduce((a, r) => a + r.score, 0);

  return raw.map((r) => ({
    code: r.sc.code,
    name: r.sc.name,
    score: r.score,
    probability: total > 0 ? r.score / total : 1 / scenarios.length,
    metTriggers: r.allTriggers.filter((t) => t.met).map((t) => t.label),
    allTriggers: r.allTriggers,
    assetReturns: r.sc.assetReturns,
  }));
}

// E[return] per asset = Σ (probability × scenario return).
export function expectedReturns(results: ScenarioResult[]): Record<string, number> {
  const ev: Record<string, number> = {};
  for (const r of results) {
    for (const [asset, ret] of Object.entries(r.assetReturns)) {
      ev[asset] = (ev[asset] ?? 0) + r.probability * ret;
    }
  }
  return ev;
}
