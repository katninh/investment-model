// Model 6 — Fed Reaction Function (Macro Model Review v5, Pass 1.5). Pure, no side effects.
// Scores the Fed's likely path from a Taylor rule rather than from what policy
// "should" be — directly addressing the 2026 error "Fed cannot hike into weak jobs".
//
// Taylor (1993): r* + π + 0.5(π − π*) + 0.5·ygap
//   r*    neutral real rate (assumption)
//   π     core inflation, y/y
//   π*    inflation target
//   ygap  output gap, via Okun's law from the unemployment gap: ≈ −2·(u − u*)
//
// gap = taylorRate − policyRate. Positive gap = policy sits BELOW the rule =
// hawkish pressure (lean hike). This is the deterministic core.
//
// ponytail: per-FOMC meeting probabilities + dots-vs-market need CME FedWatch,
// which the pipeline does not yet ingest. Until then we derive a single
// next-move hike probability from the gap via a logistic (documented heuristic);
// swap in FedWatch odds when that source lands.

export interface FedParams {
  policyRate: number; // EFFR / Fed funds, %
  coreInflation: number; // core PCE y/y, %
  unemployment: number; // UNRATE, %
  neutralReal?: number; // r*, default 0.5
  target?: number; // π*, default 2.0
  naturalU?: number; // u*, default 4.3
}

export type FedLean = 'HIKE' | 'HOLD' | 'CUT';

export interface FedCall {
  policyRate: number;
  coreInflation: number;
  unemployment: number;
  taylorRate: number; // rule-implied policy rate, %
  gap: number; // taylorRate − policyRate, %
  lean: FedLean;
  hikeProb: number; // 0..1, next-move hike lean from the gap (heuristic)
  terminalRate: number; // policyRate + gap rounded to 25bp, %
  note: string;
}

// A move is "leaning" once the gap clears ~half a 25bp step.
const LEAN_BAND = 0.125;
// Logistic steepness mapping the gap (%) to a hike probability. k≈1.6 puts a
// +0.5% gap near ~0.69. ponytail: hand-tuned; recalibrate against FedWatch.
const LOGISTIC_K = 1.6;

export function taylorRate(p: FedParams): number {
  const rStar = p.neutralReal ?? 0.5;
  const target = p.target ?? 2.0;
  const uStar = p.naturalU ?? 4.3;
  const ygap = -2 * (p.unemployment - uStar); // Okun's law
  return rStar + p.coreInflation + 0.5 * (p.coreInflation - target) + 0.5 * ygap;
}

export function fedReaction(p: FedParams): FedCall {
  const tr = taylorRate(p);
  const gap = tr - p.policyRate;
  const lean: FedLean = gap > LEAN_BAND ? 'HIKE' : gap < -LEAN_BAND ? 'CUT' : 'HOLD';
  const hikeProb = 1 / (1 + Math.exp(-LOGISTIC_K * gap));
  // Round the gap to the nearest 25bp to imply where policy settles.
  const terminalRate = p.policyRate + Math.round(gap / 0.25) * 0.25;
  return {
    policyRate: p.policyRate,
    coreInflation: p.coreInflation,
    unemployment: p.unemployment,
    taylorRate: tr,
    gap,
    lean,
    hikeProb,
    terminalRate,
    note:
      lean === 'HIKE'
        ? 'Taylor rule sits above policy — hawkish pressure, lean hike'
        : lean === 'CUT'
          ? 'Taylor rule sits below policy — room to cut'
          : 'Policy roughly at the Taylor rule — hold',
  };
}

// --- Market view (v5: "dots vs market") --------------------------------------
// What the MARKET prices, to set against what the rule says. Preferred source is
// a CME FedWatch hike probability (entered manually on /data as FEDWATCH_HIKE —
// FedWatch has no free API). Fallback: the 2Y Treasury vs EFFR spread, the
// market's own priced path over ~2 years (a positive spread = hikes priced).
export interface MarketFedView {
  source: 'FedWatch' | '2Y−EFFR spread';
  hikeProb: number; // 0..1
  spreadBp: number | null; // 2Y − EFFR in bp (fallback only)
  ruleMinusMarket: number; // Taylor hikeProb − market hikeProb (+ = rule more hawkish)
}

export function marketFedView(
  rule: FedCall,
  fedwatchHikePct: number | null, // fresh FedWatch reading in %, or null
  dgs2: number | null,
  effr: number,
): MarketFedView | null {
  let source: MarketFedView['source'];
  let hikeProb: number;
  let spreadBp: number | null = null;
  if (fedwatchHikePct != null) {
    source = 'FedWatch';
    hikeProb = Math.min(1, Math.max(0, fedwatchHikePct / 100));
  } else if (dgs2 != null) {
    source = '2Y−EFFR spread';
    spreadBp = (dgs2 - effr) * 100;
    // ponytail: same logistic as the rule gap; 2Y carries term premium, so this
    // is a direction-of-pricing proxy, not a per-meeting odds.
    hikeProb = 1 / (1 + Math.exp(-LOGISTIC_K * (dgs2 - effr)));
  } else {
    return null;
  }
  return { source, hikeProb, spreadBp, ruleMinusMarket: rule.hikeProb - hikeProb };
}
