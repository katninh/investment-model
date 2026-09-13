import { getConviction, ASSET_LABEL } from '@/lib/data/conviction';
import { CONVICTION_WEIGHTS, type Action } from '@/lib/model/conviction';
import { Card, PageHeader, Badge } from '@/components/ui';

export const revalidate = 3600;

const ACTION_VARIANT: Record<Action, 'success' | 'neutral' | 'warning' | 'error'> = {
  ACCUMULATE: 'success',
  'LEAN BUY': 'success',
  HOLD: 'neutral',
  'LEAN REDUCE': 'warning',
  AVOID: 'error',
};

function subCell(x: number) {
  const color =
    x > 0.05 ? 'text-green-600 dark:text-green-400' : x < -0.05 ? 'text-red-600 dark:text-red-400' : 'text-gray-400';
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
  const { results, regime, weights } = await getConviction();

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Conviction" description={`Layer 4 · weighted synthesis of all five models · regime: ${regime}`} />

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th className="px-5 py-3 font-medium">Asset</th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right font-medium">
                    {c.label}
                    <div className="text-xs font-normal text-gray-400">{weights[c.key].toFixed(2)}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium">Conviction</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.asset} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{ASSET_LABEL[r.asset] ?? r.asset}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-right">
                      {subCell(r.inputs[c.key])}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">
                    <div className="font-semibold tabular-nums text-gray-800 dark:text-white">
                      {r.conviction >= 0 ? '+' : ''}
                      {r.conviction.toFixed(2)}
                    </div>
                    <div className="relative ml-auto mt-1 h-1.5 w-20 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="absolute left-1/2 top-0 h-1.5 w-px bg-gray-300 dark:bg-gray-600" />
                      <div
                        className={`absolute top-0 h-1.5 rounded-full ${r.conviction >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                          left: r.conviction >= 0 ? '50%' : `${50 + r.conviction * 50}%`,
                          width: `${Math.abs(r.conviction) * 50}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={ACTION_VARIANT[r.action]}>{r.action}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-gray-400">
        Each cell is a −1..+1 sub-score; conviction is their weighted blend. Bonds lacks valuation/momentum
        metrics (shown 0).
      </p>
    </div>
  );
}
