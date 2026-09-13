'use server';

import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { rawObservations, manualInputs } from '@/db/schema';

export interface ManualResult {
  ok: boolean;
  message: string;
}

// Save a manually-entered observation. Writes to raw_observations (so it feeds
// the models) and manual_inputs (audit trail). Input is validated at this boundary.
export async function saveManual(_prev: ManualResult | null, formData: FormData): Promise<ManualResult> {
  const indicatorId = String(formData.get('indicatorId') ?? '').trim();
  const obsDate = String(formData.get('obsDate') ?? '').trim();
  const rawValue = String(formData.get('value') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const value = Number(rawValue);

  if (!indicatorId) return { ok: false, message: 'Missing indicator.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(obsDate)) return { ok: false, message: 'Date must be YYYY-MM-DD.' };
  if (rawValue === '' || !Number.isFinite(value)) return { ok: false, message: 'Value must be a number.' };

  try {
    await db
      .insert(rawObservations)
      .values({
        indicatorId,
        obsDate,
        value,
        sourceType: 'manual',
        rawPayload: { manual: true, note: note || undefined },
      })
      .onConflictDoUpdate({
        target: [rawObservations.indicatorId, rawObservations.obsDate],
        set: { value, fetchedAt: sql`now()` },
      });

    await db.insert(manualInputs).values({ indicatorId, obsDate, value, enteredBy: 'operator', note: note || null });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message.slice(0, 120) : 'Save failed.' };
  }

  // refresh anything that reads this data
  for (const p of ['/data', '/', '/indicators', '/regime', '/sentiment', '/valuation']) {
    revalidatePath(p);
  }
  return { ok: true, message: `Saved ${indicatorId} @ ${obsDate}.` };
}
