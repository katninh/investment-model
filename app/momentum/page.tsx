import { getMomentum } from '@/lib/data/momentum';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

function scoreLabel(score: number): { text: string; variant: 'success' | 'error' | 'neutral' } {
  if (score >= 1) return { text: 'STRONG UP', variant: 'success' };
  if (score > 0) return { text: 'UP', variant: 'success' };
  if (score <= -1) return { text: 'STRONG DOWN', variant: 'error' };
  if (score < 0) return { text: 'DOWN', variant: 'error' };
  return { text: 'NEUTRAL', variant: 'neutral' };
}

const fmt = (x: number | null) =>
  x == null ? '—' : x.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default async function MomentumPage() {
  const assets = await getMomentum();

  return (
    <div className="animate-fade-up mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader title="Technical Momentum" description="Model 4 · price vs 50/200-day SMA + RSI(14) → −2..+2" />

      <div className="grid gap-6 sm:grid-cols-2">
        {assets.map(({ asset, momentum: m }) => {
          const { text, variant } = scoreLabel(m.score);
          const pct = ((m.score + 2) / 4) * 100;
          return (
            <Card key={asset}>
              <div className="flex items-center justify-between">
                <CardTitle>{asset}</CardTitle>
                <Badge variant={variant}>
                  {text} ({m.score >= 0 ? '+' : ''}
                  {m.score.toFixed(1)})
                </Badge>
              </div>

              {m.n > 0 ? (
                <>
                  <div className="relative mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="absolute left-1/2 top-[-3px] h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <div
                      className={`absolute top-[-3px] h-4 w-1.5 -translate-x-1/2 rounded-full ${m.score >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ left: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-400">Price</div>
                      <div className="tabular-nums text-gray-800 dark:text-white">{fmt(m.price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">50-day</div>
                      <div className="tabular-nums text-gray-800 dark:text-white">{fmt(m.sma50)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">200-day</div>
                      <div className="tabular-nums text-gray-800 dark:text-white">
                        {fmt(m.sma200)}{' '}
                        {m.above200 != null ? (
                          <span className={m.above200 ? 'text-green-500' : 'text-red-500'}>
                            {m.above200 ? '↑' : '↓'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">RSI(14)</div>
                      <div className="tabular-nums text-gray-800 dark:text-white">
                        {m.rsi == null ? '—' : m.rsi.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-400">no price data</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
