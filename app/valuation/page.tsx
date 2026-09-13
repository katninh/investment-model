import { getValuation } from '@/lib/data/valuation';
import { Card, CardTitle, PageHeader } from '@/components/ui';
import { RadialGauge } from '@/components/charts/RadialGauge';

export const dynamic = 'force-dynamic';

function gaugeColor(score: number): string {
  if (score >= 7) return '#22c55e'; // cheap
  if (score <= 4) return '#ef4444'; // expensive
  return '#f59e0b';
}

export default async function ValuationPage() {
  const { assets } = await getValuation();

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Valuation" description="Percentile valuation (Model 2) · 1–10, 10 = cheapest" />

      {assets.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">No valuation metrics have data yet.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <Card key={a.asset}>
              <CardTitle className="mb-1">{a.asset}</CardTitle>
              <RadialGauge
                value={(a.score / 10) * 100}
                label="cheapness"
                color={gaugeColor(a.score)}
                height={190}
                displayValue={a.score.toFixed(1)}
              />
              <ul className="mt-2 space-y-1.5 text-sm">
                {a.metrics.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{m.label}</span>
                    <span className="tabular-nums text-gray-400">
                      {Math.round(m.pctRank * 100)}%ile · {(m.cheapness * 100).toFixed(0)}% cheap
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Equities uses a Buffett proxy (Fed Z.1 corporate equities / GDP); Shiller CAPE and the Fed
        Model have no free source and are omitted.
      </p>
    </div>
  );
}
