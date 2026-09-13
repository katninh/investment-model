// Layer 5 — Portfolio Construction (PRD §7.8). Pure, no side effects.
// Positive-conviction assets get weight proportional to conviction within a risk
// budget; each capped at maxWeight; the capped/excluded remainder becomes cash.

import { CONVICTION_WEIGHTS, type ConvictionResult } from './conviction';

export interface PortfolioConstraints {
  maxWeight: number; // max per single asset
  minCash: number; // minimum cash reserve
}

export const DEFAULT_CONSTRAINTS: PortfolioConstraints = { maxWeight: 0.35, minCash: 0.1 };

export interface Allocation {
  asset: string;
  weight: number; // 0..1
  conviction: number;
  action: string;
  rationale: string;
}

const DRIVER: Record<string, string> = {
  regimeFit: 'regime fit',
  valuation: 'valuation',
  sentiment: 'sentiment',
  momentum: 'momentum',
  scenarioEv: 'scenario outlook',
};

function rationale(r: ConvictionResult): string {
  const contrib = (Object.keys(CONVICTION_WEIGHTS) as (keyof typeof CONVICTION_WEIGHTS)[]).map(
    (k) => [k, r.inputs[k] * CONVICTION_WEIGHTS[k]] as const,
  );
  const pos = contrib.filter((c) => c[1] > 0).sort((a, b) => b[1] - a[1])[0];
  const neg = contrib.filter((c) => c[1] < 0).sort((a, b) => a[1] - b[1])[0];
  let s = r.action;
  if (pos) s += `, led by ${DRIVER[pos[0]]}`;
  if (neg) s += `, tempered by ${DRIVER[neg[0]]}`;
  return s;
}

export function constructPortfolio(
  results: ConvictionResult[],
  constraints: PortfolioConstraints = DEFAULT_CONSTRAINTS,
): Allocation[] {
  const positive = results.filter((r) => r.conviction > 0);
  const total = positive.reduce((s, r) => s + r.conviction, 0);
  const investable = 1 - constraints.minCash;

  const allocs: Allocation[] = [];
  let allocated = 0;
  for (const r of positive) {
    const raw = total > 0 ? (r.conviction / total) * investable : 0;
    const weight = Math.min(raw, constraints.maxWeight);
    allocated += weight;
    allocs.push({
      asset: r.asset,
      weight,
      conviction: r.conviction,
      action: r.action,
      rationale: rationale(r),
    });
  }

  const cash = 1 - allocated; // >= minCash, since we only deployed `investable` and caps only reduce
  allocs.push({
    asset: 'cash',
    weight: cash,
    conviction: 0,
    action: 'HOLD',
    rationale: 'Reserve — risk budget plus capped/excluded residual.',
  });

  return allocs.sort((a, b) => b.weight - a.weight);
}
