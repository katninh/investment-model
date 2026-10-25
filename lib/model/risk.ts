// Layer 5 risk metrics (Macro Model Review v5, Pass 3.11). Pure, no side effects.
// CVaR from the scenario distribution + worst historical-analog drawdown.

// Annualized volatility from a daily price series: sd of log returns × √252.
export function annualizedVol(prices: number[]): number {
  if (prices.length < 3) return 0;
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) r.push(Math.log(prices[i] / prices[i - 1]));
  }
  if (r.length < 2) return 0;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(252);
}

// CVaR(1−alpha) over a DISCRETE distribution of portfolio returns: the
// probability-weighted mean return within the worst `alpha` tail. Returns a
// negative number (a loss). With few scenarios the tail may sit inside one
// scenario, in which case CVaR is that worst scenario's return.
export function portfolioCVaR(dist: { prob: number; ret: number }[], alpha = 0.05): number {
  if (dist.length === 0) return 0;
  const sorted = [...dist].sort((a, b) => a.ret - b.ret); // worst first
  let acc = 0;
  let wsum = 0;
  for (const d of sorted) {
    const take = Math.min(d.prob, alpha - acc);
    if (take <= 0) break;
    wsum += take * d.ret;
    acc += take;
  }
  return acc > 0 ? wsum / acc : sorted[0].ret;
}

// --- CVaR of a scenario MIXTURE ---------------------------------------------
// Point scenarios have no spread inside them, so a portfolio positive in every
// scenario shows a "gain" in its worst 5% — understating tail risk. Treat each
// scenario as Normal(μ_s, σ) with σ = the portfolio's 12m vol, then solve the
// mixture's 5% quantile exactly (closed-form tail mean per normal component).

// Standard normal CDF via erf (Abramowitz & Stegun 7.1.26, |err| < 1.5e-7).
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
const normPdf = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);

// Portfolio vol from per-asset vols with one constant pairwise correlation.
// ponytail: constant rho; a measured correlation matrix is the upgrade.
export function portfolioVol(weights: Record<string, number>, vols: Record<string, number>, rho = 0.3): number {
  const legs = Object.entries(weights).map(([a, w]) => w * (vols[a] ?? 0));
  const sum = legs.reduce((s, x) => s + x, 0);
  const sumSq = legs.reduce((s, x) => s + x * x, 0);
  // Σw²σ² + ρ·Σ_{i≠j} wᵢwⱼσᵢσⱼ  =  (1−ρ)·Σ(wσ)² + ρ·(Σwσ)²
  return Math.sqrt(Math.max(0, (1 - rho) * sumSq + rho * sum * sum));
}

export function mixtureCVaR(dist: { prob: number; ret: number }[], sigma: number, alpha = 0.05): number {
  if (dist.length === 0) return 0;
  if (sigma <= 0) return portfolioCVaR(dist, alpha);
  const cdf = (v: number) => dist.reduce((s, d) => s + d.prob * normCdf((v - d.ret) / sigma), 0);
  // bisection for the alpha-quantile (VaR)
  let lo = Math.min(...dist.map((d) => d.ret)) - 8 * sigma;
  let hi = Math.max(...dist.map((d) => d.ret)) + 8 * sigma;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < alpha) lo = mid;
    else hi = mid;
  }
  const v = (lo + hi) / 2;
  // E[X; X ≤ v] for N(μ,σ) = μΦ(z) − σφ(z)
  const tail = dist.reduce((s, d) => {
    const z = (v - d.ret) / sigma;
    return s + d.prob * (d.ret * normCdf(z) - sigma * normPdf(z));
  }, 0);
  return tail / alpha;
}

// Per-asset shocks observed in the stress analogs v5 names. Rough, documented
// constants — the point is a worst-case drawdown bound, not precise history.
// ponytail: illustrative shocks; refine from actual analog return series later.
export const ANALOGS: Record<string, Record<string, number>> = {
  '1980-82 Volcker': { equities: -0.2, gold: -0.65, btc: -0.8, bonds: 0.05, cash: 0.04 },
  '2008 GFC': { equities: -0.55, gold: 0.05, btc: -0.8, bonds: 0.2, cash: 0.02 },
  '2013 Taper': { equities: 0.1, gold: -0.28, btc: -0.5, bonds: -0.1, cash: 0.01 },
  '2022 Hikes': { equities: -0.25, gold: -0.2, btc: -0.65, bonds: -0.15, cash: 0.02 },
};

export interface AnalogDrawdown {
  analog: string;
  drawdown: number; // portfolio return under the analog (negative = loss)
}

export function analogDrawdowns(weights: Record<string, number>): AnalogDrawdown[] {
  return Object.entries(ANALOGS).map(([analog, shocks]) => ({
    analog,
    drawdown: Object.entries(weights).reduce((s, [asset, w]) => s + w * (shocks[asset] ?? 0), 0),
  }));
}

export function worstAnalog(weights: Record<string, number>): AnalogDrawdown {
  return analogDrawdowns(weights).reduce((worst, d) => (d.drawdown < worst.drawdown ? d : worst));
}
