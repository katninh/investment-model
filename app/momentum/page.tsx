import Link from 'next/link';
import { getMomentum } from '@/lib/data/momentum';

export const revalidate = 3600;

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 1) return { text: 'STRONG UP', color: 'text-green-700 dark:text-green-400' };
  if (score > 0) return { text: 'UP', color: 'text-green-700 dark:text-green-400' };
  if (score <= -1) return { text: 'STRONG DOWN', color: 'text-red-700 dark:text-red-400' };
  if (score < 0) return { text: 'DOWN', color: 'text-red-700 dark:text-red-400' };
  return { text: 'NEUTRAL', color: 'text-zinc-500' };
}

function fmt(x: number | null): string {
  return x == null ? '—' : x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function MomentumPage() {
  const assets = await getMomentum();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Technical Momentum</h1>
        <Link href="/valuation" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Valuation →
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Model 4 · price vs 50/200-day SMA + RSI(14) → −2..+2</p>

      <div className="space-y-4">
        {assets.map(({ asset, momentum: m }) => {
          const { text, color } = scoreLabel(m.score);
          const hasData = m.n > 0;
          // map -2..+2 to 0..100% for a centered bar
          const pct = ((m.score + 2) / 4) * 100;
          return (
            <section key={asset} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{asset}</span>
                <span className={`font-semibold ${color}`}>
                  {text} <span className="tabular-nums text-zinc-400">({m.score >= 0 ? '+' : ''}{m.score.toFixed(1)})</span>
                </span>
              </div>

              {hasData ? (
                <>
                  <div className="relative mt-3 h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800">
                    <div className="absolute left-1/2 top-[-3px] h-4 w-px bg-zinc-400" />
                    <div
                      className={`absolute top-[-3px] h-4 w-1 -translate-x-1/2 rounded ${m.score >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ left: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-zinc-400">Price</div>
                      <div className="tabular-nums">{fmt(m.price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">50-day</div>
                      <div className="tabular-nums">{fmt(m.sma50)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">200-day</div>
                      <div className="tabular-nums">
                        {fmt(m.sma200)}{' '}
                        {m.above200 != null ? (
                          <span className={m.above200 ? 'text-green-600' : 'text-red-600'}>
                            {m.above200 ? '↑' : '↓'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">RSI(14)</div>
                      <div className="tabular-nums">{m.rsi == null ? '—' : m.rsi.toFixed(0)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">no price data</p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
