import { getRegimeCall } from '@/lib/data/regime';
import { getFedCall } from '@/lib/data/fed';
import { RegimeBanner } from '@/components/RegimeBanner';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';
import type { IndicatorRow } from '@/lib/data/indicators';

export const dynamic = 'force-dynamic';

const CELLS = [
  { regime: 'STAGFLATION', label: 'Stagflation', sub: 'growth ↓ · inflation ↑' },
  { regime: 'OVERHEAT', label: 'Overheat', sub: 'growth ↑ · inflation ↑' },
  { regime: 'RECESSION', label: 'Recession', sub: 'growth ↓ · inflation ↓' },
  { regime: 'RECOVERY', label: 'Recovery', sub: 'growth ↑ · inflation ↓' },
];

function ContributorCard({ title, rows }: { title: string; rows: IndicatorRow[] }) {
  return (
    <Card>
      <CardTitle className="mb-3 text-sm">{title}</CardTitle>
      <ul className="space-y-2">
        {rows.map((r) => {
          const s = r.signal!.signal;
          return (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{r.name}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-xs text-gray-400">z {r.signal!.zScore.toFixed(2)}</span>
                <Badge variant={s > 0 ? 'success' : s < 0 ? 'error' : 'neutral'}>{r.signal!.signalLabel}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default async function RegimePage() {
  const [{ call, transitions, growth, inflation }, fed] = await Promise.all([getRegimeCall(), getFedCall()]);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Macro Regime" description="Investment Clock — growth × inflation (Model 1)" />

      <Card>
        <RegimeBanner call={call} />
      </Card>

      <Card className="mt-6">
        <CardTitle className="mb-4">Investment Clock</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          {CELLS.map((c) => {
            const active = c.regime === call.regime;
            return (
              <div
                key={c.regime}
                className={`rounded-xl border p-4 ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`font-semibold ${active ? 'text-brand-600 dark:text-brand-300' : 'text-gray-500'}`}>
                  {c.label}
                </div>
                <div className="text-xs text-gray-400">{c.sub}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Left→right: growth strengthening · Top→bottom: inflation easing
        </p>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardTitle className="mb-3 text-sm">Transition odds</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="pb-2 font-medium">Regime</th>
                {transitions.map((t) => (
                  <th key={t.horizon} className="pb-2 text-right font-medium">{t.horizon}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['STAGFLATION', 'OVERHEAT', 'RECESSION', 'RECOVERY', 'TRANSITION'] as const).map((r) => (
                <tr key={r} className={r === call.regime ? 'font-semibold text-brand-600 dark:text-brand-300' : 'text-gray-600 dark:text-gray-300'}>
                  <td className="py-1 capitalize">{r.toLowerCase()}</td>
                  {transitions.map((t) => (
                    <td key={t.horizon} className="py-1 text-right tabular-nums">{pct(t.odds[r])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-400">Scores projected by 3m momentum; a transparent heuristic, not a fitted HMM.</p>
        </Card>

        <Card>
          <CardTitle className="mb-3 text-sm">Fed reaction function</CardTitle>
          {fed ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-500">Rule says</span>
                <Badge variant={fed.rule.lean === 'HIKE' ? 'error' : fed.rule.lean === 'CUT' ? 'success' : 'neutral'}>
                  {fed.rule.lean}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {[
                  ['Policy rate (EFFR)', `${fed.rule.policyRate.toFixed(2)}%`],
                  ['Taylor-rule rate', `${fed.rule.taylorRate.toFixed(2)}%`],
                  ['Gap (rule − policy)', `${fed.rule.gap >= 0 ? '+' : ''}${fed.rule.gap.toFixed(2)}%`],
                  ['Rule hike probability', pct(fed.rule.hikeProb)],
                  ['Implied terminal rate', `${fed.rule.terminalRate.toFixed(2)}%`],
                  ...(fed.market
                    ? [
                        [`Market (${fed.market.source})`, pct(fed.market.hikeProb)],
                        ['Rule − market', `${fed.market.ruleMinusMarket >= 0 ? '+' : ''}${Math.round(fed.market.ruleMinusMarket * 100)} pts`],
                      ]
                    : []),
                ].map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{k}</span>
                    <span className="tabular-nums text-gray-800 dark:text-white">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                Inputs: core PCE {fed.rule.coreInflation.toFixed(1)}% y/y, unemployment {fed.rule.unemployment.toFixed(1)}%.
                Enter CME FedWatch odds on /data (FEDWATCH_HIKE) to replace the 2Y-spread proxy.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Needs EFFR, UNRATE and core PCE data.</p>
          )}
        </Card>

        <ContributorCard title={`Growth signals (${growth.length})`} rows={growth} />
        <ContributorCard title={`Inflation signals (${inflation.length})`} rows={inflation} />
      </div>
    </div>
  );
}
