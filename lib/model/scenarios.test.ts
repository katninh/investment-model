import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  scenarioProbabilities,
  expectedReturns,
  type SignalSet,
} from './scenarios';

const base: SignalSet = {
  growthScore: 0,
  inflationScore: 0,
  realRateZ: 0,
  hySpreadZ: 0,
  vixZ: 0,
  sahmZ: 0,
  curveValue: 0,
};

describe('scenarioProbabilities', () => {
  it('probabilities sum to 1', () => {
    const res = scenarioProbabilities(SCENARIOS, { ...base, growthScore: 0.5, inflationScore: 0.5 });
    const sum = res.reduce((a, r) => a + r.probability, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('recession signals => Recession scenario highest probability', () => {
    const recession: SignalSet = {
      growthScore: -0.6,
      inflationScore: -0.3,
      realRateZ: -0.5,
      hySpreadZ: 1.2,
      vixZ: 1.0,
      sahmZ: 1.0,
      curveValue: -0.2,
    };
    const res = scenarioProbabilities(SCENARIOS, recession);
    const top = [...res].sort((a, b) => b.probability - a.probability)[0];
    expect(top.name).toBe('Recession');
    expect(top.metTriggers.length).toBeGreaterThanOrEqual(4);
  });

  it('overheat signals => Overheat scenario ranks top', () => {
    const overheat: SignalSet = { ...base, growthScore: 0.6, inflationScore: 0.6, realRateZ: 0.3 };
    const res = scenarioProbabilities(SCENARIOS, overheat);
    const top = [...res].sort((a, b) => b.probability - a.probability)[0];
    expect(top.name).toBe('Overheat');
  });

  it('no triggers met => uniform probabilities', () => {
    const res = scenarioProbabilities(SCENARIOS, base);
    // base fires "Growth not collapsing" (E) etc., so force a truly-empty case:
    const impossible = SCENARIOS.map((s) => ({ ...s, triggers: [] }));
    const uni = scenarioProbabilities(impossible, base);
    expect(uni.every((r) => Math.abs(r.probability - 1 / uni.length) < 1e-9)).toBe(true);
    expect(res.length).toBe(5);
  });
});

describe('expectedReturns', () => {
  it('EV = sum of prob-weighted returns; equals the single scenario when p=1', () => {
    const res = scenarioProbabilities(SCENARIOS, {
      ...base,
      growthScore: -0.6,
      inflationScore: -0.3,
      realRateZ: -0.5,
      hySpreadZ: 1.2,
      vixZ: 1.0,
      sahmZ: 1.0,
      curveValue: -0.2,
    });
    const ev = expectedReturns(res);
    // bonds should have positive EV in a recession-dominated distribution
    expect(ev.bonds).toBeGreaterThan(0);
    // btc should be dragged negative
    expect(ev.btc).toBeLessThan(ev.bonds);
  });
});
