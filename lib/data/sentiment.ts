import { getIndicatorSignals, type IndicatorRow } from './indicators';
import { sentimentComposite, type SentimentComposite } from '@/lib/model/sentiment';

export interface SentimentResult {
  composite: SentimentComposite;
  rows: IndicatorRow[]; // all sentiment indicators, incl. no-data
  liveCount: number;
}

export async function getSentiment(): Promise<SentimentResult> {
  const all = await getIndicatorSignals();
  const rows = all.filter((r) => r.category === 'sentiment');
  const inputs = rows
    .filter((r) => r.signal)
    .map((r) => ({ id: r.id, pctRank: r.signal!.pctRank, stale: r.stale }));

  return { composite: sentimentComposite(inputs), rows, liveCount: inputs.length };
}
