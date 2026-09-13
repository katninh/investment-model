import { getScenarios } from '@/lib/data/scenarios';
import { ASSETS } from '@/lib/model/scenarios';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

const SCEN_HEX = ['#5750f1', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];

function pctColor(x: number): string {
  return x > 0 ? 'text-green-600 dark:text-green-400' : x < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500';
}

export default async function ScenariosPage() {
  const { results, ev } = await getScenarios();
  const ranked = [...results].sort((a, b) => b.probability - a.probability);

  return (
    <div className="animate-fade-up mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader title="Scenarios" description="Model 5 · trigger-weighted probabilities · returns are 12–18mo assumptions" />

      <Card>
        <CardTitle className="mb-4 text-sm">Probability-weighted E[return]</CardTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ASSETS.map((a) => (
            <div key={a}>
              <div className="text-xs uppercase tracking-wide text-gray-400">{a}</div>
              <div className={`text-lg font-bold tabular-nums ${pctColor(ev[a] ?? 0)}`}>
                {(ev[a] ?? 0) >= 0 ? '+' : ''}
                {(ev[a] ?? 0).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {ranked.map((r, i) => (
          <Card key={r.code}>
            <div className="flex items-baseline justify-between">
              <CardTitle>
                {r.name} <span className="text-sm font-normal text-gray-400">({r.code})</span>
              </CardTitle>
              <span className="text-xl font-bold tabular-nums text-gray-800 dark:text-white">
                {Math.round(r.probability * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full"
                style={{ width: `${r.probability * 100}%`, background: SCEN_HEX[i % SCEN_HEX.length] }}
              />
            </div>

            <ul className="mt-4 space-y-1.5 text-sm">
              {r.allTriggers.map((t) => (
                <li key={t.label} className={`flex items-center gap-2 ${t.met ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                  <span className={t.met ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}>
                    {t.met ? '✓' : '○'}
                  </span>
                  {t.label}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {ASSETS.map((a) => (
                <Badge key={a} variant={(r.assetReturns[a] ?? 0) >= 0 ? 'success' : 'error'}>
                  {a} {(r.assetReturns[a] ?? 0) >= 0 ? '+' : ''}
                  {r.assetReturns[a] ?? 0}%
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
