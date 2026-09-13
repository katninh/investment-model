import { getSentiment } from '@/lib/data/sentiment';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

const LABEL_COLOR: Record<string, string> = {
  'EXTREME FEAR': 'text-green-600 dark:text-green-400',
  FEAR: 'text-green-600 dark:text-green-400',
  NEUTRAL: 'text-gray-500',
  GREED: 'text-red-600 dark:text-red-400',
  'EXTREME GREED': 'text-red-600 dark:text-red-400',
};

function scoreText(score: number): string {
  return score > 0 ? 'fear (+1)' : score < 0 ? 'greed (−1)' : 'neutral (0)';
}

export default async function SentimentPage() {
  const { composite, rows, liveCount } = await getSentiment();
  const byId = new Map(composite.contributions.map((c) => [c.id, c]));
  const markerPct = ((composite.normalized + 1) / 2) * 100;

  return (
    <div className="animate-fade-up mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title="Sentiment"
        description={`Contrarian composite (Model 3) · ${liveCount} of ${rows.length} inputs live`}
      />

      <Card>
        <div className={`text-3xl font-bold tracking-tight ${LABEL_COLOR[composite.label]}`}>
          {composite.label}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Positive = fear = contrarian accumulate. Composite {composite.composite.toFixed(1)} · normalized{' '}
          {composite.normalized >= 0 ? '+' : ''}
          {composite.normalized.toFixed(2)}
        </p>
        <div className="relative mt-5 h-3 w-full rounded-full bg-gradient-to-r from-red-400 via-gray-200 to-green-400 dark:via-gray-700">
          <div
            className="absolute top-[-4px] h-5 w-1.5 -translate-x-1/2 rounded-full bg-gray-800 shadow-card dark:bg-white"
            style={{ left: `${markerPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-gray-400">
          <span>Extreme Greed</span>
          <span>Neutral</span>
          <span>Extreme Fear</span>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle className="mb-3">Inputs</CardTitle>
        <div className="space-y-2.5">
          {rows.map((r) => {
            const c = byId.get(r.id);
            return (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  {r.name}
                  {r.stale && r.signal ? <Badge variant="warning">stale</Badge> : null}
                </span>
                <span className="flex items-center gap-3 text-gray-400">
                  <span className="tabular-nums">{r.signal ? `${Math.round(r.signal.pctRank * 100)}%ile` : '—'}</span>
                  {c ? (
                    <span className="text-gray-600 dark:text-gray-300">{scoreText(c.score)}</span>
                  ) : (
                    <Badge variant="neutral">no data</Badge>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
