import { describe, it, expect } from 'vitest';
import { annualizedVol, portfolioCVaR, mixtureCVaR, portfolioVol, analogDrawdowns, worstAnalog } from './risk';

describe('annualizedVol', () => {
  it('flat prices => 0 vol', () => {
    expect(annualizedVol([100, 100, 100, 100])).toBe(0);
  });
  it('more volatile series => higher vol', () => {
    const calm = annualizedVol([100, 101, 100, 101, 100, 101]);
    const wild = annualizedVol([100, 120, 90, 130, 80, 140]);
    expect(wild).toBeGreaterThan(calm);
  });
});

describe('portfolioCVaR', () => {
  it('averages only the worst 5% tail', () => {
    // worst return −0.5 has 3% mass; next −0.2 fills the remaining 2%.
    const dist = [
      { prob: 0.03, ret: -0.5 },
      { prob: 0.1, ret: -0.2 },
      { prob: 0.87, ret: 0.1 },
    ];
    // (0.03*−0.5 + 0.02*−0.2)/0.05 = (−0.015 − 0.004)/0.05 = −0.38
    expect(portfolioCVaR(dist, 0.05)).toBeCloseTo(-0.38, 6);
  });
  it('worst scenario bigger than alpha => CVaR is that return', () => {
    expect(portfolioCVaR([{ prob: 0.3, ret: -0.4 }, { prob: 0.7, ret: 0.1 }], 0.05)).toBeCloseTo(-0.4, 6);
  });
});

describe('analog drawdowns', () => {
  it('weights the per-asset shock; worst analog is the biggest loss', () => {
    const w = { gold: 0.5, cash: 0.5 };
    const dd = analogDrawdowns(w);
    // 1980-82: 0.5*−0.65 + 0.5*0.04 = −0.305
    expect(dd.find((d) => d.analog.startsWith('1980'))!.drawdown).toBeCloseTo(-0.305, 6);
    expect(worstAnalog(w).drawdown).toBeLessThanOrEqual(Math.min(...dd.map((d) => d.drawdown)) + 1e-9);
  });
});

describe('mixtureCVaR', () => {
  it('single normal matches the textbook CVaR95 = μ − σ·φ(1.645)/0.05', () => {
    // φ(1.6449)/0.05 ≈ 2.0627
    expect(mixtureCVaR([{ prob: 1, ret: 0.05 }], 0.1)).toBeCloseTo(0.05 - 0.1 * 2.0627, 3);
  });
  it('a portfolio positive in every scenario still shows a tail LOSS once vol is included', () => {
    const dist = [{ prob: 0.5, ret: 0.04 }, { prob: 0.5, ret: 0.06 }];
    expect(portfolioCVaR(dist)).toBeGreaterThan(0); // the degenerate point-scenario read
    expect(mixtureCVaR(dist, 0.12)).toBeLessThan(0);
  });
  it('zero vol falls back to the discrete CVaR', () => {
    const dist = [{ prob: 0.3, ret: -0.4 }, { prob: 0.7, ret: 0.1 }];
    expect(mixtureCVaR(dist, 0)).toBeCloseTo(portfolioCVaR(dist), 9);
  });
});

describe('portfolioVol', () => {
  it('rho=1 => weighted sum of vols; rho=0 => root-sum-square', () => {
    const w = { a: 0.5, b: 0.5 };
    const v = { a: 0.2, b: 0.4 };
    expect(portfolioVol(w, v, 1)).toBeCloseTo(0.3, 9);
    expect(portfolioVol(w, v, 0)).toBeCloseTo(Math.sqrt(0.01 + 0.04), 9);
  });
});
