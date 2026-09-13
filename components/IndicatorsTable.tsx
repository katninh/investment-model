'use client';

import { useMemo, useState } from 'react';
import type { IndicatorRow } from '@/lib/data/indicators';
import { Card, Badge } from '@/components/ui';

const SIGNAL_VARIANT: Record<string, 'success' | 'error' | 'neutral'> = {
  BULLISH: 'success',
  BEARISH: 'error',
  NEUTRAL: 'neutral',
};

function num(x: number | undefined, d = 2): string {
  return x == null || Number.isNaN(x) ? '—' : x.toFixed(d);
}
function pct(x: number | undefined, d = 0): string {
  return x == null || Number.isNaN(x) ? '—' : `${(x * 100).toFixed(d)}%`;
}

const SELECT =
  'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

export function IndicatorsTable({ rows }: { rows: IndicatorRow[] }) {
  const [category, setCategory] = useState('all');
  const [signalFilter, setSignalFilter] = useState('all');
  const [staleOnly, setStaleOnly] = useState(false);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((r) => r.category)))],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (category !== 'all' && r.category !== category) return false;
        if (staleOnly && !r.stale) return false;
        if (signalFilter === 'nodata') return r.signal == null;
        if (signalFilter !== 'all') return r.signal?.signalLabel === signalFilter;
        return true;
      }),
    [rows, category, signalFilter, staleOnly],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-gray-500">
          Category
          <select className={SELECT} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-gray-500">
          Signal
          <select className={SELECT} value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)}>
            <option value="all">all</option>
            <option value="BULLISH">bullish</option>
            <option value="NEUTRAL">neutral</option>
            <option value="BEARISH">bearish</option>
            <option value="nodata">no data</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-gray-500">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
            className="accent-brand-500"
          />
          stale only
        </label>
        <span className="ml-auto text-gray-400">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th className="px-5 py-3 font-medium">Indicator</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Latest</th>
                <th className="px-3 py-3 text-right font-medium">Z</th>
                <th className="px-3 py-3 text-right font-medium">%ile</th>
                <th className="px-3 py-3 text-right font-medium" title="% change over 1 period">Δ1p</th>
                <th className="px-3 py-3 text-right font-medium" title="% change over 3 periods">Δ3p</th>
                <th className="px-3 py-3 text-right font-medium" title="% change over 12 periods">Δ12p</th>
                <th className="px-3 py-3 font-medium">Signal</th>
                <th className="px-3 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">
                    {r.name}
                    {r.unit ? <span className="ml-1 font-normal text-gray-400">({r.unit})</span> : null}
                  </td>
                  <td className="px-3 py-3 text-gray-500">{r.category}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">{num(r.signal?.latest)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">{num(r.signal?.zScore)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-500">{pct(r.signal?.pctRank)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-500">{pct(r.signal?.mom1m, 1)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-500">{pct(r.signal?.mom3m, 1)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-500">{pct(r.signal?.mom12m, 1)}</td>
                  <td className="px-3 py-3">
                    {r.signal ? (
                      <Badge variant={SIGNAL_VARIANT[r.signal.signalLabel]}>{r.signal.signalLabel}</Badge>
                    ) : (
                      <span className="text-gray-400">no data</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    <span className="flex items-center gap-1.5">
                      {r.lastDate ?? '—'}
                      {r.stale && r.lastDate ? <Badge variant="warning">stale</Badge> : null}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="neutral">{r.sourceType}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
