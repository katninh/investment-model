import { describe, it, expect } from 'vitest';
import { constructPortfolio, DEFAULT_CONSTRAINTS } from './portfolio';
import { conviction } from './conviction';

// helper: a conviction result with a given final conviction via regimeFit only
function mk(asset: string, c: number) {
  // regimeFit weight is 0.30; scale so conviction ≈ c (clamped)
  return conviction(asset, { regimeFit: c / 0.3, valuation: 0, sentiment: 0, momentum: 0, scenarioEv: 0 });
}

describe('constructPortfolio', () => {
  const results = [mk('btc', 0.29), mk('equities', 0.06), mk('gold', -0.03), mk('bonds', -0.21)];

  it('weights (incl. cash) sum to 1', () => {
    const allocs = constructPortfolio(results);
    const sum = allocs.reduce((s, a) => s + a.weight, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('only positive-conviction assets get weight; negatives excluded', () => {
    const allocs = constructPortfolio(results);
    const funded = allocs.filter((a) => a.asset !== 'cash' && a.weight > 0).map((a) => a.asset);
    expect(funded).toContain('btc');
    expect(funded).toContain('equities');
    expect(funded).not.toContain('gold');
    expect(funded).not.toContain('bonds');
  });

  it('cash >= minCash and no asset exceeds maxWeight', () => {
    const allocs = constructPortfolio(results);
    const cash = allocs.find((a) => a.asset === 'cash')!;
    expect(cash.weight).toBeGreaterThanOrEqual(DEFAULT_CONSTRAINTS.minCash - 1e-9);
    for (const a of allocs) {
      if (a.asset !== 'cash') expect(a.weight).toBeLessThanOrEqual(DEFAULT_CONSTRAINTS.maxWeight + 1e-9);
    }
  });

  it('higher conviction => higher weight', () => {
    const allocs = constructPortfolio(results);
    const btc = allocs.find((a) => a.asset === 'btc')!;
    const eq = allocs.find((a) => a.asset === 'equities')!;
    expect(btc.weight).toBeGreaterThan(eq.weight);
  });

  it('all non-positive => 100% cash', () => {
    const allocs = constructPortfolio([mk('gold', -0.1), mk('bonds', -0.2)]);
    const cash = allocs.find((a) => a.asset === 'cash')!;
    expect(cash.weight).toBeCloseTo(1, 6);
  });

  it('maxWeight cap sends excess to cash', () => {
    // one dominant asset would exceed 35% without the cap
    const allocs = constructPortfolio([mk('btc', 0.9), mk('gold', 0.05)], { maxWeight: 0.35, minCash: 0.1 });
    const btc = allocs.find((a) => a.asset === 'btc')!;
    expect(btc.weight).toBeCloseTo(0.35, 6);
  });
});
