import { describe, it, expect } from 'vitest';
import { taylorRate, fedReaction } from './fed';

// Oct 2026 baseline (v5): core PCE 3.4, UNRATE 4.2, EFFR 3.88.
const now = { policyRate: 3.88, coreInflation: 3.4, unemployment: 4.2 };

describe('taylorRate', () => {
  it('matches the hand calc on the 2026 baseline', () => {
    // 0.5 + 3.4 + 0.5*(3.4-2) + 0.5*(-2*(4.2-4.3)) = 0.5+3.4+0.7+0.1 = 4.7
    expect(taylorRate(now)).toBeCloseTo(4.7, 6);
  });
});

describe('fedReaction', () => {
  it('2026 baseline => hawkish pressure, lean HIKE (the model should NOT say "cannot hike")', () => {
    const f = fedReaction(now);
    expect(f.gap).toBeCloseTo(0.82, 6);
    expect(f.lean).toBe('HIKE');
    expect(f.hikeProb).toBeGreaterThan(0.5);
    expect(f.terminalRate).toBeGreaterThan(f.policyRate);
  });

  it('policy already above the rule => lean CUT', () => {
    const f = fedReaction({ policyRate: 6.0, coreInflation: 2.0, unemployment: 4.3 });
    expect(f.lean).toBe('CUT');
    expect(f.hikeProb).toBeLessThan(0.5);
  });

  it('policy at the rule => HOLD', () => {
    const f = fedReaction({ policyRate: 2.5, coreInflation: 2.0, unemployment: 4.3 });
    // taylor = 0.5+2+0 +0 = 2.5, gap 0
    expect(f.gap).toBeCloseTo(0, 6);
    expect(f.lean).toBe('HOLD');
    expect(f.hikeProb).toBeCloseTo(0.5, 6);
  });
});
