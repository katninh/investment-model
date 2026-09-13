CREATE TABLE "alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule_id" text,
	"as_of" date,
	"severity" text,
	"title" text,
	"detail" text,
	"acknowledged" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "allocations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid,
	"asset" text,
	"target_weight" double precision,
	"rationale" text
);
--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"as_of" date,
	"markdown" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conviction_scores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid,
	"asset" text,
	"valuation" double precision,
	"momentum" double precision,
	"sentiment" double precision,
	"regime_fit" double precision,
	"scenario_ev" double precision,
	"conviction" double precision,
	"action" text
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"frequency" text NOT NULL,
	"higher_better" boolean,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ingestion_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text,
	"series_ok" integer DEFAULT 0,
	"series_err" integer DEFAULT 0,
	"notes" text,
	"run_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manual_inputs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"indicator_id" text,
	"obs_date" date,
	"value" double precision,
	"entered_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"as_of" date NOT NULL,
	"model_version" text NOT NULL,
	"regime" text,
	"regime_conf" double precision,
	"clock_pos" text,
	"sentiment_score" double precision,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_observations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"indicator_id" text,
	"obs_date" date NOT NULL,
	"value" double precision,
	"raw_payload" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now(),
	"source_type" text,
	CONSTRAINT "raw_observations_indicator_id_obs_date_unique" UNIQUE("indicator_id","obs_date")
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid,
	"code" text,
	"name" text,
	"probability" double precision,
	"triggers_met" jsonb,
	"asset_returns" jsonb
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"indicator_id" text,
	"as_of" date NOT NULL,
	"latest" double precision,
	"z_score" double precision,
	"pct_rank" double precision,
	"mom_1m" double precision,
	"mom_3m" double precision,
	"mom_12m" double precision,
	"signal" integer,
	"signal_label" text,
	"model_version" text,
	"computed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "signals_indicator_id_as_of_model_version_unique" UNIQUE("indicator_id","as_of","model_version")
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_run_id_model_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_run_id_model_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conviction_scores" ADD CONSTRAINT "conviction_scores_run_id_model_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_inputs" ADD CONSTRAINT "manual_inputs_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_observations" ADD CONSTRAINT "raw_observations_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_run_id_model_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;