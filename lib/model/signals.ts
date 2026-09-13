// Layer 2 — signal processing (PRD §7.1). Pure functions, no side effects.
// This is the single source of truth for the model math (the old Python
// Z-score logic is retired; §5A.1).

export interface Signal {
  latest: number;
  zScore: number;
  pctRank: number;   // 0..1
  mom1m: number;     // % change vs 1 period ago
  mom3m: number;
  mom12m: number;
  signal: -1 | 0 | 1;
  signalLabel: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

// ±0.5σ = boundary between "meaningfully elevated/depressed" and "normal" (§7.1).
// ponytail: module const now; moves to config.ts (per-indicator tunable) in Phase 4.
const Z_THRESHOLD = 0.5;

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Sample standard deviation (n-1). Returns 0 for n < 2.
export function stdDev(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

// Fraction of history at or below `value`, 0..1.
export function percentileRank(xs: number[], value: number): number {
  if (xs.length === 0) return 0;
  const atOrBelow = xs.reduce((c, x) => c + (x <= value ? 1 : 0), 0);
  return atOrBelow / xs.length;
}

// % change of the last value vs `lag` periods earlier.
// Returns 0 when history < lag or the reference value is 0.
// ponytail: 0 doubles as "unknown" when history < lag — fine for our windows
// (always ≥ lag in practice); revisit only if a caller must distinguish the two.
function momentum(xs: number[], lag: number): number {
  const i = xs.length - 1 - lag;
  if (i < 0) return 0;
  const prev = xs[i];
  if (prev === 0) return 0;
  return (xs[xs.length - 1] - prev) / Math.abs(prev);
}

function label(s: -1 | 0 | 1): Signal['signalLabel'] {
  return s === 1 ? 'BULLISH' : s === -1 ? 'BEARISH' : 'NEUTRAL';
}

export function computeSignal(series: number[], higherIsBetter: boolean | null): Signal {
  // Trust boundary: never fabricate a signal from nothing.
  if (series.length === 0) throw new Error('computeSignal: empty series');

  const latest = series[series.length - 1];
  const sd = stdDev(series);
  const z = sd > 0 ? (latest - mean(series)) / sd : 0;

  let signal: -1 | 0 | 1 = 0;
  if (higherIsBetter === true) signal = z > Z_THRESHOLD ? 1 : z < -Z_THRESHOLD ? -1 : 0;
  if (higherIsBetter === false) signal = z > Z_THRESHOLD ? -1 : z < -Z_THRESHOLD ? 1 : 0;
  // higherIsBetter === null => neutral direction (e.g. Fed funds rate)

  return {
    latest,
    zScore: z,
    pctRank: percentileRank(series, latest),
    mom1m: momentum(series, 1),
    mom3m: momentum(series, 3),
    mom12m: momentum(series, 12),
    signal,
    signalLabel: label(signal),
  };
}
