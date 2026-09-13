import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appConfig } from '@/db/schema';
import { CONVICTION_WEIGHTS, type ConvictionInputs } from '@/lib/model/conviction';
import { DEFAULT_CONSTRAINTS, type PortfolioConstraints } from '@/lib/model/portfolio';

export interface AppSettings {
  weights: ConvictionInputs;
  constraints: PortfolioConstraints;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weights: { ...CONVICTION_WEIGHTS },
  constraints: { ...DEFAULT_CONSTRAINTS },
};

export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const rows = await db.select().from(appConfig).where(eq(appConfig.key, 'model'));
    const stored = rows[0]?.value as Partial<AppSettings> | undefined;
    return {
      weights: { ...DEFAULT_SETTINGS.weights, ...stored?.weights },
      constraints: { ...DEFAULT_SETTINGS.constraints, ...stored?.constraints },
    };
  } catch {
    return DEFAULT_SETTINGS; // fall back to defaults if config unreadable
  }
});

// Normalize weights to sum 1 so conviction stays in a meaningful -1..1 range.
export function normalizedWeights(w: ConvictionInputs): ConvictionInputs {
  const total = w.regimeFit + w.valuation + w.sentiment + w.momentum + w.scenarioEv;
  if (total <= 0) return { ...CONVICTION_WEIGHTS };
  return {
    regimeFit: w.regimeFit / total,
    valuation: w.valuation / total,
    sentiment: w.sentiment / total,
    momentum: w.momentum / total,
    scenarioEv: w.scenarioEv / total,
  };
}
