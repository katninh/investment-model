'use client';

import { useActionState, useState } from 'react';
import { saveSettings, type SaveResult } from '@/lib/actions/config';
import type { AppSettings } from '@/lib/data/config';
import { Card, CardTitle, Badge } from './ui';

const WEIGHTS = [
  ['regimeFit', 'Regime fit'],
  ['valuation', 'Valuation'],
  ['sentiment', 'Sentiment'],
  ['momentum', 'Momentum'],
  ['scenarioEv', 'Scenario EV'],
] as const;

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(saveSettings, null);
  const [w, setW] = useState(settings.weights);
  const [c, setC] = useState(settings.constraints);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <CardTitle>Conviction weights</CardTitle>
          <Badge variant="neutral">sum {sum.toFixed(2)} → normalized to 1</Badge>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          How much each model contributes to conviction (PRD §7.7). Values are normalized, so relative size is what matters.
        </p>
        <div className="space-y-4">
          {WEIGHTS.map(([key, label]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-200">{label}</span>
                <span className="tabular-nums text-gray-500">
                  {w[key].toFixed(2)} · {sum > 0 ? Math.round((w[key] / sum) * 100) : 0}%
                </span>
              </div>
              <input
                type="range"
                name={key}
                min={0}
                max={0.6}
                step={0.01}
                value={w[key]}
                onChange={(e) => setW({ ...w, [key]: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Portfolio constraints</CardTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-200">Max weight / asset</span>
              <span className="tabular-nums text-gray-500">{Math.round(c.maxWeight * 100)}%</span>
            </div>
            <input
              type="range"
              name="maxWeight"
              min={0.1}
              max={1}
              step={0.05}
              value={c.maxWeight}
              onChange={(e) => setC({ ...c, maxWeight: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-200">Min cash reserve</span>
              <span className="tabular-nums text-gray-500">{Math.round(c.minCash * 100)}%</span>
            </div>
            <input
              type="range"
              name="minCash"
              min={0}
              max={0.5}
              step={0.05}
              value={c.minCash}
              onChange={(e) => setC({ ...c, minCash: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save settings'}
        </button>
        {state ? <Badge variant={state.ok ? 'success' : 'error'}>{state.message}</Badge> : null}
      </div>
    </form>
  );
}
