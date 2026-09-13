import { describe, it, expect } from 'vitest';
import { valuationScores } from './valuation';

describe('valuationScores', () => {
  it('high Buffett (expensive) => low equities score (near 1)', () => {
    const [eq] = valuationScores([{ id: 'VAL_BUFFETT', pctRank: 1 }]);
    expect(eq.asset).toBe('Equities');
    expect(eq.cheapness).toBe(0);
    expect(eq.score).toBe(1);
  });

  it('low Buffett (cheap) => high equities score (near 10)', () => {
    const [eq] = valuationScores([{ id: 'VAL_BUFFETT', pctRank: 0 }]);
    expect(eq.cheapness).toBe(1);
    expect(eq.score).toBe(10);
  });

  it('Dow/Gold NOT inverted: high ratio => gold cheap', () => {
    const [g] = valuationScores([{ id: 'VAL_DOW_GOLD', pctRank: 0.9 }]);
    expect(g.asset).toBe('Gold');
    expect(g.metrics[0].cheapness).toBeCloseTo(0.9, 6);
  });

  it('gold averages its two metrics (Dow/Gold + real rate)', () => {
    const [g] = valuationScores([
      { id: 'VAL_DOW_GOLD', pctRank: 0.8 }, // cheapness 0.8
      { id: 'FRED_DFII10', pctRank: 0.6 }, // highIsExpensive => cheapness 0.4
    ]);
    expect(g.metrics).toHaveLength(2);
    expect(g.cheapness).toBeCloseTo(0.6, 6); // (0.8 + 0.4)/2
  });

  it('MVRV high => BTC expensive; sorted cheapest first; unknown ids ignored', () => {
    const out = valuationScores([
      { id: 'VAL_BTC_MVRV', pctRank: 1 }, // score 1
      { id: 'VAL_BUFFETT', pctRank: 0 }, // score 10
      { id: 'NOPE', pctRank: 0.5 },
    ]);
    expect(out.map((a) => a.asset)).toEqual(['Equities', 'BTC']); // cheapest first
    expect(out.find((a) => a.asset === 'BTC')!.score).toBe(1);
  });
});
