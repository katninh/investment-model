import { describe, it, expect } from 'vitest';
import { classifyRegime } from './regime';

describe('classifyRegime', () => {
  it('growth up + inflation up => OVERHEAT', () => {
    expect(classifyRegime(0.8, 0.8).regime).toBe('OVERHEAT');
  });
  it('growth up + inflation down => RECOVERY', () => {
    expect(classifyRegime(0.8, -0.8).regime).toBe('RECOVERY');
  });
  it('growth down + inflation up => STAGFLATION (matches §9 narrative)', () => {
    const c = classifyRegime(-0.6, 0.6);
    expect(c.regime).toBe('STAGFLATION');
    expect(c.clockPos).toBe("6-9 o'clock");
    expect(c.bestAssets).toContain('Gold');
  });
  it('growth down + inflation down => RECESSION', () => {
    expect(classifyRegime(-0.6, -0.6).regime).toBe('RECESSION');
  });

  it('near-zero axis => TRANSITION', () => {
    expect(classifyRegime(0.05, 0.8).regime).toBe('TRANSITION');
    expect(classifyRegime(0.8, 0.1).regime).toBe('TRANSITION');
  });

  it('confidence in [0,1], grows with magnitude, ~1 at the corners', () => {
    expect(classifyRegime(0, 0).confidence).toBe(0);
    expect(classifyRegime(1, 1).confidence).toBeCloseTo(1, 6);
    expect(classifyRegime(0.9, 0.9).confidence).toBeGreaterThan(classifyRegime(0.3, 0.3).confidence);
    expect(classifyRegime(1, 1).confidence).toBeLessThanOrEqual(1);
  });

  it('reports directions and passes scores through', () => {
    const c = classifyRegime(-0.6, 0.6);
    expect(c.growthDir).toBe(-1);
    expect(c.inflationDir).toBe(1);
    expect(c.growthScore).toBe(-0.6);
    expect(c.inflationScore).toBe(0.6);
  });
});
