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
