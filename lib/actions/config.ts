'use server';

import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { appConfig } from '@/db/schema';
import type { AppSettings } from '@/lib/data/config';

export interface SaveResult {
  ok: boolean;
  message: string;
}

const REVALIDATE = ['/settings', '/', '/conviction', '/portfolio', '/brief'];

export async function saveSettings(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
  const n = (k: string) => Number(formData.get(k));
  const weights = {
    regimeFit: n('regimeFit'),
    valuation: n('valuation'),
    sentiment: n('sentiment'),
    momentum: n('momentum'),
    scenarioEv: n('scenarioEv'),
  };
  const constraints = { maxWeight: n('maxWeight'), minCash: n('minCash') };

  const all = [...Object.values(weights), ...Object.values(constraints)];
  if (all.some((v) => !Number.isFinite(v) || v < 0)) {
    return { ok: false, message: 'All values must be non-negative numbers.' };
  }
  if (Object.values(weights).reduce((a, b) => a + b, 0) <= 0) {
    return { ok: false, message: 'Weights must sum to more than 0.' };
  }
  if (constraints.maxWeight <= 0 || constraints.maxWeight > 1) {
    return { ok: false, message: 'Max weight must be between 0 and 1.' };
  }
  if (constraints.minCash < 0 || constraints.minCash >= 1) {
    return { ok: false, message: 'Min cash must be between 0 and 1.' };
  }

  const value: AppSettings = { weights, constraints };
  try {
    await db
      .insert(appConfig)
      .values({ key: 'model', value })
      .onConflictDoUpdate({ target: appConfig.key, set: { value, updatedAt: sql`now()` } });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message.slice(0, 120) : 'Save failed.' };
  }

  for (const p of REVALIDATE) revalidatePath(p);
  return { ok: true, message: 'Settings saved — models recomputed.' };
}

export async function resetSettings(): Promise<void> {
  try {
    await db.delete(appConfig).where(sql`${appConfig.key} = 'model'`);
  } catch {
    /* ignore */
  }
  for (const p of REVALIDATE) revalidatePath(p);
}
