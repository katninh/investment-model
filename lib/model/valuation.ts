// Model 2 — Valuation (PRD §7.3). Pure, no side effects.
// Each metric is percentile-ranked against its own history, inverted where a HIGH
// reading means expensive, averaged per asset → a 1–10 score (10 = cheapest).

export interface ValMetricInput {
  id: string;
  pctRank: number; // 0..1
}

export interface AssetValuation {
  asset: string;
  score: number; // 1..10, 10 = cheapest
  cheapness: number; // 0..1
  metrics: { id: string; label: string; pctRank: number; cheapness: number }[];
}

// A pre-computed metric (not a simple percentile) injected by the data layer,
// e.g. the gold real-yield regression residual below.
export interface ExtraMetric {
  asset: string;
  id: string;
  label: string;
  cheapness: number; // 0..1
}

// Gold anchored to real yields (v5 Pass 2.7, the core 2026 fix). OLS of ln(gold)
// on the 10Y real yield over aligned history; the latest residual says how rich
// (positive) or cheap (negative) gold is vs what real rates alone imply. This
// replaces the naive DFII10 percentile so a structural thesis can't override the
// cyclical driver. Arrays must be date-aligned and equal length.
export interface GoldResidual {
  residual: number; // ln-price units
  z: number; // residual / sd(residuals); +rich, −cheap
  beta: number; // ln(gold) per 1pp real yield (expect < 0)
  cheapness: number; // 0..1, 10=cheapest mapping
  n: number;
}

export function goldRealYieldResidual(gold: number[], realYield: number[]): GoldResidual {
  const n = Math.min(gold.length, realYield.length);
  if (n < 2) return { residual: 0, z: 0, beta: 0, cheapness: 0.5, n };
  const x = realYield.slice(realYield.length - n);
  const y = gold.slice(gold.length - n).map((g) => Math.log(g));
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  const beta = sxx === 0 ? 0 : sxy / sxx;
  const alpha = my - beta * mx;
  const resid = y.map((yi, i) => yi - (alpha + beta * x[i]));
  const sd = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / (n - 1));
  const latest = resid[resid.length - 1];
  const z = sd === 0 ? 0 : latest / sd;
  // z=+2 (2σ rich) → 0 cheap; z=−2 (2σ cheap) → 1. Clamp to [0,1].
  const cheapness = Math.min(1, Math.max(0, 0.5 - 0.25 * z));
  return { residual: latest, z, beta, cheapness, n };
}

interface ValCfg {
  asset: string;
  label: string;
  highIsExpensive: boolean; // does a HIGH reading mean expensive/unfavorable?
}

// ponytail: inline config; moves to config.ts (tunable) in Phase 4.
const VAL_CONFIG: Record<string, ValCfg> = {
  VAL_BUFFETT: { asset: 'Equities', label: 'Buffett Indicator', highIsExpensive: true },
  VAL_CAPE: { asset: 'Equities', label: 'Shiller CAPE', highIsExpensive: true },
  VAL_DOW_GOLD: { asset: 'Gold', label: 'Dow/Gold ratio', highIsExpensive: false }, // high = gold cheap vs stocks
  // Gold's real-rate input is now the regression residual (see goldRealYieldResidual),
  // injected via `extra` — NOT a naive DFII10 percentile (v5 errors log #1/#4/#5).
  VAL_BTC_MVRV: { asset: 'BTC', label: 'BTC MVRV', highIsExpensive: true },
};

export function valuationScores(inputs: ValMetricInput[], extra: ExtraMetric[] = []): AssetValuation[] {
  const byAsset = new Map<string, AssetValuation['metrics']>();

  for (const input of inputs) {
    const cfg = VAL_CONFIG[input.id];
    if (!cfg) continue;
    const cheapness = cfg.highIsExpensive ? 1 - input.pctRank : input.pctRank;
    const list = byAsset.get(cfg.asset) ?? [];
    list.push({ id: input.id, label: cfg.label, pctRank: input.pctRank, cheapness });
    byAsset.set(cfg.asset, list);
  }

  for (const m of extra) {
    const list = byAsset.get(m.asset) ?? [];
    list.push({ id: m.id, label: m.label, pctRank: m.cheapness, cheapness: m.cheapness });
    byAsset.set(m.asset, list);
  }

  return [...byAsset.entries()]
    .map(([asset, metrics]) => {
      const cheapness = metrics.reduce((s, m) => s + m.cheapness, 0) / metrics.length;
      return { asset, cheapness, score: 1 + 9 * cheapness, metrics };
    })
    .sort((a, b) => b.score - a.score); // cheapest first
}

// --- SJC premium (v5 Pass 2.7 / 3.12) ----------------------------------------
// 1 lượng = 37.5 g = 1.2057 troy oz. World parity in million VND per lượng:
//   parity = XAU(USD/oz) × USD/VND × 1.2057 / 1e6
// SJC = parity × (1 + premium). The premium is a SEPARATE risk from world gold:
// it compresses when the world price stabilises (v5 gold rules).
export const OZ_PER_LUONG = 1.2057;

export function sjcParity(xau: number, usdVnd: number): number {
  return (xau * usdVnd * OZ_PER_LUONG) / 1e6;
}

export function sjcPremium(sjcMvnd: number, xau: number, usdVnd: number): number {
  return sjcMvnd / sjcParity(xau, usdVnd) - 1;
}

// SJC level implied by an XAU level at a given premium (for playbook entry zones).
export function sjcFromXau(xau: number, usdVnd: number, premium: number): number {
  return sjcParity(xau, usdVnd) * (1 + premium);
}

// --- Equity risk premium vs 10Y TIPS (v5 Pass 2.7) ---------------------------
// Cyclically-adjusted earnings yield minus the real yield, both in %: what
// equities pay over a risk-free real bond. Higher ERP = equities cheaper.
export function equityRiskPremium(cape: number, realYield: number): number {
  return 100 / cape - realYield;
}
