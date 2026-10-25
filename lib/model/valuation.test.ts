import { describe, it, expect } from 'vitest';
import { valuationScores, goldRealYieldResidual, sjcParity, sjcPremium, sjcFromXau, equityRiskPremium } from './valuation';

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

  it('gold averages Dow/Gold + injected real-rate residual metric', () => {
    const [g] = valuationScores(
      [{ id: 'VAL_DOW_GOLD', pctRank: 0.8 }], // cheapness 0.8
      [{ asset: 'Gold', id: 'VAL_GOLD_REALRATE', label: 'residual', cheapness: 0.4 }],
    );
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

describe('goldRealYieldResidual', () => {
  const real = [1, 2, 3, 4, 5];
  const onLine = real.map((x) => Math.exp(2 - 0.5 * x)); // ln(gold) exactly 2 − 0.5·real

  it('gold on the real-yield line => neutral (z~0, cheapness~0.5), beta negative', () => {
    const r = goldRealYieldResidual(onLine, real);
    expect(r.z).toBeCloseTo(0, 6);
    expect(r.cheapness).toBeCloseTo(0.5, 6);
    expect(r.beta).toBeLessThan(0); // higher real yield => lower gold
  });

  it('gold spiking above its implied line reads RICH (cheapness < 0.5)', () => {
    const rich = [...onLine.slice(0, 4), onLine[4] * 1.5];
    const r = goldRealYieldResidual(rich, real);
    expect(r.z).toBeGreaterThan(0);
    expect(r.cheapness).toBeLessThan(0.5);
  });

  it('too little history => neutral', () => {
    expect(goldRealYieldResidual([100], [2])).toMatchObject({ cheapness: 0.5, n: 1 });
  });
});


describe('SJC premium (v5 formula: SJC = XAU × USD/VND × 1.2057 × (1+p) / 1e6)', () => {
  it('reproduces the v5 baseline (~8% over parity)', () => {
    // XAU ~4,125, USD/VND ~26,400, SJC sell 142.6M VND/lượng
    expect(sjcParity(4125, 26400)).toBeCloseTo(131.3, 1);
    expect(sjcPremium(142.6, 4125, 26400)).toBeCloseTo(0.086, 3);
  });

  it('sjcFromXau inverts sjcPremium', () => {
    const p = sjcPremium(142.6, 4125, 26400);
    expect(sjcFromXau(4125, 26400, p)).toBeCloseTo(142.6, 6);
  });
});

describe('equityRiskPremium', () => {
  it('CAPE 40 with 10Y TIPS 2.64% => ERP ~ −0.14% (equities pay less than real bonds)', () => {
    expect(equityRiskPremium(40, 2.64)).toBeCloseTo(-0.14, 6);
  });
  it('CAPE metric is inverted: high CAPE => expensive', () => {
    const [eq] = valuationScores([{ id: 'VAL_CAPE', pctRank: 0.95 }]);
    expect(eq.cheapness).toBeCloseTo(0.05, 6);
  });
});
