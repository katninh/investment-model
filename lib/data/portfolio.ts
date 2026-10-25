import { getConviction } from './conviction';
import { getScenarios } from './scenarios';
import { getAlignedDaily } from './series';
import { getSettings } from './config';
import { constructPortfolio, type Allocation } from '@/lib/model/portfolio';
import { annualizedVol, portfolioCVaR, worstAnalog, type AnalogDrawdown } from '@/lib/model/risk';

// Price series we can measure vol from directly; others fall back to a default.
// bonds vol from TLT (long UST) now that it's ingested; cash stays a constant.
const VOL_SERIES: Record<string, string> = { equities: 'FRED_SP500', gold: 'MKT_XAUUSD', btc: 'MKT_BTC', bonds: 'MKT_TLT' };
// Fallbacks so a missing series never collapses to the vol floor (= oversized weight).
const DEFAULT_VOL: Record<string, number> = { equities: 0.16, gold: 0.15, btc: 0.6, bonds: 0.07, cash: 0.005 };

export interface PortfolioData {
  allocations: Allocation[];
  regime: string;
  cvar95: number; // worst-5% tail of the scenario return distribution (decimal, negative)
  worstAnalog: AnalogDrawdown; // worst historical-analog drawdown (decimal, negative)
}

export async function getPortfolio(): Promise<PortfolioData> {
  const [{ results, regime }, scenarios, settings, ...prices] = await Promise.all([
    getConviction(),
    getScenarios(),
    getSettings(),
    // one query per series: an inner join would drop everything if one series is empty
    ...Object.values(VOL_SERIES).map((id) => getAlignedDaily([id], 400)),
  ]);

  const vols: Record<string, number> = { ...DEFAULT_VOL };
  Object.entries(VOL_SERIES).forEach(([asset, id], i) => {
    const v = annualizedVol(prices[i].series[id] ?? []);
    if (v > 0) vols[asset] = v;
  });

  const allocations = constructPortfolio(results, settings.constraints, vols);

  // Portfolio return in each scenario = Σ weight × scenario asset return.
  const wByAsset = Object.fromEntries(allocations.map((a) => [a.asset, a.weight]));
  const dist = scenarios.results.map((sc) => ({
    prob: sc.probability,
    ret: Object.entries(sc.assetReturns).reduce((s, [asset, r]) => s + (wByAsset[asset] ?? 0) * (r / 100), 0),
  }));

  return {
    allocations,
    regime,
    cvar95: portfolioCVaR(dist, 0.05),
    worstAnalog: worstAnalog(wByAsset),
  };
}
