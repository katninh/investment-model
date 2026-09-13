import Link from 'next/link';
import { getConviction, ASSET_LABEL } from '@/lib/data/conviction';
import { CONVICTION_WEIGHTS, type Action } from '@/lib/model/conviction';

export const revalidate = 3600;

const ACTION_STYLE: Record<Action, string> = {
  ACCUMULATE: 'bg-green-600 text-white',
  'LEAN BUY': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  HOLD: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  'LEAN REDUCE': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  AVOID: 'bg-red-600 text-white',
};

function subCell(x: number) {
  const color =
    x > 0.05
      ? 'text-green-700 dark:text-green-400'
      : x < -0.05
        ? 'text-red-700 dark:text-red-400'
        : 'text-zinc-400';
  return (
    <span className={`tabular-nums ${color}`}>
      {x >= 0 ? '+' : ''}
      {x.toFixed(2)}
    </span>
  );
}

const COLS: { key: keyof typeof CONVICTION_WEIGHTS; label: string }[] = [
  { key: 'regimeFit', label: 'Regime' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'scenarioEv', label: 'Scenario EV' },
];

export default async function ConvictionPage() {
  const { results, regime } = await getConviction();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Conviction</h1>
        <Link href="/scenarios" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Scenarios →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Layer 4 · weighted synthesis of all five models · regime: {regime}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
              <th className="py-2 pr-3 font-medium">Asset</th>
              {COLS.map((c) => (
                <th key={c.key} className="py-2 pr-3 text-right font-medium">
                  {c.label}
                  <div className="text-xs font-normal text-zinc-400">{CONVICTION_WEIGHTS[c.key].toFixed(2)}</div>
                </th>
              ))}
              <th className="py-2 pr-3 text-right font-medium">Conviction</th>
              <th className="py-2 pr-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.asset} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3 font-medium">{ASSET_LABEL[r.asset] ?? r.asset}</td>
                {COLS.map((c) => (
                  <td key={c.key} className="py-2 pr-3 text-right">
                    {subCell(r.inputs[c.key])}
                  </td>
                ))}
                <td className="py-2 pr-3 text-right">
                  <div className="tabular-nums font-semibold">
                    {r.conviction >= 0 ? '+' : ''}
                    {r.conviction.toFixed(2)}
                  </div>
                  <div className="relative mt-1 h-1.5 w-20 rounded bg-zinc-200 dark:bg-zinc-800">
                    <div className="absolute left-1/2 top-0 h-1.5 w-px bg-zinc-400" />
                    <div
                      className={`absolute top-0 h-1.5 rounded ${r.conviction >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{
                        left: r.conviction >= 0 ? '50%' : `${50 + r.conviction * 50}%`,
                        width: `${Math.abs(r.conviction) * 50}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[r.action]}`}>
                    {r.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Each cell is a −1..+1 sub-score; conviction is their weighted blend. Bonds lacks valuation/
        momentum metrics (shown 0). What-if weight sliders (§8.5) are a later addition.
      </p>
    </main>
  );
}
