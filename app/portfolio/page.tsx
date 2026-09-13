import { getPortfolio } from '@/lib/data/portfolio';
import { ASSET_LABEL } from '@/lib/data/conviction';
import { Card, CardTitle, PageHeader } from '@/components/ui';
import { DonutChart } from '@/components/charts/DonutChart';
import { PortfolioPlanner } from '@/components/PortfolioPlanner';

export const revalidate = 3600;

const ASSET_HEX: Record<string, string> = {
  equities: '#3b82f6',
  gold: '#f59e0b',
  btc: '#f97316',
  bonds: '#a855f7',
  cash: '#94a3b8',
};

export default async function PortfolioPage() {
  const { allocations, regime } = await getPortfolio();
  const funded = allocations.filter((a) => a.weight > 0.0005);

  return (
    <div className="animate-fade-up mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader
        title="Portfolio"
        description={`Layer 5 · target allocation from conviction · regime: ${regime} · max 35%/asset, min 10% cash`}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-1">Allocation</CardTitle>
          <DonutChart
            labels={funded.map((a) => ASSET_LABEL[a.asset] ?? a.asset)}
            series={funded.map((a) => Math.round(a.weight * 100))}
            colors={funded.map((a) => ASSET_HEX[a.asset] ?? '#94a3b8')}
          />
        </Card>

        <Card className="lg:col-span-3 !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-3 py-3 text-right font-medium">Weight</th>
                  <th className="px-5 py-3 font-medium">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.asset} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="flex items-center gap-2 px-5 py-3 font-medium text-gray-800 dark:text-white">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: ASSET_HEX[a.asset] ?? '#94a3b8' }}
                      />
                      {ASSET_LABEL[a.asset] ?? a.asset}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-gray-800 dark:text-white">
                      {(a.weight * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-gray-500">{a.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <PortfolioPlanner
          assets={funded.map((a) => ({
            asset: a.asset,
            label: ASSET_LABEL[a.asset] ?? a.asset,
            weight: a.weight,
          }))}
        />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Target weights only — not advice. Deployment and drift figures are stored privately in your browser.
      </p>
    </div>
  );
}
