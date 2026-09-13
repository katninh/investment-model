import Link from 'next/link';
import { FileText } from 'lucide-react';
import { getDashboard } from '@/lib/data/dashboard';
import { RegimeBanner } from '@/components/RegimeBanner';
import { Card, CardTitle, PageHeader, Badge, StatCard } from '@/components/ui';
import { DonutChart } from '@/components/charts/DonutChart';
import { ASSET_LABEL } from '@/lib/data/conviction';
import type { Action } from '@/lib/model/conviction';

export const revalidate = 3600;

const ACTION_VARIANT: Record<Action, 'success' | 'neutral' | 'warning' | 'error'> = {
  ACCUMULATE: 'success',
  'LEAN BUY': 'success',
  HOLD: 'neutral',
  'LEAN REDUCE': 'warning',
  AVOID: 'error',
};
const ASSET_HEX: Record<string, string> = {
  equities: '#3b82f6',
  gold: '#f59e0b',
  btc: '#f97316',
  bonds: '#a855f7',
  cash: '#94a3b8',
};
const SCEN_HEX = ['#5750f1', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];

const num = (x: number | null) =>
  x == null ? '—' : x.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default async function Dashboard() {
  const { prices, regime, conviction, scenarios, ev, allocations, asOf } = await getDashboard();
  const ranked = [...scenarios].sort((a, b) => b.probability - a.probability);
  const funded = allocations.filter((a) => a.weight > 0.0005);

  return (
    <div className="animate-fade-up mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader
        title="Dashboard"
        description={`As of ${asOf}`}
        action={
          <Link
            href="/brief"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-card hover:bg-brand-600"
          >
            <FileText className="h-4 w-4" /> Generate Brief
          </Link>
        }
      />

      {/* price strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {prices.map((p) => (
          <StatCard key={p.label} label={p.label} value={num(p.latest)} delta={p.change} />
        ))}
      </div>

      {/* regime + allocation */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Macro Regime</CardTitle>
          <RegimeBanner call={regime} />
        </Card>
        <Card>
          <CardTitle className="mb-1">Target Allocation</CardTitle>
          <DonutChart
            labels={funded.map((a) => ASSET_LABEL[a.asset] ?? a.asset)}
            series={funded.map((a) => Math.round(a.weight * 100))}
            colors={funded.map((a) => ASSET_HEX[a.asset] ?? '#94a3b8')}
          />
        </Card>
      </div>

      {/* conviction */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Conviction</CardTitle>
          <Link href="/conviction" className="text-sm font-medium text-brand-500 hover:underline">
            Details →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {conviction.map((c) => (
            <Card key={c.asset}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-white">
                  {ASSET_LABEL[c.asset] ?? c.asset}
                </span>
                <Badge variant={ACTION_VARIANT[c.action]}>{c.action}</Badge>
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-gray-800 dark:text-white">
                {c.conviction >= 0 ? '+' : ''}
                {c.conviction.toFixed(2)}
              </div>
              <div className="relative mt-2 h-1.5 rounded bg-gray-100 dark:bg-gray-800">
                <div className="absolute left-1/2 top-0 h-1.5 w-px bg-gray-300 dark:bg-gray-600" />
                <div
                  className={`absolute top-0 h-1.5 rounded ${c.conviction >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{
                    left: c.conviction >= 0 ? '50%' : `${50 + c.conviction * 50}%`,
                    width: `${Math.abs(c.conviction) * 50}%`,
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* scenarios */}
      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Scenarios</CardTitle>
          <Link href="/scenarios" className="text-sm font-medium text-brand-500 hover:underline">
            Details →
          </Link>
        </div>
        <div className="flex h-7 w-full overflow-hidden rounded-lg">
          {ranked.map((s, i) => (
            <div
              key={s.code}
              className="flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${s.probability * 100}%`, background: SCEN_HEX[i % SCEN_HEX.length] }}
              title={`${s.name} ${Math.round(s.probability * 100)}%`}
            >
              {s.probability >= 0.1 ? `${Math.round(s.probability * 100)}%` : ''}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="text-gray-500">
            Top: <strong className="text-gray-800 dark:text-white">{ranked[0]?.name}</strong>
          </span>
          {['gold', 'btc', 'equities'].map((a) => (
            <span key={a} className="text-gray-500">
              E[{a}]{' '}
              <strong
                className={`tabular-nums ${(ev[a] ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {(ev[a] ?? 0).toFixed(1)}%
              </strong>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
