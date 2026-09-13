import Link from 'next/link';
import { getScenarios } from '@/lib/data/scenarios';
import { ASSETS } from '@/lib/model/scenarios';

export const revalidate = 3600;

function pctColor(x: number): string {
  return x > 0 ? 'text-green-700 dark:text-green-400' : x < 0 ? 'text-red-700 dark:text-red-400' : 'text-zinc-500';
}

export default async function ScenariosPage() {
  const { results, ev } = await getScenarios();
  const ranked = [...results].sort((a, b) => b.probability - a.probability);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <Link href="/momentum" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Momentum →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Model 5 · trigger-weighted probabilities · returns are 12–18mo assumptions
      </p>

      {/* Probability-weighted E[return] per asset */}
      <section className="mb-8 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Probability-weighted E[return]</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ASSETS.map((a) => (
            <div key={a}>
              <div className="text-xs uppercase tracking-wide text-zinc-400">{a}</div>
              <div className={`text-lg font-semibold tabular-nums ${pctColor(ev[a] ?? 0)}`}>
                {(ev[a] ?? 0) >= 0 ? '+' : ''}
                {(ev[a] ?? 0).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {ranked.map((r) => (
          <section key={r.code} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">
                {r.name} <span className="text-zinc-400">({r.code})</span>
              </span>
              <span className="text-lg font-bold tabular-nums">{Math.round(r.probability * 100)}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800">
              <div className="h-2 rounded bg-zinc-500" style={{ width: `${r.probability * 100}%` }} />
            </div>

            <ul className="mt-3 space-y-1 text-sm">
              {r.allTriggers.map((t) => (
                <li key={t.label} className={t.met ? '' : 'text-zinc-400'}>
                  <span className={t.met ? 'text-green-600' : 'text-zinc-400'}>{t.met ? '✓' : '○'}</span> {t.label}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {ASSETS.map((a) => (
                <span key={a}>
                  <span className="text-zinc-400">{a}</span>{' '}
                  <span className={`tabular-nums ${pctColor(r.assetReturns[a] ?? 0)}`}>
                    {(r.assetReturns[a] ?? 0) >= 0 ? '+' : ''}
                    {r.assetReturns[a] ?? 0}%
                  </span>
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
