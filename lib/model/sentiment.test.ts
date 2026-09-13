import { describe, it, expect } from 'vitest';
import { contrarianScore, sentimentComposite } from './sentiment';

describe('contrarianScore', () => {
  it('greedWhenHigh: high pctRank = greed (-1), low = fear (+1)', () => {
    expect(contrarianScore(0.9, true)).toBe(-1);
    expect(contrarianScore(0.1, true)).toBe(1);
    expect(contrarianScore(0.5, true)).toBe(0);
  });
  it('greedWhenHigh=false (e.g. cash level): inverted', () => {
    expect(contrarianScore(0.9, false)).toBe(1); // high cash = fear = accumulate
    expect(contrarianScore(0.1, false)).toBe(-1);
  });
});

describe('sentimentComposite', () => {
  it('both F&G at extreme greed => negative composite, GREED/EXTREME label', () => {
    const c = sentimentComposite([
      { id: 'SENT_CNN_FG', pctRank: 0.95, stale: false },
      { id: 'SENT_CRYPTO_FG', pctRank: 0.9, stale: false },
    ]);
    expect(c.composite).toBe(-4); // -1*2 + -1*2
    expect(c.normalized).toBe(-1);
    expect(c.label).toBe('EXTREME GREED');
  });

  it('extreme fear => positive composite = accumulate', () => {
    const c = sentimentComposite([{ id: 'SENT_CNN_FG', pctRank: 0.05, stale: false }]);
    expect(c.composite).toBe(2);
    expect(c.label).toBe('EXTREME FEAR');
  });

  it('COT weighted highest (3 vs 2)', () => {
    const c = sentimentComposite([{ id: 'SENT_COT_GOLD', pctRank: 0.9, stale: false }]);
    expect(c.contributions[0].weight).toBe(3);
    expect(c.composite).toBe(-3);
  });

  it('stale inputs down-weighted (x0.3)', () => {
    const c = sentimentComposite([{ id: 'SENT_CNN_FG', pctRank: 0.9, stale: true }]);
    expect(c.contributions[0].weight).toBeCloseTo(0.6, 6); // 2 * 0.3
    expect(c.composite).toBeCloseTo(-0.6, 6);
  });

  it('unknown ids are ignored; empty => NEUTRAL, 0', () => {
    const c = sentimentComposite([{ id: 'NOPE', pctRank: 0.9, stale: false }]);
    expect(c.contributions).toHaveLength(0);
    expect(c.composite).toBe(0);
    expect(c.label).toBe('NEUTRAL');
  });
});
