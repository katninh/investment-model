// Brief generation (PRD §7.9) — deterministic template. Pure, no side effects.
// Builds a structured Brief from computed model outputs; toMarkdown() serializes it
// (for the briefs archive / export). The page renders the same structure as JSX.

import type { RegimeCall } from './regime';
import type { SentimentComposite } from './sentiment';
import type { AssetValuation } from './valuation';
import type { ScenarioResult } from './scenarios';
import type { ConvictionResult } from './conviction';
import type { Allocation } from './portfolio';

export interface BriefInput {
  asOf: string;
  regime: RegimeCall;
  sentiment: SentimentComposite;
  valuation: AssetValuation[];
  scenarios: ScenarioResult[];
  ev: Record<string, number>;
  conviction: ConvictionResult[];
  allocations: Allocation[];
}

export interface BriefSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

export interface Brief {
  title: string;
  asOf: string;
  summary: string;
  sections: BriefSection[];
  disclaimer: string;
}

const LABEL: Record<string, string> = {
  equities: 'Equities',
  gold: 'Gold',
  btc: 'BTC',
  bonds: 'Bonds',
  cash: 'Cash',
};
const label = (a: string) => LABEL[a] ?? a;
const signed = (x: number, d = 2) => `${x >= 0 ? '+' : ''}${x.toFixed(d)}`;
const pct = (x: number, d = 0) => `${x >= 0 && d > 0 ? '+' : ''}${x.toFixed(d)}%`;

const DISCLAIMER =
  'Research and educational tool only. Not financial advice, not a recommendation, and not the ' +
  'output of a licensed advisor. No fiduciary relationship is created. Figures are model estimates ' +
  'and assumptions; do your own due diligence.';

export function buildBrief(input: BriefInput): Brief {
  const { asOf, regime, sentiment, scenarios, ev, conviction, allocations } = input;
  const ranked = [...scenarios].sort((a, b) => b.probability - a.probability);
  const funded = allocations.filter((a) => a.weight > 0.0005);

  const topActions = conviction
    .filter((c) => c.action !== 'HOLD')
    .map((c) => `${label(c.asset)} ${c.action.toLowerCase()}`)
    .join(', ');

  const summary =
    `${regime.regime} regime (${Math.round(regime.confidence * 100)}% conf); ` +
    `${topActions || 'no strong conviction calls'}; ` +
    `target ${funded.map((a) => `${Math.round(a.weight * 100)}% ${label(a.asset)}`).join(' / ')}.`;

  const sections: BriefSection[] = [
    {
      heading: 'Macro Regime',
      paragraphs: [
        `We are in a ${regime.regime} regime (${regime.clockPos}), confidence ${Math.round(
          regime.confidence * 100,
        )}%. ${regime.description}`,
        `Growth composite ${signed(regime.growthScore)}, inflation composite ${signed(
          regime.inflationScore,
        )}.`,
      ],
      bullets: regime.bestAssets.map((a) => `Historically favored: ${a}`),
    },
    {
      heading: 'Conviction & Actions',
      paragraphs: ['Weighted synthesis of all five models, per asset:'],
      bullets: conviction.map(
        (c) => `${label(c.asset)}: ${c.action} (conviction ${signed(c.conviction)})`,
      ),
    },
    {
      heading: 'Sentiment',
      paragraphs: [
        `Crowd sentiment reads ${sentiment.label} (contrarian composite ${signed(
          sentiment.normalized,
        )}; positive = fear = accumulate).`,
      ],
      bullets: [],
    },
    {
      heading: 'Scenarios',
      paragraphs: ['Probability-weighted macro paths:'],
      bullets: ranked.map((s) => `${s.name} (${s.code}): ${Math.round(s.probability * 100)}%`),
    },
    {
      heading: 'Probability-weighted outlook',
      paragraphs: ['Expected 12–18mo return per asset across all scenarios:'],
      bullets: Object.entries(ev).map(([a, r]) => `${label(a)}: ${pct(r, 1)}`),
    },
    {
      heading: 'Target Allocation',
      paragraphs: ['Conviction-weighted, capped 35%/asset, min 10% cash:'],
      bullets: funded.map((a) => `${label(a.asset)}: ${(a.weight * 100).toFixed(0)}% — ${a.rationale}`),
    },
    {
      heading: 'Triggers to watch',
      paragraphs: ['Conditions that would shift the picture toward an alternative scenario:'],
      bullets: ranked
        .slice(1, 3)
        .flatMap((s) =>
          s.allTriggers.filter((t) => !t.met).map((t) => `Toward ${s.name}: ${t.label}`),
        ),
    },
  ];

  return {
    title: 'Investment Brief',
    asOf,
    summary,
    sections,
    disclaimer: DISCLAIMER,
  };
}

export function toMarkdown(brief: Brief): string {
  const lines: string[] = [`# ${brief.title}`, `*As of ${brief.asOf}*`, '', `**${brief.summary}**`, ''];
  for (const s of brief.sections) {
    lines.push(`## ${s.heading}`);
    for (const p of s.paragraphs) lines.push(p, '');
    for (const b of s.bullets) lines.push(`- ${b}`);
    if (s.bullets.length) lines.push('');
  }
  lines.push('---', `*${brief.disclaimer}*`);
  return lines.join('\n');
}
