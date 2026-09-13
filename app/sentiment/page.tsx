import Link from 'next/link';
import { getSentiment } from '@/lib/data/sentiment';

export const revalidate = 3600;

// Contrarian labels: positive composite = fear = accumulate (green side).
const LABEL_COLOR: Record<string, string> = {
  'EXTREME FEAR': 'text-green-700 dark:text-green-400',
  FEAR: 'text-green-700 dark:text-green-400',
  NEUTRAL: 'text-zinc-500',
  GREED: 'text-red-700 dark:text-red-400',
  'EXTREME GREED': 'text-red-700 dark:text-red-400',
};

function scoreText(score: number): string {
  return score > 0 ? 'fear (+1)' : score < 0 ? 'greed (−1)' : 'neutral (0)';
}

export default async function SentimentPage() {
  const { composite, rows, liveCount } = await getSentiment();
  const byId = new Map(composite.contributions.map((c) => [c.id, c]));
  // marker position on a -1(greed)..+1(fear) axis, mapped to 0..100%
  const markerPct = ((composite.normalized + 1) / 2) * 100;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Sentiment</h1>
        <Link href="/regime" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Regime →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Contrarian composite (Model 3) · {liveCount} of {rows.length} inputs live
      </p>

      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <div className={`text-3xl font-bold tracking-tight ${LABEL_COLOR[composite.label]}`}>
          {composite.label}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Positive = fear = contrarian accumulate. Composite {composite.composite.toFixed(1)} · normalized{' '}
          {composite.normalized >= 0 ? '+' : ''}
          {composite.normalized.toFixed(2)}
        </p>
        {/* greed ←→ fear axis */}
        <div className="relative mt-4 h-3 w-full rounded bg-gradient-to-r from-red-400 via-zinc-300 to-green-400 dark:via-zinc-600">
          <div
            className="absolute top-[-3px] h-5 w-1 -translate-x-1/2 rounded bg-zinc-900 dark:bg-white"
            style={{ left: `${markerPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-zinc-400">
          <span>Extreme Greed</span>
          <span>Neutral</span>
          <span>Extreme Fear</span>
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
            <th className="py-2 pr-3 font-medium">Input</th>
            <th className="py-2 pr-3 text-right font-medium">%ile</th>
            <th className="py-2 pr-3 font-medium">Contrarian</th>
            <th className="py-2 pr-3 text-right font-medium">Weight</th>
            <th className="py-2 pr-3 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = byId.get(r.id);
            return (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3">
                  {r.name}
                  {r.stale && r.signal ? <span className="ml-1 text-xs text-amber-600">stale</span> : null}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {r.signal ? `${Math.round(r.signal.pctRank * 100)}%` : '—'}
                </td>
                <td className="py-2 pr-3">{c ? scoreText(c.score) : <span className="text-zinc-400">no data</span>}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{c ? c.weight.toFixed(1) : '—'}</td>
                <td className="py-2 pr-3">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {r.sourceType}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
