import { describe, it, expect } from 'vitest';
import { regimeTransitionOdds } from './regime';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('regimeTransitionOdds', () => {
  it('odds sum to 1 at both horizons', () => {
    for (const t of regimeTransitionOdds(0.3, 0.3, 0.1, -0.1)) {
      expect(sum(t.odds)).toBeCloseTo(1, 6);
    }
  });

  it('stagflation now (growth−, inflation+) is the dominant near-term regime', () => {
    const [m3] = regimeTransitionOdds(-0.4, 0.4, 0, 0);
    const top = Object.entries(m3.odds).sort(([, a], [, b]) => b - a)[0][0];
    expect(top).toBe('STAGFLATION');
  });

  it('rising-growth momentum shifts 12m odds toward RECOVERY/OVERHEAT vs 3m', () => {
    const [m3, m12] = regimeTransitionOdds(-0.1, 0.1, 0.6, -0.2);
    const up3 = m3.odds.RECOVERY + m3.odds.OVERHEAT;
    const up12 = m12.odds.RECOVERY + m12.odds.OVERHEAT;
    expect(up12).toBeGreaterThan(up3); // momentum compounds over the longer horizon
  });

  it('near-zero scores with no momentum => TRANSITION carries real mass', () => {
    const [m3] = regimeTransitionOdds(0, 0, 0, 0);
    expect(m3.odds.TRANSITION).toBeGreaterThan(0.05);
  });
});
