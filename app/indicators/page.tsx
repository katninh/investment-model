import { getIndicatorSignals } from '@/lib/data/indicators';
import { IndicatorsTable } from '@/components/IndicatorsTable';
import { PageHeader } from '@/components/ui';

export const revalidate = 3600;

export default async function IndicatorsPage() {
  const rows = await getIndicatorSignals();
  const live = rows.filter((r) => r.signal != null).length;

  return (
    <div className="animate-fade-up mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader
        title="Indicators"
        description={`${live} of ${rows.length} live · Layer 2 signals (z-score, percentile, momentum; ±0.5σ direction)`}
      />
      <IndicatorsTable rows={rows} />
    </div>
  );
}
