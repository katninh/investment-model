'use client';

import { useActionState } from 'react';
import { saveManual, type ManualResult } from '@/lib/actions/manual';
import { Badge } from './ui';

const INPUT =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export function ManualEntryForm({
  indicatorId,
  name,
  unit,
  lastDate,
  today,
}: {
  indicatorId: string;
  name: string;
  unit: string | null;
  lastDate: string | null;
  today: string;
}) {
  const [state, action, pending] = useActionState<ManualResult | null, FormData>(saveManual, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <input type="hidden" name="indicatorId" value={indicatorId} />
      <div className="min-w-[8rem] flex-1">
        <div className="text-sm font-medium text-gray-800 dark:text-white">
          {name}
          {unit ? <span className="ml-1 font-normal text-gray-400">({unit})</span> : null}
        </div>
        <div className="text-xs text-gray-400">last: {lastDate ?? 'never'}</div>
      </div>
      <input name="obsDate" type="date" defaultValue={today} required className={INPUT} />
      <input name="value" type="number" step="any" placeholder="value" required className={`${INPUT} w-24`} />
      <input name="note" type="text" placeholder="note" className={`${INPUT} w-28`} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state ? <Badge variant={state.ok ? 'success' : 'error'}>{state.message}</Badge> : null}
    </form>
  );
}
