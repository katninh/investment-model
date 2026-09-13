import type { RegimeCall } from '@/lib/model/regime';
import { Badge } from './ui';
import { RadialGauge } from './charts/RadialGauge';

const REGIME_COLOR: Record<string, string> = {
  OVERHEAT: '#a855f7',
  RECOVERY: '#22c55e',
  STAGFLATION: '#f59e0b',
  RECESSION: '#ef4444',
  TRANSITION: '#6b7280',
};

const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}`;

export function RegimeBanner({ call }: { call: RegimeCall }) {
  const color = REGIME_COLOR[call.regime] ?? '#6b7280';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-3xl font-bold tracking-tight" style={{ color }}>
            {call.regime}
          </span>
          <Badge variant="neutral">{call.clockPos}</Badge>
        </div>
        <p className="mt-2 max-w-md text-sm text-gray-500">{call.description}</p>

        <div className="mt-4 flex gap-8 text-sm">
          <div>
            <div className="text-xs text-gray-400">Growth</div>
            <div className="font-semibold tabular-nums text-gray-800 dark:text-white">
              {signed(call.growthScore)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Inflation</div>
            <div className="font-semibold tabular-nums text-gray-800 dark:text-white">
              {signed(call.inflationScore)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Favored</span>
          {call.bestAssets.map((a) => (
            <Badge key={a} variant="brand">
              {a}
            </Badge>
          ))}
        </div>
      </div>

      <div className="w-44 shrink-0 self-center">
        <RadialGauge value={call.confidence * 100} label="Confidence" color={color} height={180} />
      </div>
    </div>
  );
}
