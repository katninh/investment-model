import { getIndicatorSignals } from './indicators';
import { getAlignedDaily } from './series';
import {
  valuationScores,
  goldRealYieldResidual,
  type AssetValuation,
  type ExtraMetric,
} from '@/lib/model/valuation';

const METRIC_IDS = ['VAL_BUFFETT', 'VAL_DOW_GOLD', 'VAL_BTC_MVRV'];

export async function getValuation(): Promise<{ assets: AssetValuation[]; goldResidualZ: number }> {
  const [rows, aligned] = await Promise.all([
    getIndicatorSignals(),
    getAlignedDaily(['MKT_XAUUSD', 'FRED_DFII10']),
  ]);
  const inputs = rows
    .filter((r) => METRIC_IDS.includes(r.id) && r.signal)
    .map((r) => ({ id: r.id, pctRank: r.signal!.pctRank }));

  // Gold anchored to real yields: residual replaces the naive DFII10 percentile.
  const resid = goldRealYieldResidual(aligned.series.MKT_XAUUSD ?? [], aligned.series.FRED_DFII10 ?? []);
  const extra: ExtraMetric[] =
    resid.n >= 2
      ? [{ asset: 'Gold', id: 'VAL_GOLD_REALRATE', label: 'Gold vs 10Y real yield (residual)', cheapness: resid.cheapness }]
      : [];

  return { assets: valuationScores(inputs, extra), goldResidualZ: resid.z };
}
