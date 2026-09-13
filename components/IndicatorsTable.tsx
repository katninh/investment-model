'use client';

import { useMemo, useState } from 'react';
import type { IndicatorRow } from '@/lib/data/indicators';

const SIGNAL_STYLE: Record<string, string> = {
  BULLISH: 'text-green-700 dark:text-green-400',
  BEARISH: 'text-red-700 dark:text-red-400',
  NEUTRAL: 'text-zinc-500',
};

function num(x: number | undefined, d = 2): string {
  return x == null || Number.isNaN(x) ? '—' : x.toFixed(d);
}
function pct(x: number | undefined, d = 0): string {
  return x == null || Number.isNaN(x) ? '—' : `${(x * 100).toFixed(d)}%`;
}

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

  const control = 'rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          Category
          <select className={control} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Signal
          <select className={control} value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)}>
            <option value="all">all</option>
            <option value="BULLISH">bullish</option>
            <option value="NEUTRAL">neutral</option>
            <option value="BEARISH">bearish</option>
            <option value="nodata">no data</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          stale only
        </label>
        <span className="ml-auto text-zinc-500">{filtered.length} of {rows.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
              <th className="py-2 pr-3 font-medium">Indicator</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 text-right font-medium">Latest</th>
              <th className="py-2 pr-3 text-right font-medium">Z</th>
              <th className="py-2 pr-3 text-right font-medium">%ile</th>
              <th className="py-2 pr-3 text-right font-medium" title="% change over 1 period">Δ1p</th>
              <th className="py-2 pr-3 text-right font-medium" title="% change over 3 periods">Δ3p</th>
              <th className="py-2 pr-3 text-right font-medium" title="% change over 12 periods">Δ12p</th>
              <th className="py-2 pr-3 font-medium">Signal</th>
              <th className="py-2 pr-3 font-medium">Updated</th>
              <th className="py-2 pr-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3">
                  {r.name}
                  {r.unit ? <span className="ml-1 text-zinc-400">({r.unit})</span> : null}
                </td>
                <td className="py-2 pr-3 text-zinc-500">{r.category}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(r.signal?.latest)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(r.signal?.zScore)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(r.signal?.pctRank)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(r.signal?.mom1m, 1)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(r.signal?.mom3m, 1)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(r.signal?.mom12m, 1)}</td>
                <td className={`py-2 pr-3 font-medium ${r.signal ? SIGNAL_STYLE[r.signal.signalLabel] : 'text-zinc-400'}`}>
                  {r.signal ? r.signal.signalLabel : 'no data'}
                </td>
                <td className="py-2 pr-3 text-zinc-500">
                  {r.lastDate ?? '—'}
                  {r.stale && r.lastDate ? (
                    <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">stale</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {r.sourceType}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
