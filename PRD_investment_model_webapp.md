# Product Requirements Document — Macro Investment Model Web App

**Document version:** 1.0
**Date:** September 2026
**Status:** Draft for build
**Stack:** Next.js 15 (App Router) · TypeScript · PostgreSQL · Tailwind · Deployed on Vercel

---

## 1. Executive Summary

### 1.1 What we are building

A web application that turns a five-layer macro investment model into a live, self-updating decision system. The app ingests economic, market, and sentiment data through APIs, processes it into normalized signals, runs it through five analytical models, and produces a single actionable output: a monthly (or on-demand) **Investment Brief** with a macro regime call, asset conviction scores, scenario probabilities, and a recommended allocation.

The core insight the product delivers: **the app updates scenario probabilities and conviction scores faster and more consistently than a human analyst can**, and presents the result as a clean, explainable dashboard rather than a spreadsheet.

### 1.2 The model in one paragraph

Raw data (Layer 1) → normalized signals via Z-score, percentile, and momentum (Layer 2) → five analytical models: Macro Regime, Valuation, Sentiment, Technical Momentum, Scenario Probability (Layer 3) → a weighted conviction score per asset (Layer 4) → portfolio allocation, deployment plan, and a written brief (Layer 5). Every layer is transparent and traceable: a user can click any final recommendation and drill all the way back to the raw data that produced it.

### 1.3 Design principles

1. **Explainability over black box.** Every number links back to its source. No recommendation appears without the reasoning path visible.
2. **API-first.** Wherever a free or low-cost API exists, use it. Manual data entry is the fallback, never the default.
3. **Separation of concerns.** Data collection, computation, and presentation are independent. The computation layer is pure, testable TypeScript.
4. **Regime-aware, not prediction-based.** The app never claims to predict prices. It identifies which environment we are in and which assets historically perform in that environment.
5. **Progressive disclosure.** The landing view is one screen (the Brief). Depth is one click away for those who want it.

---

## 2. Goals and Non-Goals

### 2.1 Goals

- Automate collection of ~30 macro/market/sentiment indicators via API.
- Compute the full five-layer model server-side, versioned and testable.
- Display an interactive dashboard covering regime, valuation, sentiment, scenarios, conviction, and portfolio.
- Generate a written, human-readable monthly Investment Brief.
- Alert the user when a "model change trigger" fires (e.g., a signal crosses a threshold).
- Store full history so every reading and every past brief is reproducible.

### 2.2 Non-Goals (v1)

- **Not** a brokerage or trade-execution platform. No order routing.
- **Not** a real-time tick-by-tick trading terminal. End-of-day granularity is sufficient.
- **Not** personalized financial advice with regulatory implications. The output is a research tool; disclaimers are mandatory.
- **Not** a multi-user SaaS at launch. Single-user (or small trusted group) first; multi-tenant is a later phase.
- **Not** a backtesting engine in v1 (added in a later phase).

---

## 3. Users and Personas

| Persona | Description | Primary need | Key screens |
|---|---|---|---|
| **The Operator** (primary) | Sophisticated individual investor who runs the model monthly | The Brief + deployment plan | Dashboard, Portfolio, Alerts |
| **The Analyst** | Wants to interrogate the data and challenge the model | Drill-down, raw indicators, model internals | Indicators, Scenarios, Conviction |
| **The Observer** | Follows the regime call without deep engagement | Regime + one-line summary | Dashboard only |

The app must serve the Operator in under 60 seconds (glance → decision) while letting the Analyst spend an hour if they choose.

---

## 4. System Architecture

### 4.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA SOURCES (external APIs)                                    │
│  FRED · Twelve Data · Finnhub · CoinGecko · CFTC Socrata ·      │
│  exchangerate.host · Nasdaq Data Link · (scrapers where needed) │
└───────────────────────────┬─────────────────────────────────────┘
                            │  scheduled fetch
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  INGESTION LAYER                                                 │
│  Vercel Cron → Next.js Route Handlers (/api/ingest/*)           │
│  OR reuse existing Python pipeline on GitHub Actions            │
│  → writes raw observations to Postgres                          │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL — Supabase or Neon)                       │
│  raw_observations · indicators · signals · model_runs ·        │
│  scenarios · conviction_scores · briefs · alerts               │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPUTATION LAYER (pure TypeScript, server-side)              │
│  Layer 2 signals → Layer 3 models → Layer 4 synthesis →        │
│  Layer 5 portfolio. Deterministic, unit-tested, versioned.     │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Next.js App Router + React)               │
│  Server Components read computed results · Client Components    │
│  for interactive charts · Recharts / Lightweight Charts        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Two build options for the data/compute pipeline

**Option A — Hybrid (recommended for MVP).**
Keep the already-built Python Layer 1 collection running on GitHub Actions. It writes raw data to Postgres. The Next.js app performs Layers 2–5 in TypeScript. This reuses existing work and gets to a working app fastest.

**Option B — Full TypeScript.**
Rewrite ingestion as Next.js Route Handlers triggered by Vercel Cron. Everything lives in one repo and one language. Cleaner long-term, more work upfront.

**Decision (this project): Option A — Hybrid.** This is a single-user app and a working Python Layer 1 pipeline already exists. Adapt it to write to Postgres and schedule it with GitHub Actions. The full pipeline build is specified as a first-class deliverable in **Section 5A** below and gets its own phase (Phase 1). Migrating ingestion to Option B (Vercel Cron) is an optional Phase 6 task, not required — the database schema is identical either way, so the migration touches only ingestion code if you ever choose to do it.

**Single-user simplifications adopted:** one login, no row-level security, no multi-tenant config, no per-user data isolation. Model config (weights, thresholds) lives in one place. This removes a meaningful amount of Phase 0 work.

### 4.3 Why compute in the app layer, not pre-compute in Python

Model logic (weights, thresholds, scenario definitions) will change frequently as the user refines the framework. Keeping computation in versioned TypeScript inside the app means: (1) a change to a model weight instantly recomputes every historical run for backtesting, (2) the frontend can offer "what-if" sliders that recompute live, and (3) the logic is unit-testable in CI. Raw data is expensive to fetch and belongs in Python/cron; derived data is cheap to recompute and belongs in the app.

### 4.4 Tech stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router, React Server Components | SSR for fast first paint, route handlers for API, one deploy target |
| Language | TypeScript (strict) | Type safety across data → model → UI |
| Database | PostgreSQL via Supabase | Postgres + auth + row-level security + free tier; time-series friendly |
| ORM | Drizzle ORM | Lightweight, TS-native, SQL-first, good migrations |
| Caching | Next.js Data Cache + Upstash Redis (optional) | ISR for dashboards; Redis for rate-limited API responses |
| Scheduling | Vercel Cron (Option B) or GitHub Actions (Option A) | Both free at this scale |
| Charts | Recharts (standard) + TradingView Lightweight Charts (price/candles) | Recharts for model viz, Lightweight for OHLC |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components |
| Auth | Single magic-link login (Supabase Auth) — **no RLS needed in v1** | Single-user; one account, no multi-tenant complexity |
| Charts state | TanStack Query (client) | Cache + revalidation for interactive views |
| Testing | Vitest (unit) + Playwright (e2e) | Model logic must be unit-tested |
| Deployment | Vercel | Native Next.js, cron, edge, preview deploys |
| Monitoring | Sentry + Vercel Analytics | Error tracking + usage |

---

## 4A. Environment Setup and Prerequisites

This section takes a machine from nothing to a running local development environment. Follow it in order. Estimated time: 60–90 minutes the first time. Commands are given for **macOS** (primary) with Windows notes where they differ.

### 4A.1 Prerequisites checklist

| Tool | Version | Purpose | Verify command |
|---|---|---|---|
| Node.js | 20 LTS or 22 LTS | Runs Next.js | `node --version` |
| npm (or pnpm) | npm 10+ / pnpm 9+ | Package manager | `npm --version` |
| Python | 3.12+ | Runs the data pipeline | `python3 --version` |
| pip | latest | Python packages | `pip3 --version` |
| Git | 2.40+ | Version control | `git --version` |
| GitHub account | — | Repo hosting + Actions | — |
| Supabase account | — | Postgres database | — |
| Vercel account | — | App hosting | — |
| VS Code (recommended) | latest | Editor | — |

### 4A.2 Step 1 — Install the base tools (macOS)

The cleanest path on macOS is Homebrew. Install it once:

```bash
# Install Homebrew (skip if `brew --version` already works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node, Python, Git in one line
brew install node@22 python@3.12 git

# Verify
node --version    # → v22.x
python3 --version # → Python 3.12.x
git --version     # → git 2.x
```

**Windows note:** install Node from nodejs.org (LTS), Python from python.org (tick "Add Python to PATH"), and Git from git-scm.com. Then use PowerShell or Git Bash for the commands below.

**Recommended (optional):** use `pnpm` instead of npm — it's faster and disk-efficient:
```bash
npm install -g pnpm
```

### 4A.3 Step 2 — Configure Git and GitHub

```bash
# Set your identity (once per machine)
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

**Set up GitHub authentication.** The modern way is the GitHub CLI:
```bash
brew install gh          # macOS; Windows: download from cli.github.com
gh auth login            # follow prompts → choose HTTPS → authenticate in browser
```
This stores credentials so `git push` works without passwords. (Alternative: create a Personal Access Token at github.com → Settings → Developer settings → Tokens, and use it as your password when Git prompts.)

### 4A.4 Step 3 — Create the repository (same-repo layout)

```bash
# Create the repo on GitHub and clone it locally, in one step:
gh repo create investment-model --private --clone
cd investment-model
```

Or manually: create a private repo named `investment-model` on github.com, then:
```bash
git clone https://github.com/YOUR_USERNAME/investment-model.git
cd investment-model
```

### 4A.5 Step 4 — Scaffold the Next.js app (in the repo root)

```bash
# From inside the investment-model folder.
# The "." installs into the current directory (the repo root).
npx create-next-app@latest . \
  --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"

# Install project dependencies
npm install drizzle-orm postgres @supabase/supabase-js recharts \
  lightweight-charts @tanstack/react-query zod date-fns
npm install -D drizzle-kit vitest @vitejs/plugin-react \
  @playwright/test tsx

# shadcn/ui component library
npx shadcn@latest init      # accept defaults
```

At this point `npm run dev` should serve the default Next.js page at `http://localhost:3000`.

### 4A.6 Step 5 — Set up the Python pipeline (same repo)

```bash
# Create the pipeline folder structure
mkdir -p pipeline/sources pipeline/.github/workflows

# Create a Python virtual environment INSIDE pipeline (keeps deps isolated)
cd pipeline
python3 -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
psycopg[binary]>=3.2
fredapi>=0.5.1
requests>=2.31
pytrends>=4.9.2
EOF

pip install -r requirements.txt
deactivate
cd ..
```

**Important:** the Python virtual environment (`pipeline/venv/`) must be git-ignored (see §4A.9). GitHub Actions creates its own environment from `requirements.txt`, so `venv/` is local-only.

### 4A.7 Step 6 — Create the Supabase database

1. Go to supabase.com → New Project → name it `investment-model` → choose a region → set a database password (save it).
2. Once provisioned, go to Project Settings → Database → **Connection string** → copy the URI (looks like `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`).
3. This is your `DATABASE_URL` for both the app and the Python pipeline.

Run the schema (from Section 6) via the Supabase SQL Editor, or via Drizzle migrations:
```bash
# After defining schema in /db/schema.ts:
npx drizzle-kit generate    # create migration files
npx drizzle-kit migrate     # apply to Supabase
```

### 4A.8 Step 7 — Get the API keys (all free)

| Key | Where to get it | Notes |
|---|---|---|
| `FRED_API_KEY` | fredaccount.stlouisfed.org/apikey | Free, instant, email verify |
| `TWELVEDATA_API_KEY` | twelvedata.com → sign up | Free tier 800 req/day |
| `FINNHUB_API_KEY` | finnhub.io → sign up | Free tier 60 calls/min (fallback) |
| `COINGECKO_API_KEY` | coingecko.com/api | Optional; free tier works without key at low volume |
| `NASDAQ_DATA_LINK_KEY` | data.nasdaq.com | For Shiller CAPE (Phase 3) |
| Supabase keys | Supabase → Settings → API | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Google Trends | pytrends needs no key | Sole method for Trends data; unmaintained, best-effort (§5.1a) |

### 4A.9 Step 8 — Environment variables and ignore files

Create `.env.local` in the repo root (for Next.js) — **never commit this**:
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRED_API_KEY=your_fred_key
TWELVEDATA_API_KEY=your_twelvedata_key
FINNHUB_API_KEY=your_finnhub_key
NASDAQ_DATA_LINK_KEY=your_nasdaq_key
CRON_SECRET=any_random_string
```

Create `pipeline/.env` for local Python runs (also never committed):
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
FRED_API_KEY=your_fred_key
TWELVEDATA_API_KEY=your_twelvedata_key
```

Add to `.gitignore` (create_next_app generates most of this; append the rest):
```
# Next.js
.next/
node_modules/
.env.local
.env*.local

# Python pipeline
pipeline/venv/
pipeline/__pycache__/
pipeline/**/__pycache__/
pipeline/.env
*.pyc
```

Create `.vercelignore` in the repo root so Vercel ignores the Python:
```
pipeline/
```

### 4A.10 Step 9 — Wire up GitHub Actions secrets

The Python pipeline runs on GitHub Actions and needs the secrets there (separate from your local `.env`):

1. GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
2. Add: `DATABASE_URL`, `FRED_API_KEY`, `TWELVEDATA_API_KEY` (and any others the pipeline uses).
3. These are encrypted; the workflow reads them at runtime. Never put keys in the YAML itself.

### 4A.11 Step 10 — Connect Vercel for deployment

```bash
npm install -g vercel
vercel login
vercel link          # link this folder to a Vercel project
```
Then in the Vercel dashboard → Project → Settings → Environment Variables, add the same keys from `.env.local` (except pipeline-only ones). Vercel auto-deploys on every push to `main`.

### 4A.12 Step 11 — Verify the full setup

Run this checklist before starting feature work:

```bash
# 1. App runs
npm run dev                          # → http://localhost:3000 loads

# 2. Database reachable
npx drizzle-kit studio               # → opens a DB browser, tables visible

# 3. Python pipeline runs locally
cd pipeline && source venv/bin/activate
python collect.py --mode daily       # → writes rows to raw_observations
deactivate && cd ..

# 4. Tests run
npm run test                         # → Vitest executes (even if 0 tests yet)

# 5. Git works
git add . && git commit -m "chore: initial setup" && git push
```

If all five pass, the environment is ready and Phase 1 feature work can begin.

### 4A.13 First-run order summary

```
Install tools (brew/node/python/git/gh)
   → Configure Git + GitHub auth
   → Create private repo (same-repo layout)
   → Scaffold Next.js app in repo root
   → Create pipeline/ folder + Python venv
   → Create Supabase project, copy DATABASE_URL, run schema
   → Collect all free API keys
   → Create .env.local + pipeline/.env + .gitignore + .vercelignore
   → Add GitHub Actions secrets
   → Link Vercel + add env vars
   → Run the 5-point verification
   → Begin Phase 1
```

---

## 5. Data Sources and API Integration

### 5.1 API selection (verified available, 2026)

The single most important sourcing decision: **FRED covers ~60% of all needed series and is free with a generous limit.** Everything else fills gaps.

| Data category | Primary API | Free tier | Fallback | Notes |
|---|---|---|---|---|
| **Economic (macro)** | FRED API | 1M req/day, free key | — | GDP, CPI, PCE, PPI, M2, TIPS, HY spreads, yield curve, Sahm Rule, unemployment, LEI |
| **Market prices (stocks/ETF/index)** | Twelve Data | 800 req/day | Finnhub (60/min) | S&P, Nasdaq, VIX, GLD, XLE, sector ETFs |
| **Gold / commodities** | Twelve Data or metals endpoint | 800 req/day | GoldAPI.io | XAU/USD, WTI, copper |
| **Crypto** | CoinGecko | ~30 req/min free | CoinMarketCap | BTC price, dominance, market cap |
| **FX / currencies** | exchangerate.host | generous free | Twelve Data FX | DXY proxy, USD/JPY, USD/VND, EUR/USD |
| **Treasury yields** | FRED (DGS2, DGS10, DGS30, DFII10) | free | Twelve Data | Full curve + TIPS real yield |
| **COT positioning** | CFTC Socrata Open Data API (publicdata.cftc.gov) | free, no key needed | CFTC weekly CSV | Gold, S&P, USD speculative positioning |
| **Valuation (CAPE, Buffett)** | Compute from FRED (WILL5000PR / GDP) + Nasdaq Data Link (Shiller) | free | multpl scrape | Buffett Indicator derivable; CAPE via Shiller dataset |
| **Sentiment — Fear/Greed** | CNN F&G (unofficial JSON endpoint) | free | scrape | Composite fear/greed |
| **Sentiment — crypto F&G** | alternative.me API | free | — | BTC-specific fear/greed |
| **Sentiment — AAII** | No free API | — | scrape aaii.com weekly | Bull/bear survey |
| **Sentiment — fund managers** | No API (BofA FMS) | — | manual monthly entry | Cash levels, positioning |
| **Google Trends (retail sentiment)** | pytrends library | free, no key | manual entry | pytrends is unmaintained + rate-limited; wrap best-effort with last-value fallback — see §5.1a |
| **Vietnam market** | No reliable free API | — | manual / vendor | VN-Index, SBV rate — later phase |

### 5.1a Google Trends via pytrends — specific handling

Retail-sentiment data (search interest for terms like "buy gold", "recession") is sourced through the **pytrends** library — the sole method used in this project. pytrends reads Google Trends' internal endpoints and returns interest-over-time scored 0–100 against the peak in the chosen range.

**Known constraints and how they're handled:**
- pytrends is unmaintained (archived April 2025) and can throw rate-limit (429) errors. Mitigate by running it on the **weekly** cadence only — low volume keeps 429s rare.
- Wrap every call in try/except with a **last-known-value fallback**. A failed pull never blocks a model run.
- Trends is a single, **down-weighted** input in the sentiment composite. If it's stale, the composite down-weights it automatically.
- If pytrends breaks entirely at some point, the fallback is manual entry via the Data Status page — no other integration is required.

`sources/trends.py` implements this: pull interest-over-time for the configured keyword list, upsert to `raw_observations`, catch and log any failure without raising.

### 5.2 Handling the gaps

Not everything has an API. The system must gracefully mix automated and manual data:

- Every indicator has a `source_type`: `api` | `derived` | `manual` | `scraped`.
- Manual indicators surface in a **"Data to update"** panel with the last-updated date and a staleness warning.
- Scraped indicators run on a best-effort basis with a fallback to the last known value plus a staleness flag.
- The model must degrade gracefully: if a sentiment indicator is stale, it is down-weighted, not silently treated as current.

### 5.3 Ingestion cadence

| Cadence | Series | Trigger |
|---|---|---|
| Daily (weekdays) | Prices (Twelve Data), VIX, DXY (exchangerate.host), yields + TIPS + HY spreads (FRED), crypto (CoinGecko) | Cron 22:00 UTC (after US close) |
| Weekly (Friday) | CFTC COT, AAII, jobless claims, Fed balance sheet | Cron Sat 04:00 UTC |
| Monthly | NFP, CPI, PCE, PPI, M2, ISM, LEI, FOMC | Cron 1st Sat, or event-driven after release |
| Quarterly | GDP, CAPE, Buffett Indicator, 13F | Manual review + scheduled fetch |

### 5.4 Rate-limit and reliability strategy

- Wrap every external call in a retry-with-backoff helper.
- Cache API responses in Redis with a TTL matching the data cadence (daily data cached 12h, monthly cached 20 days).
- Batch FRED requests; never exceed 1 req/sec even though the limit is higher.
- Store every raw response verbatim in `raw_observations` before any transformation, so re-processing never needs a re-fetch.
- A daily health check writes to `ingestion_log`; a failed critical series raises an alert.

---

## 5A. The Python Data Pipeline (Build Deliverable)

This section specifies the Python ingestion pipeline as an explicit build item — not an afterthought. It is the backbone of Option A. An initial version already exists (`layer1/main.py` collecting to SQLite); this section defines what it must become.

### 5A.1 Responsibilities

The Python pipeline owns **data collection and raw storage only.** It does *not* compute the analytical models (those live in TypeScript in the app). Specifically it:

1. Fetches each indicator from its API (FRED, Twelve Data, CoinGecko, CFTC Socrata, exchangerate.host, pytrends best-effort).
2. Writes every raw value to the Postgres `raw_observations` table, including the verbatim API payload in `raw_payload`.
3. Records success/failure per series in `ingestion_log`.
4. Never transforms or interprets — that is the app's job. (The existing script computes Z-scores; in the new architecture that logic moves to TypeScript so there is one source of truth for model math. The Python script is simplified to pure collection.)

### 5A.2 Migration from the existing script

| Existing (`layer1/main.py`) | New pipeline |
|---|---|
| Writes to local SQLite | Writes to Supabase Postgres (`psycopg` or `supabase-py`) |
| Computes signals in Python | **Remove** — signals move to TS `/lib/model/signals.ts` |
| yfinance for prices | Replace with Twelve Data / Finnhub API (yfinance unreliable per §5.1) |
| Runs on local machine | Runs on GitHub Actions (existing `.yml` adapted) |
| Outputs JSON + CSV | Outputs to Postgres; JSON/CSV optional for debugging |

Keep the modular collector structure (one function per source) — that design is sound and carries over directly.

### 5A.3 Pipeline structure

```
pipeline/
  collect.py            # entry point: python collect.py --mode daily|weekly|monthly|full
  db.py                 # Postgres connection + upsert to raw_observations
  sources/
    fred.py             # FRED API client
    prices.py           # Twelve Data / Finnhub (gold, BTC, S&P, VIX, DXY, ETFs)
    crypto.py           # CoinGecko (BTC dominance, mcap)
    cftc.py             # CFTC Socrata Open Data API (COT positioning)
    fx.py               # exchangerate.host (DXY proxy, USD/JPY, USD/VND)
    trends.py           # pytrends best-effort (weekly, low-volume)
  config.py             # indicator → source mapping, API keys from env
  requirements.txt
  .github/workflows/
    ingest.yml          # cron schedule → runs collect.py → writes to Postgres
```

### 5A.4 Writing to Postgres (core pattern)

```python
# db.py
import os, psycopg
from datetime import date

def upsert_observation(indicator_id: str, obs_date: date,
                       value: float, raw_payload: dict, source_type: str):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute("""
            INSERT INTO raw_observations
              (indicator_id, obs_date, value, raw_payload, source_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (indicator_id, obs_date)
            DO UPDATE SET value = EXCLUDED.value,
                          raw_payload = EXCLUDED.raw_payload,
                          fetched_at = now()
        """, (indicator_id, obs_date, value, psycopg.types.json.Json(raw_payload), source_type))

def log_ingestion(source: str, ok: int, err: int, notes: str = ""):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute(
            "INSERT INTO ingestion_log (source, series_ok, series_err, notes) VALUES (%s,%s,%s,%s)",
            (source, ok, err, notes))
```

### 5A.5 GitHub Actions schedule (adapted)

```yaml
# .github/workflows/ingest.yml
name: Data Pipeline
on:
  schedule:
    - cron: '0 22 * * 1-5'   # daily prices, after US close
    - cron: '0 4 * * 6'      # weekly COT + sentiment (Sat)
    - cron: '0 6 1-7 * 6'    # monthly full (1st Sat)
  workflow_dispatch:
    inputs: { mode: { type: choice, options: [daily, weekly, monthly, full] } }
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12', cache: pip }
      - run: pip install -r pipeline/requirements.txt
      - run: python pipeline/collect.py --mode ${{ github.event.inputs.mode || 'daily' }}
        env:
          DATABASE_URL:      ${{ secrets.DATABASE_URL }}
          FRED_API_KEY:      ${{ secrets.FRED_API_KEY }}
          TWELVEDATA_API_KEY: ${{ secrets.TWELVEDATA_API_KEY }}
```

Note: GitHub Actions writes directly to Supabase Postgres over the connection string — no server needed. Add the secrets in the repo's Settings → Secrets.

### 5A.6 Requirements (pipeline only)

```
psycopg[binary]>=3.2      # Postgres writes
fredapi>=0.5.1            # FRED
requests>=2.31            # Twelve Data, CFTC, exchangerate.host, CoinGecko
pytrends>=4.9.2           # best-effort Google Trends (unmaintained; wrap in try/except)
```

Note the pipeline no longer needs pandas/numpy (signal math moved to TS), so it is lighter than the original `layer1/main.py`.

---

## 6. Data Model (Database Schema)

### 6.1 Core tables (Drizzle / SQL)

```sql
-- Master list of every indicator the system tracks
CREATE TABLE indicators (
  id            TEXT PRIMARY KEY,          -- e.g. 'FRED_CPIAUCSL'
  name          TEXT NOT NULL,             -- 'CPI YoY %'
  category      TEXT NOT NULL,             -- growth|inflation|monetary|market|sentiment|valuation
  source_type   TEXT NOT NULL,             -- api|derived|manual|scraped
  source_id     TEXT,                      -- FRED series id, ticker, etc.
  frequency     TEXT NOT NULL,             -- daily|weekly|monthly|quarterly
  higher_better BOOLEAN,                   -- true|false|null (for signal direction)
  unit          TEXT,                      -- %, bps, USD, index
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Every raw data point ever collected (append-only, immutable)
CREATE TABLE raw_observations (
  id            BIGSERIAL PRIMARY KEY,
  indicator_id  TEXT REFERENCES indicators(id),
  obs_date      DATE NOT NULL,             -- the date the value is for
  value         DOUBLE PRECISION,
  raw_payload   JSONB,                     -- verbatim API response for audit
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  source_type   TEXT,
  UNIQUE(indicator_id, obs_date)
);

-- Computed signals (Layer 2) — recomputable from raw_observations
CREATE TABLE signals (
  id            BIGSERIAL PRIMARY KEY,
  indicator_id  TEXT REFERENCES indicators(id),
  as_of         DATE NOT NULL,
  latest        DOUBLE PRECISION,
  z_score       DOUBLE PRECISION,
  pct_rank      DOUBLE PRECISION,          -- 0..1
  mom_1m        DOUBLE PRECISION,
  mom_3m        DOUBLE PRECISION,
  mom_12m       DOUBLE PRECISION,
  signal        INT,                       -- -1 | 0 | +1
  signal_label  TEXT,                      -- BULLISH|NEUTRAL|BEARISH
  model_version TEXT,                      -- which code version produced this
  computed_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, as_of, model_version)
);

-- A full model run (Layers 3-5 output snapshot)
CREATE TABLE model_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of         DATE NOT NULL,
  model_version TEXT NOT NULL,
  regime        TEXT,                      -- STAGFLATION|RECESSION|...
  regime_conf   DOUBLE PRECISION,
  clock_pos     TEXT,                      -- '7-8 o'clock'
  sentiment_score DOUBLE PRECISION,        -- gold composite etc.
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Scenario probabilities per run
CREATE TABLE scenarios (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID REFERENCES model_runs(id),
  code          TEXT,                      -- A|B|C|D|E
  name          TEXT,
  probability   DOUBLE PRECISION,          -- 0..1
  triggers_met  JSONB,                     -- which conditions were true
  asset_returns JSONB                      -- expected return per asset
);

-- Conviction score per asset per run (Layer 4)
CREATE TABLE conviction_scores (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID REFERENCES model_runs(id),
  asset         TEXT,                      -- gold|btc|usd_tbills|...
  valuation     DOUBLE PRECISION,          -- model sub-scores
  momentum      DOUBLE PRECISION,
  sentiment     DOUBLE PRECISION,
  regime_fit    DOUBLE PRECISION,
  scenario_ev   DOUBLE PRECISION,
  conviction    DOUBLE PRECISION,          -- -1..+1 final
  action        TEXT                       -- ACCUMULATE|HOLD|AVOID
);

-- Portfolio allocation per run (Layer 5)
CREATE TABLE allocations (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID REFERENCES model_runs(id),
  asset         TEXT,
  target_weight DOUBLE PRECISION,          -- 0..1
  rationale     TEXT
);

-- Generated written briefs
CREATE TABLE briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID REFERENCES model_runs(id),
  as_of         DATE,
  markdown      TEXT,                      -- the full brief
  summary       TEXT,                      -- one-line
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Alerts / model-change triggers
CREATE TABLE alerts (
  id            BIGSERIAL PRIMARY KEY,
  rule_id       TEXT,
  as_of         DATE,
  severity      TEXT,                      -- info|warn|critical
  title         TEXT,
  detail        TEXT,
  acknowledged  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Pipeline run health (written by the Python pipeline)
CREATE TABLE ingestion_log (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT,                      -- fred|prices|cftc|trends...
  series_ok     INT DEFAULT 0,
  series_err    INT DEFAULT 0,
  notes         TEXT,
  run_at        TIMESTAMPTZ DEFAULT now()
);

-- Manual data entry + assumptions
CREATE TABLE manual_inputs (
  id            BIGSERIAL PRIMARY KEY,
  indicator_id  TEXT REFERENCES indicators(id),
  obs_date      DATE,
  value         DOUBLE PRECISION,
  entered_by    TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Key schema decisions

- **`raw_observations` is append-only and immutable.** It is the source of truth. Everything else is derived and can be dropped and recomputed.
- **`model_version` on signals and runs** enables A/B comparison of model logic and full historical recompute when the framework changes.
- **`raw_payload JSONB`** stores the verbatim API response so an audit or a bug fix never requires re-fetching historical data.
- **Scenario `asset_returns` and `triggers_met` as JSONB** keeps the schema flexible as scenarios evolve.

---

## 7. The Computation Engine (How Insights Are Calculated)

This is the heart of the product. All logic lives in `/lib/model/` as pure functions with no side effects, fully unit-tested.

### 7.1 Layer 2 — Signal processing

For each indicator, given its historical series:

```typescript
interface Signal {
  latest: number;
  zScore: number;        // (latest - mean) / stdDev
  pctRank: number;       // rank of latest within history, 0..1
  mom1m: number;         // % change vs 1 period ago
  mom3m: number;
  mom12m: number;
  signal: -1 | 0 | 1;
  signalLabel: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

function computeSignal(series: number[], higherIsBetter: boolean | null): Signal {
  const latest = series.at(-1)!;
  const mean = avg(series);
  const sd = stdDev(series);
  const z = sd > 0 ? (latest - mean) / sd : 0;
  const pctRank = percentileRank(series, latest);

  let signal: -1 | 0 | 1 = 0;
  if (higherIsBetter === true)  signal = z > 0.5 ? 1 : z < -0.5 ? -1 : 0;
  if (higherIsBetter === false) signal = z > 0.5 ? -1 : z < -0.5 ? 1 : 0;
  // null => neutral direction (e.g. Fed funds rate)

  return { latest, zScore: z, pctRank, /* momenta */, signal, signalLabel: label(signal) };
}
```

**Threshold rationale:** ±0.5 standard deviations is the boundary between "meaningfully elevated/depressed" and "within normal range." This is tunable per indicator via config.

### 7.2 Layer 3 — Model 1: Macro Regime (Investment Clock)

A 2×2 matrix of GDP direction × inflation direction:

```typescript
function classifyRegime(gdpSignal: number, inflationSignal: number) {
  const inflationRising = -inflationSignal; // inflation "bearish for bonds" = rising
  const map = {
    '1,1':   { regime: 'RECOVERY',    best: ['Bonds','Equities'] },
    '1,-1':  { regime: 'EXPANSION',   best: ['Equities','Commodities'] },
    '-1,1':  { regime: 'RECESSION',   best: ['Long Bonds','Gold'] },
    '-1,-1': { regime: 'STAGFLATION', best: ['Gold','Cash','Energy'] },
    // ...transition states for 0 values
  };
  return map[`${gdpSignal},${inflationRising}`];
}
```

Confidence = how strongly the underlying GDP and inflation signals point in one direction (magnitude of their combined Z-scores).

### 7.3 Layer 3 — Model 2: Valuation

Each valuation metric is percentile-ranked against its own history, then inverted where "low = cheap" (P/E, CAPE, Buffett Indicator). The composite is the average percentile. Output is a 1–10 score per asset where 10 = cheapest.

Key metrics: Buffett Indicator (Wilshire 5000 / GDP), Shiller CAPE, Fed Model (earnings yield vs 10Y), real rates for gold, Dow/Gold ratio, MVRV for BTC.

### 7.4 Layer 3 — Model 3: Sentiment Composite

Each sentiment input scored −1 (extreme greed) / 0 / +1 (extreme fear), then weighted-summed into a −11..+11 composite (contrarian: positive = accumulate). Weights are config-driven; COT positioning and central-bank flows carry the highest weight.

### 7.5 Layer 3 — Model 4: Technical Momentum

Price vs 20/50/100/200-day SMAs, RSI(14), volume trend → a −2..+2 momentum score per asset. Above 200-day = +1; oversold RSI < 30 = +0.5 (contrarian); etc.

### 7.6 Layer 3 — Model 5: Scenario Probability

Each scenario has a set of measurable trigger conditions. The engine checks how many are currently true, converts trigger-satisfaction into a probability, and normalizes across scenarios to sum to 100%.

```typescript
interface Scenario {
  code: string;
  triggers: Array<{ test: (s: SignalSet) => boolean; weight: number }>;
  assetReturns: Record<string, number>; // expected 12-18mo return per asset
}

function scenarioProbabilities(scenarios: Scenario[], signals: SignalSet) {
  const raw = scenarios.map(s => ({
    code: s.code,
    score: s.triggers.reduce((sum, t) => sum + (t.test(signals) ? t.weight : 0), 0)
  }));
  const total = sum(raw.map(r => r.score));
  return raw.map(r => ({ code: r.code, probability: r.score / total }));
}
```

Expected value per asset = Σ(probability × assetReturn in that scenario).

### 7.7 Layer 4 — Conviction Synthesis

The five model outputs combine into one conviction score per asset:

```typescript
const WEIGHTS = {
  regimeFit:  0.30,   // adjustable; regime dominates in transitions
  valuation:  0.20,
  sentiment:  0.20,
  momentum:   0.15,
  scenarioEv: 0.15,
};

function conviction(asset: string, models: ModelOutputs): number {
  const raw =
    models.regimeFit[asset]  * WEIGHTS.regimeFit +
    models.valuation[asset]  * WEIGHTS.valuation +
    models.sentiment[asset]  * WEIGHTS.sentiment +
    models.momentum[asset]   * WEIGHTS.momentum +
    models.scenarioEv[asset] * WEIGHTS.scenarioEv;
  return clamp(raw, -1, 1);
}
```

Action mapping: `> 0.6` ACCUMULATE · `0.2..0.6` LEAN BUY · `-0.2..0.2` HOLD · `-0.6..-0.2` LEAN REDUCE · `< -0.6` AVOID.

**The weights are user-configurable in Settings** and every change triggers a full historical recompute so the user can see how the model would have behaved under different weightings.

### 7.8 Layer 5 — Portfolio Construction

Positive-conviction assets receive weight proportional to their conviction, subject to constraints (max single asset, min cash, forbidden instruments). Output is a target allocation plus a plain-language rationale per asset.

### 7.9 Brief generation

The written brief is assembled from the computed outputs via a template engine. Two modes:

1. **Deterministic template** (v1): fills a structured markdown template from the numbers. Fast, free, fully predictable.
2. **LLM-narrated** (later phase): passes the structured outputs to an LLM with a strict prompt to produce prose, with the deterministic version as ground truth to prevent hallucination. The LLM never invents numbers; it only phrases the computed results.

---

## 8. Feature Specification (Pages and Components)

### 8.1 Page map

| Route | Page | Purpose | Persona |
|---|---|---|---|
| `/` | **Dashboard** | The one-screen Brief + regime + top actions | Operator, Observer |
| `/regime` | **Macro Regime** | Investment Clock, GDP×inflation, cycle history | Analyst |
| `/indicators` | **Indicators Explorer** | All ~30 series, charts, Z-scores, filters | Analyst |
| `/sentiment` | **Sentiment** | Fear/greed, COT, positioning, composite | Analyst |
| `/valuation` | **Valuation** | Buffett, CAPE, real rates, per-asset scores | Analyst |
| `/scenarios` | **Scenarios** | 5 scenarios, probabilities, triggers, E[return] | Analyst, Operator |
| `/conviction` | **Conviction** | Asset scorecard, framework convergence grid | Operator, Analyst |
| `/portfolio` | **Portfolio** | Target allocation, deployment plan, drift | Operator |
| `/alerts` | **Alerts / Watch** | Fired triggers, upcoming events, acknowledgment | Operator |
| `/briefs` | **Brief Archive** | Every past brief, searchable | All |
| `/data` | **Data Status** | Freshness, manual entry, ingestion health | Analyst |
| `/settings` | **Settings** | Model weights, thresholds, constraints, API keys | Operator |

### 8.2 Dashboard (the hero screen)

The Operator must be able to glance and decide. Layout, top to bottom:

1. **Header strip:** live prices (gold, BTC, S&P, VIX, DXY, 10Y) with 1-day change.
2. **Regime banner:** one word (STAGFLATION), Investment Clock mini-visual, one-sentence description, confidence.
3. **Conviction row:** horizontal scorecard of top assets with color-coded conviction and action.
4. **Scenario strip:** the 5 probabilities as a stacked bar with E[gold] and E[return] callouts.
5. **This month's action:** the deployment table (asset, amount/weight, trigger rule).
6. **Alerts:** any fired model-change triggers, prominently.
7. **One-click "Generate Brief"** → full written brief modal/route.

Every element links to its detail page. Nothing on the dashboard is un-drillable.

### 8.3 Indicators Explorer

- Filterable table (by category, signal, staleness).
- Click a row → time-series chart with the mean band, ±0.5σ bands, and current position marked.
- Each indicator shows: latest, Z-score, percentile, momentum, signal, last-updated, source badge.
- Stale indicators visibly flagged.

### 8.4 Scenarios page

- Five expandable scenario cards, each showing: probability (with month-over-month delta), which triggers are currently met (checklist), expected asset returns, and the recommended posture.
- A probability-weighted expected-value summary for each asset.
- History chart: how each scenario's probability has moved over time.

### 8.5 Conviction page

- The framework convergence grid: assets × models, color-coded, with a composite conviction bar per asset.
- Click any cell → why that model scored that asset that way, with the underlying signals.
- "What-if" panel: adjust model weights with sliders and watch conviction recompute live.

### 8.6 Portfolio page

- Current target allocation (donut + table).
- Deployment plan (if the user supplies a monthly investable amount — stored locally/privately, never required).
- Allocation drift vs target (if the user tracks actual holdings — optional, private).
- Rebalancing suggestions when drift exceeds threshold.

### 8.7 Alerts

Rule-based triggers, e.g.:
- Gold closes above 50-day SMA on rising volume → "momentum turning" alert.
- TIPS real yield crosses below 1.5% → "gold headwind easing."
- Sahm Rule crosses 0.5 → "recession signal."
- HY spreads above 600bps → "credit stress."
- Any scenario probability shifts more than 10 points month-over-month.

Alerts appear in-app and (later phase) via email/push.

---

## 9. Insights: What the App Tells the User and How

The product's value is not raw data — it is **synthesized, explainable judgment.** Concretely, the app delivers:

1. **The regime call.** "We are in late-stage stagflation (7–8 o'clock)." Backed by GDP slowing + inflation sticky, with the exact indicators shown.
2. **What wins in this regime.** A ranked asset list with conviction scores and the reasoning path.
3. **What the crowd is doing.** Sentiment composite showing whether fear or greed dominates — the contrarian lens.
4. **What could go wrong.** Scenario probabilities with explicit triggers to watch.
5. **The probability-weighted outlook.** E[return] per asset across all scenarios, not a single point forecast.
6. **The specific action.** A target allocation and, optionally, a monthly deployment plan.
7. **The change triggers.** The precise, measurable conditions that would flip the recommendation — so the user knows what to watch and the model stays honest.

Every insight carries a **confidence level** and a **"why" trail**. The app never says "buy gold" — it says "5 of 6 frameworks favor gold; conviction +0.55; the dissent is momentum; here is the data."

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Dashboard first contentful paint | < 1.5s (SSR + cached model run) |
| Full model recompute (all layers) | < 3s server-side |
| Data freshness (daily series) | Within 12h of source release |
| Uptime | 99% (Vercel + Supabase SLAs) |
| Test coverage of `/lib/model` | > 90% (this is load-bearing logic) |
| Security | API keys server-only; RLS on all tables; no secrets in client bundle |
| Accessibility | WCAG 2.1 AA on all pages |
| Auditability | Every recommendation traceable to raw data + model version |
| Cost at single-user scale | < $10/month (mostly free tiers) |

### 10.1 Compliance and disclaimers

- A persistent disclaimer: research/educational tool, not financial advice, not a licensed advisor.
- No storage of brokerage credentials.
- If the app is ever shared with others, add terms of use and clarify no fiduciary relationship.

---

## 11. Implementation Plan (Phased)

The guiding principle: **each phase ends with something usable.** No phase is pure plumbing.

### Phase 0 — Foundation (week 1)
- **Complete all of Section 4A (Environment Setup)** — tools, repo, Next.js scaffold, Python venv, Supabase, API keys, env files, GitHub secrets, Vercel link, verification checklist.
- Drizzle schema + migrations for all core tables (Section 6).
- Single magic-link login (no RLS — single user).
- CI on GitHub Actions (lint, typecheck, Vitest).
- Seed `indicators` table with the full indicator catalog (Appendix 13.1).
- **Deliverable:** deployed empty app with auth, schema, and a verified local + CI environment.

### Phase 1 — Python pipeline + Data layer + Indicators (weeks 2–4)
This phase has two tracks that can run in parallel.

**Track 1 — Python pipeline (per Section 5A):**
- Adapt existing `layer1/main.py` into the `pipeline/` structure; strip signal math (moves to TS).
- FRED collector; Twelve Data/Finnhub prices; CoinGecko crypto; CFTC Socrata COT; exchangerate.host FX; pytrends best-effort.
- `db.py` upserts to `raw_observations`; `ingestion_log` written per run.
- GitHub Actions `ingest.yml` with daily/weekly/monthly cron + secrets configured.
- **Deliverable A:** raw data flowing into Postgres automatically on schedule.

**Track 2 — App data layer + Indicators UI:**
- Layer 2 signal computation in TypeScript (`/lib/model/signals.ts`), unit-tested — this is where the Python signal logic is reimplemented as the single source of truth.
- **Indicators Explorer page** live with charts and ±0.5σ Z-score bands.
- Data Status page with freshness indicators + manual-entry flow.
- **Deliverable B:** a working data dashboard showing all live indicators with computed signals.

### Phase 2 — Macro Regime (week 4)
- Model 1 (regime classifier) in TS, unit-tested.
- Regime page with Investment Clock visual + GDP×inflation matrix + history.
- Regime banner on a first version of the Dashboard.
- **Deliverable:** the app now states the macro regime with reasoning.

### Phase 3 — Valuation + Sentiment (weeks 5–6)
- Models 2 and 3 (valuation scoring, sentiment composite).
- Buffett Indicator derived from FRED; CAPE via Nasdaq Data Link; CNN + alternative.me fear/greed.
- Valuation page + Sentiment page.
- Manual-input flow for AAII / BofA FMS gaps.
- **Deliverable:** valuation and sentiment lenses fully live.

### Phase 4 — Scenarios + Conviction (weeks 7–8)
- Model 5 (scenario probabilities) with configurable triggers.
- Model 4 (conviction synthesis) with configurable weights.
- Scenarios page + Conviction page (convergence grid + what-if sliders).
- `model_runs`, `scenarios`, `conviction_scores` persisted per run.
- **Deliverable:** the analytical core is complete; conviction scores drive everything.

### Phase 5 — Portfolio + Brief (weeks 9–10)
- Layer 5 portfolio construction with constraints.
- Portfolio page (allocation, optional drift tracking).
- Deterministic Brief generator + Brief Archive.
- Full Dashboard assembled (regime + conviction + scenarios + action + alerts).
- **Deliverable:** end-to-end — the app produces a complete monthly Investment Brief.

### Phase 6 — Alerts, automation, hardening (weeks 11–12)
- Alert rule engine + Alerts page + email notifications (Resend).
- Migrate ingestion fully to Vercel Cron (Option B) if desired.
- Redis caching, retry/backoff hardening, Sentry.
- Backfill historical data for backtest readiness.
- **Deliverable:** hands-off automated system with alerting.

### Phase 7 — Advanced (post-launch, optional)
- **Backtesting:** replay any model version over history; compare weightings.
- **LLM-narrated briefs:** prose generation grounded in deterministic outputs.
- **Vietnam module:** VN-Index, SBV rate, SJC gold, FTSE tracking (mostly manual/vendor data).
- **Multi-user:** RLS-based tenancy, shared vs private model configs.
- **Mobile PWA / push notifications.**
- **Scenario editor UI:** define new scenarios and triggers without code.

### 11.1 Rough sequencing summary

```
Phase 0  ██                      Foundation (lighter — no RLS, single user)
Phase 1  ██████                  Python pipeline + Data + Indicators  ← first real value
Phase 2  ██                      Regime
Phase 3  ████                    Valuation + Sentiment
Phase 4  ████                    Scenarios + Conviction
Phase 5  ████                    Portfolio + Brief    ← full model live
Phase 6  ████                    Alerts + hardening
Phase 7  ░░░░░░                  Advanced (ongoing)
```

MVP = Phases 0–5 (~11 weeks solo, faster with help; Phase 1 is slightly longer because it includes the pipeline build). The app is genuinely useful from the end of Phase 1 and delivers its core promise at the end of Phase 5. Because ingestion is Python-on-GitHub-Actions (Option A), there is no server to run or pay for — the pipeline writes straight to Postgres on a schedule.

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Free API rate limits / shutdowns | Data gaps | Multi-provider fallback per category; cache aggressively; store raw verbatim |
| Sentiment data has no APIs (AAII, FMS) | Incomplete model | Manual-input flow + down-weight stale inputs; scrape best-effort |
| Model logic churn | Rework | Keep logic pure/versioned; config-drive weights and thresholds |
| Over-fitting the model to recent regime | Bad calls | Backtest across historical regimes (Phase 7); keep thresholds conservative |
| User treats output as certainty | Financial harm | Confidence levels everywhere; mandatory disclaimers; show the dissent |
| Vietnam data unavailable via API | Feature gap | Isolate to Phase 7; manual entry acceptable there |
| Scope creep | Never ships | Strict phase gates; each phase must deploy something usable |

---

## 13. Appendix

### 13.1 Indicator catalog (seed data for `indicators` table)

**Growth:** Real GDP (GDPC1), Nonfarm Payrolls (PAYEMS), Unemployment (UNRATE), Sahm Rule (SAHMREALTIME), Yield Curve 2Y-10Y (T10Y2Y), ISM Manufacturing PMI, ISM Services PMI, Conference Board LEI, HY Credit Spreads (BAMLH0A0HYM2), Copper/Gold ratio (derived).

**Inflation:** CPI (CPIAUCSL), Core PCE (PCEPILFE), PPI, TIPS 10Y Real Yield (DFII10), 5Y Breakeven (T5YIE), UMich inflation expectations.

**Monetary:** Fed Funds (FEDFUNDS), M2 (M2SL), Fed Balance Sheet (WALCL), CME FedWatch hike probability (scraped/manual).

**Market:** Gold XAU/USD, BTC, S&P 500, Nasdaq, VIX, DXY, WTI, 2Y/10Y/30Y Treasuries, GLD, XLE.

**Valuation:** Buffett Indicator (derived: WILL5000PR/GDP), Shiller CAPE (Nasdaq Data Link), Fed Model (derived), Dow/Gold (derived), BTC MVRV (Glassnode/manual).

**Sentiment:** CNN Fear & Greed, crypto Fear & Greed (alternative.me), AAII bull-bear (scrape/manual), BofA FMS cash level (manual), COT gold net spec (CFTC Socrata), GLD ETF flows.

### 13.2 Directory structure (Next.js)

```
/app
  /(dashboard)/page.tsx        # Dashboard
  /regime/page.tsx
  /indicators/page.tsx
  /sentiment/page.tsx
  /valuation/page.tsx
  /scenarios/page.tsx
  /conviction/page.tsx
  /portfolio/page.tsx
  /alerts/page.tsx
  /briefs/[id]/page.tsx
  /data/page.tsx
  /settings/page.tsx
  /api
    /ingest/[source]/route.ts  # cron-triggered ingestion (Option B)
    /model/run/route.ts        # trigger a model run
    /cron/route.ts             # Vercel cron entry
/lib
  /model                       # PURE, TESTED logic
    signals.ts                 # Layer 2
    regime.ts                  # Model 1
    valuation.ts               # Model 2
    sentiment.ts               # Model 3
    momentum.ts                # Model 4
    scenarios.ts               # Model 5
    conviction.ts              # Layer 4
    portfolio.ts               # Layer 5
    brief.ts                   # brief generator
    config.ts                  # weights, thresholds, scenario defs
  /data
    fred.ts                    # API clients
    twelvedata.ts
    coingecko.ts
    cftc.ts
    db.ts                      # Drizzle client
/db
  schema.ts                    # Drizzle schema
  migrations/
/components
  charts/                      # Recharts + Lightweight wrappers
  ui/                          # shadcn/ui
/tests
  model/                       # Vitest unit tests for every model fn
/pipeline                      # ← Python ingestion (Option A, runs on GitHub Actions)
  collect.py                   # entry point
  db.py                        # Postgres upserts
  sources/                     # fred.py, prices.py, crypto.py, cftc.py, fx.py, trends.py
  config.py
  requirements.txt
  .github/workflows/ingest.yml
```

Note: the Python `pipeline/` can live in the same repo as the Next.js app (a `/pipeline` folder) or a separate repo. Same-repo is simpler for a single user — GitHub Actions runs the Python, Vercel deploys the app, both from one place.

### 13.3 Environment variables

Full setup instructions are in **Section 4A.9**. Summary:

```
# App (.env.local — repo root, git-ignored)
DATABASE_URL=              # Supabase Postgres connection string
NEXT_PUBLIC_SUPABASE_URL=  # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role (server-only)
FRED_API_KEY=
TWELVEDATA_API_KEY=
FINNHUB_API_KEY=           # fallback price source
NASDAQ_DATA_LINK_KEY=      # Shiller CAPE (Phase 3)
CRON_SECRET=               # protect any cron routes

# Pipeline (pipeline/.env — git-ignored; same keys mirrored to GitHub Actions secrets)
DATABASE_URL=
FRED_API_KEY=
TWELVEDATA_API_KEY=
# pytrends + CoinGecko need no key at low volume
```

### 13.4 Model versioning convention

`model_version` is a semver-like string, e.g. `1.3.0`. Bump the minor version when weights/thresholds change, the major version when a model's structure changes. Every `signals`, `model_runs`, and downstream row records the version that produced it, so the entire history can be recomputed and compared across versions.

---

*End of PRD v1.0. This document is the build contract; treat the phase gates as firm and keep the model logic pure, versioned, and tested.*
