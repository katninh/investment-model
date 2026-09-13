'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, Badge } from '@/components/ui';

export interface PlannerAsset {
  asset: string;
  label: string;
  weight: number; // 0..1 target
}

const money = (x: number) =>
  x.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const INPUT =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export function PortfolioPlanner({ assets }: { assets: PlannerAsset[] }) {
  const [amount, setAmount] = useState<number>(0);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // load from localStorage (per-viewer, private)
  useEffect(() => {
    try {
      const a = localStorage.getItem('mm:investable');
      const h = localStorage.getItem('mm:holdings');
      if (a) setAmount(Number(a) || 0);
      if (h) setHoldings(JSON.parse(h));
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);

  function saveAmount(v: number) {
    setAmount(v);
    try {
      localStorage.setItem('mm:investable', String(v));
    } catch {
      /* ignore */
    }
  }
  function saveHolding(asset: string, v: number) {
    const next = { ...holdings, [asset]: v };
    setHoldings(next);
    try {
      localStorage.setItem('mm:holdings', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const totalHoldings = assets.reduce((s, a) => s + (holdings[a.asset] || 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* deployment plan */}
      <Card>
        <CardTitle className="mb-1">Deployment Plan</CardTitle>
        <p className="mb-4 text-xs text-gray-400">
          Enter a monthly investable amount to see target dollars per asset. Stored privately in your browser.
        </p>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-gray-500">Monthly investable ($)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={amount || ''}
            onChange={(e) => saveAmount(Number(e.target.value))}
            placeholder="e.g. 5000"
            className={INPUT}
          />
        </label>
        <ul className="space-y-2 text-sm">
          {assets.map((a) => (
            <li key={a.asset} className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                {a.label} <span className="text-gray-400">{Math.round(a.weight * 100)}%</span>
              </span>
              <span className="font-semibold tabular-nums text-gray-800 dark:text-white">
                {money(amount * a.weight)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* drift tracker */}
      <Card>
        <CardTitle className="mb-1">Drift vs Target</CardTitle>
        <p className="mb-4 text-xs text-gray-400">
          Enter current holdings ($) to see how far each position drifts from its target weight.
        </p>
        <ul className="space-y-3 text-sm">
          {assets.map((a) => {
            const held = holdings[a.asset] || 0;
            const actualW = ready && totalHoldings > 0 ? held / totalHoldings : 0;
            const drift = actualW - a.weight;
            const off = Math.abs(drift) > 0.05;
            return (
              <li key={a.asset} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-gray-600 dark:text-gray-300">{a.label}</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={held || ''}
                  onChange={(e) => saveHolding(a.asset, Number(e.target.value))}
                  placeholder="0"
                  className={`${INPUT} !py-1.5`}
                />
                <span className="w-24 shrink-0 text-right">
                  {totalHoldings > 0 ? (
                    <Badge variant={off ? 'warning' : 'success'}>
                      {drift >= 0 ? '+' : ''}
                      {(drift * 100).toFixed(0)}%
                    </Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {totalHoldings > 0 ? (
          <p className="mt-3 text-xs text-gray-400">
            Total holdings {money(totalHoldings)} · badges over ±5% suggest a rebalance.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
