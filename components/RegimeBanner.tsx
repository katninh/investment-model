import type { RegimeCall } from '@/lib/model/regime';

const REGIME_COLOR: Record<string, string> = {
  OVERHEAT: 'text-purple-700 dark:text-purple-400',
  RECOVERY: 'text-green-700 dark:text-green-400',
  STAGFLATION: 'text-amber-700 dark:text-amber-400',
  RECESSION: 'text-red-700 dark:text-red-400',
  TRANSITION: 'text-zinc-500',
};

export function RegimeBanner({ call }: { call: RegimeCall }) {
  const conf = Math.round(call.confidence * 100);
  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className={`text-3xl font-bold tracking-tight ${REGIME_COLOR[call.regime]}`}>
          {call.regime}
        </span>
        <span className="text-sm text-zinc-500">{call.clockPos}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{call.description}</p>

      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-400">Growth</div>
          <div className="tabular-nums">{call.growthScore >= 0 ? '+' : ''}{call.growthScore.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-400">Inflation</div>
          <div className="tabular-nums">{call.inflationScore >= 0 ? '+' : ''}{call.inflationScore.toFixed(2)}</div>
        </div>
        <div className="min-w-[140px] flex-1">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Confidence {conf}%</div>
          <div className="mt-1 h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800">
            <div className="h-2 rounded bg-zinc-500" style={{ width: `${conf}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-400">Favored:</span>
        {call.bestAssets.map((a) => (
          <span key={a} className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {a}
          </span>
        ))}
      </div>
    </section>
  );
}
