import { getValuation } from '@/lib/data/valuation';
import { sjcFromXau } from '@/lib/model/valuation';
import { Card, CardTitle, PageHeader } from '@/components/ui';
import { RadialGauge } from '@/components/charts/RadialGauge';

export const dynamic = 'force-dynamic';

function gaugeColor(score: number): string {
  if (score >= 7) return '#22c55e'; // cheap
  if (score <= 4) return '#ef4444'; // expensive
  return '#f59e0b';
}

export default async function ValuationPage() {
  const { assets, goldResidualZ, erp, sjc } = await getValuation();

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Valuation" description="Model 2 · 1–10, 10 = cheapest · gold anchored to the 10Y real yield" />

      {assets.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">No valuation metrics have data yet.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <Card key={a.asset}>
              <CardTitle className="mb-1">{a.asset}</CardTitle>
              <RadialGauge
                value={(a.score / 10) * 100}
                label="cheapness"
                color={gaugeColor(a.score)}
                height={190}
                displayValue={a.score.toFixed(1)}
              />
              <ul className="mt-2 space-y-1.5 text-sm">
                {a.metrics.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{m.label}</span>
                    <span className="tabular-nums text-gray-400">
                      {Math.round(m.pctRank * 100)}%ile · {(m.cheapness * 100).toFixed(0)}% cheap
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardTitle className="mb-1">SJC gold premium (Vietnam)</CardTitle>
        {sjc ? (
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-gray-400">Premium over world parity</div>
              <div className="text-lg font-bold tabular-nums text-gray-800 dark:text-white">
                {(sjc.premium * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Premium z-score</div>
              <div className="text-lg font-bold tabular-nums text-gray-800 dark:text-white">
                {sjc.z != null ? sjc.z.toFixed(2) : '—'}
              </div>
              {sjc.z == null ? <div className="text-xs text-gray-400">needs ≥3 same-day entries ({sjc.n})</div> : null}
            </div>
            <div>
              <div className="text-xs text-gray-400">USD/VND</div>
              <div className="text-lg font-bold tabular-nums text-gray-800 dark:text-white">
                {Math.round(sjc.usdVnd).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">SJC at XAU $4,000 (same premium)</div>
              <div className="text-lg font-bold tabular-nums text-gray-800 dark:text-white">
                {sjcFromXau(4000, sjc.usdVnd, sjc.premium).toFixed(1)}M
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Enter today&apos;s SJC sell price (million VND/lượng) on /data — sjc.com.vn has no open API.
          </p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          SJC = XAU × USD/VND × 1.2057 × (1 + premium) / 1e6. The premium is a separate risk: it compresses
          when the world price stabilises.
        </p>
      </Card>

      <p className="mt-6 text-xs text-gray-400">
        Gold&apos;s real-rate metric is the residual of ln(gold) regressed on the 10Y TIPS yield (current
        z {goldResidualZ.toFixed(2)}; + = rich vs real rates).{' '}
        Equities blends a Buffett proxy (Fed Z.1 corporate equities / GDP), Shiller CAPE (multpl.com) and
        the equity risk premium vs 10Y TIPS{erp != null ? ` (now ${erp.toFixed(2)}%)` : ''} = 100/CAPE − real yield.
      </p>
    </div>
  );
}
