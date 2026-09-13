import Link from 'next/link';
import { getValuation } from '@/lib/data/valuation';

export const revalidate = 3600;

function scoreColor(score: number): string {
  if (score >= 7) return 'text-green-700 dark:text-green-400'; // cheap
  if (score <= 4) return 'text-red-700 dark:text-red-400'; // expensive
  return 'text-zinc-500';
}

export default async function ValuationPage() {
  const { assets } = await getValuation();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Valuation</h1>
        <Link href="/sentiment" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Sentiment →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Percentile valuation (Model 2) · 1–10 per asset, 10 = cheapest
      </p>

      {assets.length === 0 ? (
        <p className="text-sm text-zinc-500">No valuation metrics have data yet.</p>
      ) : (
        <div className="space-y-4">
          {assets.map((a) => (
            <section key={a.asset} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{a.asset}</span>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(a.score)}`}>
                  {a.score.toFixed(1)}
                  <span className="text-sm font-normal text-zinc-400"> / 10</span>
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800">
                <div className="h-2 rounded bg-zinc-500" style={{ width: `${(a.score / 10) * 100}%` }} />
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {a.metrics.map((m) => (
                    <tr key={m.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-1.5">{m.label}</td>
                      <td className="py-1.5 text-right tabular-nums text-zinc-500">
                        {Math.round(m.pctRank * 100)}%ile
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        cheapness {(m.cheapness * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Equities uses a Buffett proxy (Fed Z.1 corporate equities / GDP); Shiller CAPE and the Fed
        Model have no free source and are omitted.
      </p>
    </main>
  );
}
