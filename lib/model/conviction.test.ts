import { describe, it, expect } from 'vitest';
import { conviction, actionFor, CONVICTION_WEIGHTS } from './conviction';

const zero = { regimeFit: 0, valuation: 0, sentiment: 0, momentum: 0, scenarioEv: 0 };

describe('actionFor thresholds', () => {
  it('maps conviction to actions', () => {
    expect(actionFor(0.8)).toBe('ACCUMULATE');
    expect(actionFor(0.4)).toBe('LEAN BUY');
    expect(actionFor(0)).toBe('HOLD');
    expect(actionFor(-0.4)).toBe('LEAN REDUCE');
    expect(actionFor(-0.8)).toBe('AVOID');
  });
});

describe('conviction', () => {
  it('all +1 => conviction 1 (ACCUMULATE); all -1 => -1 (AVOID)', () => {
    const up = conviction('gold', { regimeFit: 1, valuation: 1, sentiment: 1, momentum: 1, scenarioEv: 1 });
    expect(up.conviction).toBeCloseTo(1, 6); // weights sum to 1
    expect(up.action).toBe('ACCUMULATE');

    const down = conviction('btc', { regimeFit: -1, valuation: -1, sentiment: -1, momentum: -1, scenarioEv: -1 });
    expect(down.conviction).toBeCloseTo(-1, 6);
    expect(down.action).toBe('AVOID');
  });

  it('all zero => HOLD', () => {
    expect(conviction('bonds', zero).conviction).toBe(0);
    expect(conviction('bonds', zero).action).toBe('HOLD');
  });

  it('single input contributes its weight', () => {
    const r = conviction('equities', { ...zero, regimeFit: 1 });
    expect(r.conviction).toBeCloseTo(CONVICTION_WEIGHTS.regimeFit, 6); // 0.30 => LEAN BUY
    expect(r.action).toBe('LEAN BUY');
  });

  it('weights sum to 1', () => {
    const w = CONVICTION_WEIGHTS;
    expect(w.regimeFit + w.valuation + w.sentiment + w.momentum + w.scenarioEv).toBeCloseTo(1, 9);
  });
});
