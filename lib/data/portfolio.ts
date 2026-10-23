import { getConviction } from './conviction';
import { getScenarios } from './scenarios';
import { getAlignedDaily } from './series';
import { getSettings } from './config';
import { constructPortfolio, type Allocation } from '@/lib/model/portfolio';
import { annualizedVol, portfolioCVaR, worstAnalog, type AnalogDrawdown } from '@/lib/model/risk';

// Price series we can measure vol from directly; others fall back to a default.
const VOL_SERIES: Record<string, string> = { equities: 'FRED_SP500', gold: 'MKT_XAUUSD', btc: 'MKT_BTC' };
const DEFAULT_VOL: Record<string, number> = { bonds: 0.07, cash: 0.005 };

export interface PortfolioData {
  allocations: Allocation[];
  regime: string;
  cvar95: number; // worst-5% tail of the scenario return distribution (decimal, negative)
  worstAnalog: AnalogDrawdown; // worst historical-analog drawdown (decimal, negative)
}

export async function getPortfolio(): Promise<PortfolioData> {
  const [{ results, regime }, scenarios, prices, settings] = await Promise.all([
    getConviction(),
    getScenarios(),
    getAlignedDaily(Object.values(VOL_SERIES), 400),
    getSettings(),
  ]);

  const vols: Record<string, number> = { ...DEFAULT_VOL };
  for (const [asset, id] of Object.entries(VOL_SERIES)) {
    const v = annualizedVol(prices.series[id] ?? []);
    if (v > 0) vols[asset] = v;
  }

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
