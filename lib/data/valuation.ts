import { getIndicatorSignals } from './indicators';
import { valuationScores, type AssetValuation } from '@/lib/model/valuation';

const METRIC_IDS = ['VAL_BUFFETT', 'VAL_DOW_GOLD', 'FRED_DFII10', 'VAL_BTC_MVRV'];

export async function getValuation(): Promise<{ assets: AssetValuation[] }> {
  const rows = await getIndicatorSignals();
  const inputs = rows
    .filter((r) => METRIC_IDS.includes(r.id) && r.signal)
    .map((r) => ({ id: r.id, pctRank: r.signal!.pctRank }));

  return { assets: valuationScores(inputs) };
}
