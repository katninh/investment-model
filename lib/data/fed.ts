import { getIndicatorSignals } from './indicators';
import { fedReaction, marketFedView, type FedCall, type MarketFedView } from '@/lib/model/fed';

export interface FedData {
  rule: FedCall;
  market: MarketFedView | null;
}

// Policy rate = daily EFFR (current), falling back to monthly FEDFUNDS.
// Core PCE y/y comes from the 12-period momentum of the monthly index.
export async function getFedCall(): Promise<FedData | null> {
  const rows = await getIndicatorSignals();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const latest = (id: string) => byId.get(id)?.signal?.latest ?? null;

  const policyRate = latest('FRED_EFFR') ?? latest('FRED_FEDFUNDS');
  const unemployment = latest('FRED_UNRATE');
  const corePce = byId.get('FRED_PCEPILFE')?.signal;
  if (policyRate == null || unemployment == null || !corePce) return null;

  const rule = fedReaction({ policyRate, coreInflation: corePce.mom12m * 100, unemployment });
  // Only trust a FedWatch entry while it's fresh; otherwise fall back to the 2Y spread.
  const fw = byId.get('FEDWATCH_HIKE');
  const fedwatch = fw && !fw.stale ? (fw.signal?.latest ?? null) : null;
  return { rule, market: marketFedView(rule, fedwatch, latest('FRED_DGS2'), policyRate) };
}
