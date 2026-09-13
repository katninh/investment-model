// Model 3 — Sentiment Composite (PRD §7.4). Pure, no side effects.
// Contrarian: positive = fear = accumulate; negative = greed = caution.

export interface SentimentInput {
  id: string;
  pctRank: number; // 0..1, latest reading's position within its own history
  stale: boolean;
}

export interface SentimentContribution {
  id: string;
  score: -1 | 0 | 1; // contrarian: +1 fear, -1 greed
  weight: number; // effective weight after staleness
  contribution: number; // score * weight
}

export interface SentimentComposite {
  composite: number; // weighted sum (raw)
  normalized: number; // composite / total weight, -1..1
  label: 'EXTREME FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME GREED';
  contributions: SentimentContribution[];
}

interface SentCfg {
  weight: number;
  greedWhenHigh: boolean; // does a HIGH reading mean the crowd is greedy?
}

// ponytail: inline config; moves to config.ts (tunable) in Phase 4.
// COT positioning + fund flows weighted highest (§7.4).
const SENTIMENT_CONFIG: Record<string, SentCfg> = {
  SENT_COT_GOLD: { weight: 3, greedWhenHigh: true },
  SENT_GLD_FLOWS: { weight: 3, greedWhenHigh: true },
  SENT_CNN_FG: { weight: 2, greedWhenHigh: true },
  SENT_CRYPTO_FG: { weight: 2, greedWhenHigh: true },
  SENT_AAII: { weight: 2, greedWhenHigh: true },
  SENT_BOFA_FMS: { weight: 2, greedWhenHigh: false }, // high cash = fear (contrarian bullish)
};

const EXTREME_HIGH = 0.8;
const EXTREME_LOW = 0.2;
const STALE_WEIGHT_FACTOR = 0.3; // down-weight stale inputs (§5.2)

export function contrarianScore(pctRank: number, greedWhenHigh: boolean): -1 | 0 | 1 {
  const high = pctRank >= EXTREME_HIGH;
  const low = pctRank <= EXTREME_LOW;
  if (!high && !low) return 0;
  const isGreed = greedWhenHigh ? high : low;
  return isGreed ? -1 : 1;
}

function label(normalized: number): SentimentComposite['label'] {
  if (normalized >= 0.5) return 'EXTREME FEAR';
  if (normalized >= 0.15) return 'FEAR';
  if (normalized <= -0.5) return 'EXTREME GREED';
  if (normalized <= -0.15) return 'GREED';
  return 'NEUTRAL';
}

export function sentimentComposite(inputs: SentimentInput[]): SentimentComposite {
  const contributions: SentimentContribution[] = inputs
    .filter((i) => SENTIMENT_CONFIG[i.id])
    .map((i) => {
      const cfg = SENTIMENT_CONFIG[i.id];
      const score = contrarianScore(i.pctRank, cfg.greedWhenHigh);
      const weight = cfg.weight * (i.stale ? STALE_WEIGHT_FACTOR : 1);
      return { id: i.id, score, weight, contribution: score * weight };
    });

  const composite = contributions.reduce((s, c) => s + c.contribution, 0);
  const totalWeight = contributions.reduce((s, c) => s + c.weight, 0) || 1;
  const normalized = composite / totalWeight;

  return { composite, normalized, label: label(normalized), contributions };
}
