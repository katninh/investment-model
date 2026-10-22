// Layer 0 — Data integrity & errors-log checks (Macro Model Review v5, Pass 0).
// Pure, no side effects. These encode the three calls the model got wrong in 2026,
// each root-caused to a structural thesis overriding the cyclical driver:
//   1. Real rate must be OBSERVED (DFII10), never nominal − CPI.
//   2. Sahm is an absolute 0.50pp rule → report recession ODDS, not "recession".
//   3. A narrative (gold↑ on oil/geopolitics) must agree with the last 60d sign.

// --- Sahm rule ---------------------------------------------------------------
// SAHMREALTIME already IS the Sahm indicator: 3mo-avg unemployment minus its
// trailing-12mo low, in percentage points. The rule fires at ≥0.50. The 2026 bug
// was testing a Z-SCORE > 0.5 (a different quantity) and calling it "triggered".
export const SAHM_THRESHOLD = 0.5;

export type SahmBand = 'LOW' | 'WATCH' | 'ELEVATED' | 'TRIGGERED';

export interface SahmReading {
  value: number; // pp above trailing-12mo low (the SAHMREALTIME latest)
  band: SahmBand;
  triggered: boolean; // value >= 0.50
  note: string;
}

export function sahmReading(value: number): SahmReading {
  let band: SahmBand;
  if (value >= SAHM_THRESHOLD) band = 'TRIGGERED';
  else if (value >= 0.3) band = 'ELEVATED';
  else if (value >= 0.1) band = 'WATCH';
  else band = 'LOW';
  return {
    value,
    band,
    triggered: value >= SAHM_THRESHOLD,
    note:
      band === 'TRIGGERED'
        ? 'Sahm rule met — historically coincident with recession onset'
        : 'Sahm rule NOT met — label recession odds, not recession',
  };
}

// --- Real-rate guard ---------------------------------------------------------
// v5 rule: pull DFII10 from FRED/H.15 every run; never derive real = nominal − CPI.
export interface RealRateGuard {
  ok: boolean;
  value: number | null;
  reason: string;
}

export function realRateGuard(dfii10Latest: number | null, stale: boolean): RealRateGuard {
  if (dfii10Latest == null) {
    return { ok: false, value: null, reason: 'DFII10 missing — do NOT derive real rate from nominal − CPI' };
  }
  if (stale) return { ok: false, value: dfii10Latest, reason: 'DFII10 stale (>1 release old) — refresh before using' };
  return { ok: true, value: dfii10Latest, reason: 'observed 10Y TIPS real yield' };
}

// --- 60-day sign checks ------------------------------------------------------
// Pearson correlation over the last `window` ALIGNED points. Arrays are assumed
// date-aligned (inner-joined upstream) and equal length.
export function rollingCorr(a: number[], b: number[], window = 60): { corr: number; n: number } {
  const n = Math.min(a.length, b.length, window);
  if (n < 2) return { corr: 0, n };
  const xs = a.slice(a.length - n);
  const ys = b.slice(b.length - n);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  return { corr: denom === 0 ? 0 : sxy / denom, n };
}

export interface DriverCheck {
  driver: string;
  corr: number;
  expectedSign: -1 | 1;
  agrees: boolean; // does the realized 60d sign match the narrative's expected sign?
  note: string;
}

// Expected signs, from v5's errors log:
//   gold vs real yield (DFII10): negative — higher real rates are a gold headwind.
//   gold vs oil: negative recently — oil lifts inflation → yields → real rates → gold down.
export function goldDriverChecks(
  gold: number[],
  realYield: number[],
  oil: number[],
  window = 60,
): DriverCheck[] {
  const mk = (driver: string, series: number[], expectedSign: -1 | 1): DriverCheck => {
    const { corr } = rollingCorr(gold, series, window);
    const agrees = corr === 0 ? false : Math.sign(corr) === expectedSign;
    return {
      driver,
      corr,
      expectedSign,
      agrees,
      note: agrees
        ? 'realized sign matches the cyclical driver'
        : 'SIGN DISAGREES — do not use the narrative until it re-establishes',
    };
  };
  return [mk('gold~realYield', realYield, -1), mk('gold~oil', oil, -1)];
}
