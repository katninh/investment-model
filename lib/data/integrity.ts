import { getIndicatorSignals } from './indicators';
import { getAlignedDaily } from './series';
import {
  sahmReading,
  realRateGuard,
  goldDriverChecks,
  type SahmReading,
  type RealRateGuard,
  type DriverCheck,
} from '@/lib/model/integrity';

export interface IntegrityData {
  sahm: SahmReading | null;
  realRate: RealRateGuard;
  goldDrivers: DriverCheck[];
  oilSeries: string; // which oil series fed the gold~oil check
  stale: { id: string; name: string; lastDate: string | null }[]; // api series past their cadence
}

// v5 Pass 0: run the errors-log checks every time.
export async function getIntegrity(): Promise<IntegrityData> {
  const rows = await getIndicatorSignals();
  const byId = new Map(rows.map((r) => [r.id, r]));

  // v5 uses Brent; fall back to WTI if Brent has no aligned history yet.
  let oilId = 'FRED_DCOILBRENTEU';
  let aligned = await getAlignedDaily(['MKT_XAUUSD', 'FRED_DFII10', oilId], 120);
  if (aligned.dates.length < 2) {
    oilId = 'FRED_DCOILWTICO';
    aligned = await getAlignedDaily(['MKT_XAUUSD', 'FRED_DFII10', oilId], 120);
  }

  const sahmVal = byId.get('FRED_SAHMREALTIME')?.signal?.latest;
  const dfii10 = byId.get('FRED_DFII10');

  return {
    sahm: sahmVal == null ? null : sahmReading(sahmVal),
    realRate: realRateGuard(dfii10?.signal?.latest ?? null, dfii10?.stale ?? true),
    goldDrivers:
      aligned.dates.length >= 2
        ? goldDriverChecks(aligned.series.MKT_XAUUSD, aligned.series.FRED_DFII10, aligned.series[oilId])
        : [],
    oilSeries: oilId,
    stale: rows
      .filter((r) => r.sourceType === 'api' && r.stale)
      .map((r) => ({ id: r.id, name: r.name, lastDate: r.lastDate })),
  };
}
