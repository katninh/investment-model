import Link from 'next/link';
import { getRegimeCall } from '@/lib/data/regime';
import { RegimeBanner } from '@/components/RegimeBanner';
import type { IndicatorRow } from '@/lib/data/indicators';

export const revalidate = 3600;

// 2×2 grid order (top-left → bottom-right): inflation rising on top, growth strengthening on the right.
const CELLS = [
  { regime: 'STAGFLATION', label: 'Stagflation', sub: 'growth ↓ · inflation ↑' },
  { regime: 'OVERHEAT', label: 'Overheat', sub: 'growth ↑ · inflation ↑' },
  { regime: 'RECESSION', label: 'Recession', sub: 'growth ↓ · inflation ↓' },
  { regime: 'RECOVERY', label: 'Recovery', sub: 'growth ↑ · inflation ↓' },
];

function ContributorTable({ title, rows }: { title: string; rows: IndicatorRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-1.5 pr-3">{r.name}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-zinc-500">
                z {r.signal!.zScore.toFixed(2)}
              </td>
              <td
                className={`py-1.5 text-right font-medium ${
                  r.signal!.signal > 0
                    ? 'text-green-700 dark:text-green-400'
                    : r.signal!.signal < 0
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-zinc-500'
                }`}
              >
                {r.signal!.signalLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RegimePage() {
  const { call, growth, inflation } = await getRegimeCall();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Macro Regime</h1>
        <Link href="/indicators" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Indicators →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Investment Clock — growth × inflation (Model 1)</p>

      <RegimeBanner call={call} />

      {/* 2×2 clock matrix */}
      <div className="mt-8">
        <div className="grid grid-cols-2 gap-2">
          {CELLS.map((c) => {
            const active = c.regime === call.regime;
            return (
              <div
                key={c.regime}
                className={`rounded-lg border p-4 ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-zinc-200 text-zinc-500 dark:border-zinc-800'
                }`}
              >
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs opacity-70">{c.sub}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Left→right: growth strengthening · Top→bottom: inflation easing
          {call.regime === 'TRANSITION' ? ' — currently between regimes (one axis unclear)' : null}
        </p>
      </div>

      {/* why trail */}
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <ContributorTable title={`Growth signals (${growth.length})`} rows={growth} />
        <ContributorTable title={`Inflation signals (${inflation.length})`} rows={inflation} />
      </div>
    </main>
  );
}
