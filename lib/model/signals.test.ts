import { describe, it, expect } from 'vitest';
import { computeSignal, mean, stdDev, percentileRank } from './signals';

describe('primitives', () => {
  it('mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('sample stdDev (n-1); 0 for n<2', () => {
    expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(1.58114, 4); // sqrt(2.5)
    expect(stdDev([5])).toBe(0);
    expect(stdDev([5, 5, 5])).toBe(0);
  });

  it('percentileRank = fraction at or below', () => {
    expect(percentileRank([1, 2, 3, 4, 5], 5)).toBe(1);
    expect(percentileRank([1, 2, 3, 4, 5], 3)).toBeCloseTo(0.6, 10);
    expect(percentileRank([], 1)).toBe(0);
  });
});

describe('computeSignal', () => {
  const asc = [1, 2, 3, 4, 5];

  it('stats + BULLISH when higherIsBetter and z above +0.5', () => {
    const s = computeSignal(asc, true);
    expect(s.latest).toBe(5);
    expect(s.zScore).toBeCloseTo(1.2649, 3); // (5-3)/1.58114
    expect(s.pctRank).toBe(1);
    expect(s.mom1m).toBeCloseTo(0.25, 10);   // (5-4)/4
    expect(s.mom3m).toBeCloseTo(1.5, 10);    // (5-2)/2
    expect(s.mom12m).toBe(0);                 // not enough history
    expect(s.signal).toBe(1);
    expect(s.signalLabel).toBe('BULLISH');
  });

  it('direction inverts when higherIsBetter is false', () => {
    const s = computeSignal(asc, false);
    expect(s.signal).toBe(-1);
    expect(s.signalLabel).toBe('BEARISH');
  });

  it('null direction is always NEUTRAL', () => {
    const s = computeSignal(asc, null);
    expect(s.signal).toBe(0);
    expect(s.signalLabel).toBe('NEUTRAL');
  });

  it('within ±0.5σ band => NEUTRAL even if higherIsBetter', () => {
    // latest 3, mean 2.6, sd ~1.140 => z ~0.351 (inside band)
    const s = computeSignal([1, 2, 3, 4, 3], true);
    expect(Math.abs(s.zScore)).toBeLessThan(0.5);
    expect(s.signal).toBe(0);
  });

  it('zero variance => z 0, NEUTRAL', () => {
    const s = computeSignal([5, 5, 5], true);
    expect(s.zScore).toBe(0);
    expect(s.signal).toBe(0);
    expect(s.pctRank).toBe(1);
  });

  it('momentum uses |prev| so sign follows the change, not the base', () => {
    const s = computeSignal([-4, 2], null);
    expect(s.mom1m).toBeCloseTo(1.5, 10); // (2 - -4)/|−4|
  });

  it('throws on empty series (trust boundary)', () => {
    expect(() => computeSignal([], true)).toThrow(/empty series/);
  });
});
