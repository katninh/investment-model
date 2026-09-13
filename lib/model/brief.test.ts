import { describe, it, expect } from 'vitest';
import { buildBrief, toMarkdown, type BriefInput } from './brief';

const input: BriefInput = {
  asOf: '2026-09-13',
  regime: {
    regime: 'OVERHEAT',
    growthDir: 1,
    inflationDir: 1,
    growthScore: 0.67,
    inflationScore: 0.67,
    confidence: 0.67,
    clockPos: "3-6 o'clock",
    bestAssets: ['Gold', 'Energy'],
    description: 'Late-cycle overheat.',
  },
  sentiment: { composite: 0, normalized: 0, label: 'NEUTRAL', contributions: [] },
  valuation: [],
  scenarios: [
    { code: 'B', name: 'Overheat', score: 5, probability: 0.5, metTriggers: [], allTriggers: [{ label: 'x', met: true }], assetReturns: {} },
    { code: 'D', name: 'Recession', score: 2, probability: 0.3, metTriggers: [], allTriggers: [{ label: 'credit stress', met: false }], assetReturns: {} },
    { code: 'A', name: 'Soft Landing', score: 2, probability: 0.2, metTriggers: [], allTriggers: [{ label: 'inflation easing', met: false }], assetReturns: {} },
  ],
  ev: { btc: 15.8, gold: 11 },
  conviction: [
    { asset: 'btc', conviction: 0.29, action: 'LEAN BUY', inputs: { regimeFit: 0, valuation: 0, sentiment: 0, momentum: 0, scenarioEv: 0 } },
    { asset: 'gold', conviction: -0.03, action: 'HOLD', inputs: { regimeFit: 0, valuation: 0, sentiment: 0, momentum: 0, scenarioEv: 0 } },
  ],
  allocations: [
    { asset: 'btc', weight: 0.35, conviction: 0.29, action: 'LEAN BUY', rationale: 'scenario outlook' },
    { asset: 'cash', weight: 0.5, conviction: 0, action: 'HOLD', rationale: 'reserve' },
  ],
};

describe('buildBrief', () => {
  it('summary names regime and actions', () => {
    const b = buildBrief(input);
    expect(b.summary).toContain('OVERHEAT');
    expect(b.summary.toLowerCase()).toContain('btc lean buy');
  });

  it('has all seven sections', () => {
    expect(buildBrief(input).sections.map((s) => s.heading)).toEqual([
      'Macro Regime',
      'Conviction & Actions',
      'Sentiment',
      'Scenarios',
      'Probability-weighted outlook',
      'Target Allocation',
      'Triggers to watch',
    ]);
  });

  it('triggers section lists unmet triggers of alternative scenarios', () => {
    const t = buildBrief(input).sections.find((s) => s.heading === 'Triggers to watch')!;
    expect(t.bullets.some((b) => b.includes('credit stress'))).toBe(true);
    expect(t.bullets.some((b) => b.includes('inflation easing'))).toBe(true);
  });
});

describe('toMarkdown', () => {
  it('renders headings, summary, and disclaimer', () => {
    const md = toMarkdown(buildBrief(input));
    expect(md).toContain('# Investment Brief');
    expect(md).toContain('## Macro Regime');
    expect(md).toContain('- BTC: LEAN BUY');
    expect(md).toMatch(/Not financial advice/i);
  });
});
