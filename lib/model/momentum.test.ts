import { describe, it, expect } from 'vitest';
import { sma, rsi, momentumScore } from './momentum';

const rising = Array.from({ length: 250 }, (_, i) => 100 + i); // strictly up
const falling = Array.from({ length: 250 }, (_, i) => 400 - i); // strictly down

describe('sma / rsi', () => {
  it('sma of last N; null when too short', () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(sma([1, 2], 5)).toBeNull();
  });
  it('rsi = 100 for all gains, 0 for all losses', () => {
    expect(rsi(rising, 14)).toBe(100);
    expect(rsi(falling, 14)).toBe(0);
    expect(rsi([1, 2], 14)).toBeNull();
  });
});

describe('momentumScore', () => {
  it('strong uptrend: above both SMAs (+1.5) minus overbought RSI (-0.5) = +1', () => {
    const m = momentumScore(rising);
    expect(m.above200).toBe(true);
    expect(m.rsi).toBe(100);
    expect(m.score).toBe(1);
  });

  it('strong downtrend: below both SMAs (-1.5) plus oversold RSI (+0.5) = -1', () => {
    const m = momentumScore(falling);
    expect(m.above200).toBe(false);
    expect(m.score).toBe(-1);
  });

  it('short history (<200): 200-SMA skipped, above200 null', () => {
    const short = Array.from({ length: 100 }, (_, i) => 100 + i);
    const m = momentumScore(short);
    expect(m.sma200).toBeNull();
    expect(m.above200).toBeNull();
    expect(m.score).toBe(0); // +0.5 (above sma50) - 0.5 (overbought)
  });

  it('empty series => neutral, no data', () => {
    const m = momentumScore([]);
    expect(m.n).toBe(0);
    expect(m.score).toBe(0);
    expect(m.sma200).toBeNull();
  });

  it('score is clamped to [-2, 2]', () => {
    const m = momentumScore(rising);
    expect(m.score).toBeLessThanOrEqual(2);
    expect(m.score).toBeGreaterThanOrEqual(-2);
  });
});
