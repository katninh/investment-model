import { describe, it, expect } from 'vitest';
import { sahmReading, realRateGuard, rollingCorr, goldDriverChecks } from './integrity';

describe('sahmReading', () => {
  it('>= 0.50 fires the rule (the 2026 bug: a z-score of 0.5 did NOT)', () => {
    const r = sahmReading(0.6);
    expect(r.triggered).toBe(true);
    expect(r.band).toBe('TRIGGERED');
  });

  it('below threshold reports odds, not recession', () => {
    expect(sahmReading(0.4)).toMatchObject({ triggered: false, band: 'ELEVATED' });
    expect(sahmReading(0.2).band).toBe('WATCH');
    expect(sahmReading(-0.1).band).toBe('LOW');
  });
});

describe('realRateGuard', () => {
  it('missing DFII10 => not ok (never derive from nominal − CPI)', () => {
    expect(realRateGuard(null, false).ok).toBe(false);
  });
  it('stale => not ok', () => {
    expect(realRateGuard(2.77, true).ok).toBe(false);
  });
  it('observed & fresh => ok', () => {
    expect(realRateGuard(2.77, false)).toMatchObject({ ok: true, value: 2.77 });
  });
});

describe('rollingCorr', () => {
  it('perfect inverse => −1', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    expect(rollingCorr(a, b).corr).toBeCloseTo(-1, 6);
  });
  it('uses only the last `window` points', () => {
    const a = [0, 0, 0, 1, 2, 3];
    const b = [9, 9, 9, 1, 2, 3];
    expect(rollingCorr(a, b, 3).corr).toBeCloseTo(1, 6);
  });
});

describe('goldDriverChecks', () => {
  it('gold falling as real yields rise => expected negative sign agrees', () => {
    const real = [1, 2, 3, 4, 5];
    const gold = [120, 115, 110, 105, 100]; // inverse to real yields
    const oil = [1, 2, 3, 4, 5]; // gold also inverse to oil here
    const checks = goldDriverChecks(gold, real, oil);
    const ry = checks.find((c) => c.driver === 'gold~realYield')!;
    expect(ry.corr).toBeLessThan(0);
    expect(ry.agrees).toBe(true);
  });

  it('gold rising WITH real yields => sign disagrees (block the narrative)', () => {
    const real = [1, 2, 3, 4, 5];
    const gold = [100, 105, 110, 115, 120]; // moving the "wrong" way
    const checks = goldDriverChecks(gold, real, [5, 4, 3, 2, 1]);
    expect(checks.find((c) => c.driver === 'gold~realYield')!.agrees).toBe(false);
  });
});
