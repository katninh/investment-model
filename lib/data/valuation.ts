import { getIndicatorSignals } from './indicators';
import { getAlignedDaily } from './series';
import { mean, stdDev } from '@/lib/model/signals';
import {
  valuationScores,
  goldRealYieldResidual,
  sjcPremium,
  type AssetValuation,
  type ExtraMetric,
} from '@/lib/model/valuation';

const METRIC_IDS = ['VAL_BUFFETT', 'VAL_DOW_GOLD', 'VAL_BTC_MVRV'];

export interface SjcPremium {
  premium: number; // latest SJC premium over world parity (0.08 = 8%)
  z: number | null; // vs its own history; null until >= 3 aligned entries
  n: number;
  usdVnd: number;
}

export interface ValuationData {
  assets: AssetValuation[];
  goldResidualZ: number;
  sjc: SjcPremium | null; // null until an SJC price has been entered
}

export async function getValuation(): Promise<ValuationData> {
  const [rows, aligned, sjcHist] = await Promise.all([
    getIndicatorSignals(),
    getAlignedDaily(['MKT_XAUUSD', 'FRED_DFII10']),
    getAlignedDaily(['MANUAL_SJC_SELL', 'MKT_XAUUSD', 'MKT_USDVND'], 1825),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const inputs = rows
    .filter((r) => METRIC_IDS.includes(r.id) && r.signal)
    .map((r) => ({ id: r.id, pctRank: r.signal!.pctRank }));

  // Gold anchored to real yields: residual replaces the naive DFII10 percentile.
  const resid = goldRealYieldResidual(aligned.series.MKT_XAUUSD ?? [], aligned.series.FRED_DFII10 ?? []);
  const extra: ExtraMetric[] =
    resid.n >= 2
      ? [{ asset: 'Gold', id: 'VAL_GOLD_REALRATE', label: 'Gold vs 10Y real yield (residual)', cheapness: resid.cheapness }]
      : [];

  // SJC premium: latest from each series' latest value (dates may differ by a day —
  // SJC is entered manually); z-score from same-day history once there's enough.
  const sjc = byId.get('MANUAL_SJC_SELL')?.signal?.latest;
  const xau = byId.get('MKT_XAUUSD')?.signal?.latest;
  const usdVnd = byId.get('MKT_USDVND')?.signal?.latest;
  let sjcData: SjcPremium | null = null;
  if (sjc != null && xau != null && usdVnd != null) {
    const s = sjcHist.series;
    const hist = sjcHist.dates.map((_, i) => sjcPremium(s.MANUAL_SJC_SELL[i], s.MKT_XAUUSD[i], s.MKT_USDVND[i]));
    const premium = sjcPremium(sjc, xau, usdVnd);
    const sd = stdDev(hist);
    sjcData = {
      premium,
      z: hist.length >= 3 && sd > 0 ? (premium - mean(hist)) / sd : null,
      n: hist.length,
      usdVnd,
    };
  }

  return { assets: valuationScores(inputs, extra), goldResidualZ: resid.z, sjc: sjcData };
}
