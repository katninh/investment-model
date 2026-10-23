// Model 1 — Macro Regime / Investment Clock (PRD §7.2). Pure, no side effects.
//
// The §7.2 sample map is internally inconsistent (it labels STAGFLATION as
// growth-down + inflation-FALLING). This implements the economically correct
// growth×inflation 2×2 that matches the PRD's own §9 narrative:
// "late-stage stagflation … GDP slowing + inflation sticky" = growth↓ + inflation↑.

export type Regime = 'OVERHEAT' | 'RECOVERY' | 'STAGFLATION' | 'RECESSION' | 'TRANSITION';

export interface RegimeCall {
  regime: Regime;
  growthDir: -1 | 0 | 1; // +1 strengthening
  inflationDir: -1 | 0 | 1; // +1 rising
  growthScore: number; // [-1,1]
  inflationScore: number; // [-1,1]
  confidence: number; // 0..1
  clockPos: string;
  bestAssets: string[];
  description: string;
}

// |score| below this reads as no clear direction on that axis (a transition).
// ponytail: module const; moves to config.ts (tunable) in Phase 4.
const DEADBAND = 0.15;

function dir(score: number): -1 | 0 | 1 {
  if (score > DEADBAND) return 1;
  if (score < -DEADBAND) return -1;
  return 0;
}

interface RegimeDef {
  regime: Regime;
  clockPos: string;
  bestAssets: string[];
  description: string;
}

// key = `${growthDir},${inflationDir}`
const REGIMES: Record<string, RegimeDef> = {
  '1,1': {
    regime: 'OVERHEAT',
    clockPos: "3-6 o'clock",
    bestAssets: ['Commodities', 'Energy', 'Equities'],
    description: 'Growth strengthening with rising inflation — late-cycle overheat.',
  },
  '1,-1': {
    regime: 'RECOVERY',
    clockPos: "12-3 o'clock",
    bestAssets: ['Equities', 'Bonds'],
    description: 'Growth strengthening with easing inflation — goldilocks recovery.',
  },
  '-1,1': {
    regime: 'STAGFLATION',
    clockPos: "6-9 o'clock",
    bestAssets: ['Gold', 'Cash', 'Energy'],
    description: 'Growth slowing while inflation stays sticky — stagflation.',
  },
  '-1,-1': {
    regime: 'RECESSION',
    clockPos: "9-12 o'clock",
    bestAssets: ['Long Bonds', 'Gold', 'Cash'],
    description: 'Growth slowing with falling inflation — recession / reflation.',
  },
};

const TRANSITION: RegimeDef = {
  regime: 'TRANSITION',
  clockPos: 'transition',
  bestAssets: ['Cash', 'Gold'],
  description: 'Between regimes — one axis lacks a clear direction.',
};

// --- Transition odds (v5 Pass 1.4) -----------------------------------------
// Soft probability over the 5 regimes after nudging each axis by its momentum.
// Not a trained HMM (that needs a multi-cycle history of our own scores we don't
// yet have) — a transparent projection: project the score forward by momentum,
// then read each axis as up/flat/down with logistic membership around DEADBAND.
// ponytail: logistic membership heuristic; swap for a fitted transition matrix
// once ~3+ yrs of stored regime scores exist.
export interface RegimeTransition {
  horizon: '3m' | '12m';
  odds: Record<Regime, number>; // sums to 1
}

const AXIS_S = 0.25; // logistic width around the deadband boundary

function axisProbs(proj: number): { up: number; flat: number; down: number } {
  const up = 1 / (1 + Math.exp(-(proj - DEADBAND) / AXIS_S));
  const down = 1 / (1 + Math.exp(-(-proj - DEADBAND) / AXIS_S));
  return { up, flat: Math.max(0, 1 - up - down), down };
}

function oddsAt(g: number, i: number): Record<Regime, number> {
  const G = axisProbs(g);
  const I = axisProbs(i);
  const corners = {
    OVERHEAT: G.up * I.up,
    RECOVERY: G.up * I.down,
    STAGFLATION: G.down * I.up,
    RECESSION: G.down * I.down,
  };
  const transition = 1 - (corners.OVERHEAT + corners.RECOVERY + corners.STAGFLATION + corners.RECESSION);
  return { ...corners, TRANSITION: Math.max(0, transition) };
}

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));

// momentum args are bounded nudges per unit horizon (~[-1,1]); +1 = strengthening/rising.
export function regimeTransitionOdds(
  growthScore: number,
  inflationScore: number,
  growthMom: number,
  inflationMom: number,
): RegimeTransition[] {
  return ([
    ['3m', 0.5],
    ['12m', 1.5],
  ] as const).map(([horizon, h]) => ({
    horizon,
    odds: oddsAt(clamp1(growthScore + h * growthMom), clamp1(inflationScore + h * inflationMom)),
  }));
}

/**
 * Classify the macro regime from two composite scores in [-1, 1]:
 *   growthScore    +1 = growth strengthening, -1 = weakening
 *   inflationScore +1 = inflation rising,      -1 = falling
 * Confidence scales with how far both axes are from zero.
 */
export function classifyRegime(growthScore: number, inflationScore: number): RegimeCall {
  const g = dir(growthScore);
  const i = dir(inflationScore);
  const def = g !== 0 && i !== 0 ? REGIMES[`${g},${i}`] : TRANSITION;

  const confidence = Math.min(1, Math.hypot(growthScore, inflationScore) / Math.SQRT2);

  return {
    regime: def.regime,
    growthDir: g,
    inflationDir: i,
    growthScore,
    inflationScore,
    confidence,
    clockPos: def.clockPos,
    bestAssets: def.bestAssets,
    description: def.description,
  };
}
