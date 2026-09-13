// Layer 4 — Conviction Synthesis (PRD §7.7). Pure, no side effects.
// Blend the five model outputs (each a per-asset sub-score in -1..1) into one
// conviction score per asset, then map to an action. Missing sub-scores are 0.

import type { Regime } from './regime';

export interface ConvictionInputs {
  regimeFit: number;
  valuation: number;
  sentiment: number;
  momentum: number;
  scenarioEv: number;
}

export type Action = 'ACCUMULATE' | 'LEAN BUY' | 'HOLD' | 'LEAN REDUCE' | 'AVOID';

export interface ConvictionResult {
  asset: string;
  conviction: number; // -1..1
  action: Action;
  inputs: ConvictionInputs;
}

// ponytail: inline weights + regime-fit table; move to config.ts (user-tunable) in a later phase.
export const CONVICTION_WEIGHTS: ConvictionInputs = {
  regimeFit: 0.3,
  valuation: 0.2,
  sentiment: 0.2,
  momentum: 0.15,
  scenarioEv: 0.15,
};

// How well each asset fits each regime (-1 unfavorable .. +1 favorable).
export const REGIME_FIT: Record<Regime, Record<string, number>> = {
  OVERHEAT: { equities: 0.3, gold: 0.5, btc: 0.0, bonds: -0.7 },
  RECOVERY: { equities: 0.8, gold: -0.3, btc: 0.5, bonds: 0.3 },
  STAGFLATION: { equities: -0.7, gold: 1.0, btc: -0.2, bonds: -0.5 },
  RECESSION: { equities: -1.0, gold: 0.5, btc: -0.8, bonds: 1.0 },
  TRANSITION: { equities: 0, gold: 0, btc: 0, bonds: 0 },
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function actionFor(c: number): Action {
  if (c > 0.6) return 'ACCUMULATE';
  if (c > 0.2) return 'LEAN BUY';
  if (c >= -0.2) return 'HOLD';
  if (c >= -0.6) return 'LEAN REDUCE';
  return 'AVOID';
}

export function conviction(asset: string, inputs: ConvictionInputs): ConvictionResult {
  const w = CONVICTION_WEIGHTS;
  const raw =
    inputs.regimeFit * w.regimeFit +
    inputs.valuation * w.valuation +
    inputs.sentiment * w.sentiment +
    inputs.momentum * w.momentum +
    inputs.scenarioEv * w.scenarioEv;
  const c = clamp(raw, -1, 1);
  return { asset, conviction: c, action: actionFor(c), inputs };
}
