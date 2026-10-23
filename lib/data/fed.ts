import { getIndicatorSignals } from './indicators';
import { fedReaction, type FedCall } from '@/lib/model/fed';

// Core PCE y/y comes from the 12-period momentum of the monthly index.
export async function getFedCall(): Promise<FedCall | null> {
  const rows = await getIndicatorSignals();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const policyRate = byId.get('FRED_FEDFUNDS')?.signal?.latest;
  const unemployment = byId.get('FRED_UNRATE')?.signal?.latest;
  const corePce = byId.get('FRED_PCEPILFE')?.signal;
  if (policyRate == null || unemployment == null || !corePce) return null;

  return fedReaction({
    policyRate,
    coreInflation: corePce.mom12m * 100, // fraction -> %
    unemployment,
  });
}
