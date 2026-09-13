import Link from 'next/link';
import { getDashboard } from '@/lib/data/dashboard';
import { RegimeBanner } from '@/components/RegimeBanner';
import { ASSET_LABEL } from '@/lib/data/conviction';
import type { Action } from '@/lib/model/conviction';

export const revalidate = 3600;

const ACTION_STYLE: Record<Action, string> = {
  ACCUMULATE: 'bg-green-600 text-white',
  'LEAN BUY': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  HOLD: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  'LEAN REDUCE': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  AVOID: 'bg-red-600 text-white',
};

const SCEN_COLOR = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-red-500'];
const ASSET_COLOR: Record<string, string> = {
  equities: 'bg-blue-500',
  gold: 'bg-amber-500',
  btc: 'bg-orange-500',
  bonds: 'bg-purple-500',
  cash: 'bg-zinc-400',
};

const num = (x: number | null) =>
  x == null ? '—' : x.toLocaleString(undefined, { maximumFractionDigits: 2 });
const chg = (x: number | null) => (x == null ? '' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);

const NAV = [
  ['/regime', 'Regime'],
  ['/valuation', 'Valuation'],
  ['/sentiment', 'Sentiment'],
  ['/momentum', 'Momentum'],
  ['/scenarios', 'Scenarios'],
  ['/conviction', 'Conviction'],
  ['/portfolio', 'Portfolio'],
  ['/indicators', 'Indicators'],
];

export default async function Dashboard() {
  const { prices, regime, conviction, scenarios, ev, allocations, asOf } = await getDashboard();
  const ranked = [...scenarios].sort((a, b) => b.probability - a.probability);
  const funded = allocations.filter((a) => a.weight > 0.0005);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Macro Investment Model</h1>
          <p className="text-sm text-zinc-500">As of {asOf}</p>
        </div>
        <Link
          href="/brief"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Generate Brief →
        </Link>
      </div>

      {/* price strip */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {prices.map((p) => (
          <div key={p.label} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="text-xs text-zinc-400">{p.label}</div>
            <div className="tabular-nums font-semibold">{num(p.latest)}</div>
            <div
              className={`text-xs tabular-nums ${
                (p.change ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {chg(p.change)}
            </div>
          </div>
        ))}
      </div>

      {/* regime */}
      <Link href="/regime" className="block">
        <RegimeBanner call={regime} />
      </Link>

      {/* conviction row */}
      <Link href="/conviction" className="mt-6 block">
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">Conviction</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {conviction.map((c) => (
            <div key={c.asset} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="font-medium">{ASSET_LABEL[c.asset] ?? c.asset}</div>
              <div className="tabular-nums text-lg font-semibold">
                {c.conviction >= 0 ? '+' : ''}
                {c.conviction.toFixed(2)}
              </div>
              <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ACTION_STYLE[c.action]}`}>
                {c.action}
              </span>
            </div>
          ))}
        </div>
      </Link>

      {/* scenario strip */}
      <Link href="/scenarios" className="mt-6 block">
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">Scenarios</h2>
        <div className="flex h-6 w-full overflow-hidden rounded">
          {ranked.map((s, i) => (
            <div
              key={s.code}
              className={`${SCEN_COLOR[i % SCEN_COLOR.length]} flex items-center justify-center text-xs text-white`}
              style={{ width: `${s.probability * 100}%` }}
              title={`${s.name} ${Math.round(s.probability * 100)}%`}
            >
              {s.probability >= 0.12 ? `${Math.round(s.probability * 100)}%` : ''}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>Top: <strong>{ranked[0]?.name}</strong> {Math.round((ranked[0]?.probability ?? 0) * 100)}%</span>
          <span>E[gold] {(ev.gold ?? 0).toFixed(1)}%</span>
          <span>E[BTC] {(ev.btc ?? 0).toFixed(1)}%</span>
          <span>E[equities] {(ev.equities ?? 0).toFixed(1)}%</span>
        </div>
      </Link>

      {/* this month's action */}
      <Link href="/portfolio" className="mt-6 block">
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">Target Allocation</h2>
        <div className="mb-2 flex h-6 w-full overflow-hidden rounded">
          {funded.map((a) => (
            <div
              key={a.asset}
              className={`${ASSET_COLOR[a.asset] ?? 'bg-zinc-500'} flex items-center justify-center text-xs text-white`}
              style={{ width: `${a.weight * 100}%` }}
              title={`${ASSET_LABEL[a.asset] ?? a.asset} ${Math.round(a.weight * 100)}%`}
            >
              {a.weight >= 0.08 ? `${Math.round(a.weight * 100)}%` : ''}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {funded.map((a) => (
            <span key={a.asset}>
              {ASSET_LABEL[a.asset] ?? a.asset} {Math.round(a.weight * 100)}%
            </span>
          ))}
        </div>
      </Link>

      {/* nav */}
      <nav className="mt-8 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="text-blue-600 hover:underline dark:text-blue-400">
            {label}
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-xs text-zinc-400">
        Research tool, not financial advice. Alerts (§8.7) are a later addition.
      </p>
    </main>
  );
}
