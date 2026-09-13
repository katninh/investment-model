import Link from 'next/link';
import { getPortfolio } from '@/lib/data/portfolio';
import { ASSET_LABEL } from '@/lib/data/conviction';

export const revalidate = 3600;

const ASSET_COLOR: Record<string, string> = {
  equities: 'bg-blue-500',
  gold: 'bg-amber-500',
  btc: 'bg-orange-500',
  bonds: 'bg-purple-500',
  cash: 'bg-zinc-400',
};

export default async function PortfolioPage() {
  const { allocations, regime } = await getPortfolio();
  const funded = allocations.filter((a) => a.weight > 0.0005);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <Link href="/conviction" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Conviction →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Layer 5 · target allocation from conviction · regime: {regime} · max 35%/asset, min 10% cash
      </p>

      {/* stacked allocation bar */}
      <div className="mb-1 flex h-8 w-full overflow-hidden rounded">
        {funded.map((a) => (
          <div
            key={a.asset}
            className={`${ASSET_COLOR[a.asset] ?? 'bg-zinc-500'} flex items-center justify-center text-xs text-white`}
            style={{ width: `${a.weight * 100}%` }}
            title={`${ASSET_LABEL[a.asset] ?? a.asset} ${(a.weight * 100).toFixed(0)}%`}
          >
            {a.weight >= 0.08 ? `${Math.round(a.weight * 100)}%` : ''}
          </div>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {funded.map((a) => (
          <span key={a.asset} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${ASSET_COLOR[a.asset] ?? 'bg-zinc-500'}`} />
            {ASSET_LABEL[a.asset] ?? a.asset}
          </span>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
            <th className="py-2 pr-3 font-medium">Asset</th>
            <th className="py-2 pr-3 text-right font-medium">Weight</th>
            <th className="py-2 pr-3 text-right font-medium">Conviction</th>
            <th className="py-2 pr-3 font-medium">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.asset} className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-3 font-medium">{ASSET_LABEL[a.asset] ?? a.asset}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-semibold">{(a.weight * 100).toFixed(1)}%</td>
              <td className="py-2 pr-3 text-right tabular-nums text-zinc-500">
                {a.asset === 'cash' ? '—' : `${a.conviction >= 0 ? '+' : ''}${a.conviction.toFixed(2)}`}
              </td>
              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{a.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-zinc-400">
        Target weights only — not advice. Deployment plan and drift tracking (§8.6) are later additions.
      </p>
    </main>
  );
}
