import { getRegimeCall } from '@/lib/data/regime';
import { RegimeBanner } from '@/components/RegimeBanner';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';
import type { IndicatorRow } from '@/lib/data/indicators';

export const dynamic = 'force-dynamic';

const CELLS = [
  { regime: 'STAGFLATION', label: 'Stagflation', sub: 'growth ↓ · inflation ↑' },
  { regime: 'OVERHEAT', label: 'Overheat', sub: 'growth ↑ · inflation ↑' },
  { regime: 'RECESSION', label: 'Recession', sub: 'growth ↓ · inflation ↓' },
  { regime: 'RECOVERY', label: 'Recovery', sub: 'growth ↑ · inflation ↓' },
];

function ContributorCard({ title, rows }: { title: string; rows: IndicatorRow[] }) {
  return (
    <Card>
      <CardTitle className="mb-3 text-sm">{title}</CardTitle>
      <ul className="space-y-2">
        {rows.map((r) => {
          const s = r.signal!.signal;
          return (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{r.name}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-xs text-gray-400">z {r.signal!.zScore.toFixed(2)}</span>
                <Badge variant={s > 0 ? 'success' : s < 0 ? 'error' : 'neutral'}>{r.signal!.signalLabel}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default async function RegimePage() {
  const { call, growth, inflation } = await getRegimeCall();

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Macro Regime" description="Investment Clock — growth × inflation (Model 1)" />

      <Card>
        <RegimeBanner call={call} />
      </Card>

      <Card className="mt-6">
        <CardTitle className="mb-4">Investment Clock</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          {CELLS.map((c) => {
            const active = c.regime === call.regime;
            return (
              <div
                key={c.regime}
                className={`rounded-xl border p-4 ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`font-semibold ${active ? 'text-brand-600 dark:text-brand-300' : 'text-gray-500'}`}>
                  {c.label}
                </div>
                <div className="text-xs text-gray-400">{c.sub}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Left→right: growth strengthening · Top→bottom: inflation easing
        </p>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <ContributorCard title={`Growth signals (${growth.length})`} rows={growth} />
        <ContributorCard title={`Inflation signals (${inflation.length})`} rows={inflation} />
      </div>
    </div>
  );
}
