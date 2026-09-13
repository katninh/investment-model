import { getIndicatorSignals } from '@/lib/data/indicators';
import { IndicatorsTable } from '@/components/IndicatorsTable';

// Data updates ~daily; cache the computed signals for an hour (§10 FCP target).
export const revalidate = 3600;

export default async function IndicatorsPage() {
  const rows = await getIndicatorSignals();
  const live = rows.filter((r) => r.signal != null).length;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold">Indicators</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">
        {live} of {rows.length} live · Layer 2 signals (z-score, percentile, momentum; ±0.5σ direction)
      </p>
      <IndicatorsTable rows={rows} />
    </main>
  );
}
