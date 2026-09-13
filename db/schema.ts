import {
  pgTable, text, timestamp, boolean, date, doublePrecision,
  bigserial, jsonb, uuid, integer, unique,
} from 'drizzle-orm/pg-core';

// Master list of every indicator the system tracks
export const indicators = pgTable('indicators', {
  id: text('id').primaryKey(),                      // e.g. 'FRED_CPIAUCSL'
  name: text('name').notNull(),
  category: text('category').notNull(),             // growth|inflation|monetary|market|sentiment|valuation
  sourceType: text('source_type').notNull(),        // api|derived|manual|scraped
  sourceId: text('source_id'),                      // FRED series id, ticker, etc.
  frequency: text('frequency').notNull(),           // daily|weekly|monthly|quarterly
  higherBetter: boolean('higher_better'),           // true|false|null (signal direction)
  unit: text('unit'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Every raw data point ever collected (append-only, immutable)
export const rawObservations = pgTable('raw_observations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  indicatorId: text('indicator_id').references(() => indicators.id),
  obsDate: date('obs_date').notNull(),
  value: doublePrecision('value'),
  rawPayload: jsonb('raw_payload'),                 // verbatim API response for audit
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
  sourceType: text('source_type'),
}, (t) => [unique().on(t.indicatorId, t.obsDate)]);

// Computed signals (Layer 2) — recomputable from raw_observations
export const signals = pgTable('signals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  indicatorId: text('indicator_id').references(() => indicators.id),
  asOf: date('as_of').notNull(),
  latest: doublePrecision('latest'),
  zScore: doublePrecision('z_score'),
  pctRank: doublePrecision('pct_rank'),             // 0..1
  mom1m: doublePrecision('mom_1m'),
  mom3m: doublePrecision('mom_3m'),
  mom12m: doublePrecision('mom_12m'),
  signal: integer('signal'),                        // -1 | 0 | +1
  signalLabel: text('signal_label'),                // BULLISH|NEUTRAL|BEARISH
  modelVersion: text('model_version'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.indicatorId, t.asOf, t.modelVersion)]);

// A full model run (Layers 3-5 output snapshot)
export const modelRuns = pgTable('model_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  asOf: date('as_of').notNull(),
  modelVersion: text('model_version').notNull(),
  regime: text('regime'),                           // STAGFLATION|RECESSION|...
  regimeConf: doublePrecision('regime_conf'),
  clockPos: text('clock_pos'),                      // '7-8 o'clock'
  sentimentScore: doublePrecision('sentiment_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Scenario probabilities per run
export const scenarios = pgTable('scenarios', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  runId: uuid('run_id').references(() => modelRuns.id),
  code: text('code'),                               // A|B|C|D|E
  name: text('name'),
  probability: doublePrecision('probability'),      // 0..1
  triggersMet: jsonb('triggers_met'),
  assetReturns: jsonb('asset_returns'),
});

// Conviction score per asset per run (Layer 4)
export const convictionScores = pgTable('conviction_scores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  runId: uuid('run_id').references(() => modelRuns.id),
  asset: text('asset'),                             // gold|btc|usd_tbills|...
  valuation: doublePrecision('valuation'),
  momentum: doublePrecision('momentum'),
  sentiment: doublePrecision('sentiment'),
  regimeFit: doublePrecision('regime_fit'),
  scenarioEv: doublePrecision('scenario_ev'),
  conviction: doublePrecision('conviction'),        // -1..+1 final
  action: text('action'),                           // ACCUMULATE|HOLD|AVOID
});

// Portfolio allocation per run (Layer 5)
export const allocations = pgTable('allocations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  runId: uuid('run_id').references(() => modelRuns.id),
  asset: text('asset'),
  targetWeight: doublePrecision('target_weight'),   // 0..1
  rationale: text('rationale'),
});

// Generated written briefs
export const briefs = pgTable('briefs', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => modelRuns.id),
  asOf: date('as_of'),
  markdown: text('markdown'),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Alerts / model-change triggers
export const alerts = pgTable('alerts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ruleId: text('rule_id'),
  asOf: date('as_of'),
  severity: text('severity'),                       // info|warn|critical
  title: text('title'),
  detail: text('detail'),
  acknowledged: boolean('acknowledged').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Pipeline run health (written by the Python pipeline)
export const ingestionLog = pgTable('ingestion_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  source: text('source'),                           // fred|prices|cftc|trends...
  seriesOk: integer('series_ok').default(0),
  seriesErr: integer('series_err').default(0),
  notes: text('notes'),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow(),
});

// Manual data entry + assumptions
export const manualInputs = pgTable('manual_inputs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  indicatorId: text('indicator_id').references(() => indicators.id),
  obsDate: date('obs_date'),
  value: doublePrecision('value'),
  enteredBy: text('entered_by'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
