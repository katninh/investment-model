import { db } from './index';
import { indicators } from './schema';

type Row = typeof indicators.$inferInsert;

// Indicator catalog — PRD §13.1. source_type: api|derived|manual|scraped.
const rows: Row[] = [
  // ── Growth ──────────────────────────────────────────────────────────
  { id: 'FRED_GDPC1',        name: 'Real GDP',                 category: 'growth', sourceType: 'api',     sourceId: 'GDPC1',        frequency: 'quarterly', higherBetter: true,  unit: 'USD bn' },
  { id: 'FRED_PAYEMS',       name: 'Nonfarm Payrolls',         category: 'growth', sourceType: 'api',     sourceId: 'PAYEMS',       frequency: 'monthly',   higherBetter: true,  unit: 'thousands' },
  { id: 'FRED_UNRATE',       name: 'Unemployment Rate',        category: 'growth', sourceType: 'api',     sourceId: 'UNRATE',       frequency: 'monthly',   higherBetter: false, unit: '%' },
  { id: 'FRED_SAHMREALTIME', name: 'Sahm Rule (real-time)',    category: 'growth', sourceType: 'api',     sourceId: 'SAHMREALTIME', frequency: 'monthly',   higherBetter: false, unit: 'ppt' },
  { id: 'FRED_T10Y2Y',       name: 'Yield Curve 2Y-10Y',       category: 'growth', sourceType: 'api',     sourceId: 'T10Y2Y',       frequency: 'daily',     higherBetter: true,  unit: '%' },
  { id: 'ISM_MFG',           name: 'ISM Manufacturing PMI',    category: 'growth', sourceType: 'manual',  sourceId: null,           frequency: 'monthly',   higherBetter: true,  unit: 'index' },
  { id: 'ISM_SVC',           name: 'ISM Services PMI',         category: 'growth', sourceType: 'manual',  sourceId: null,           frequency: 'monthly',   higherBetter: true,  unit: 'index' },
  { id: 'CB_LEI',            name: 'Conference Board LEI',     category: 'growth', sourceType: 'manual',  sourceId: null,           frequency: 'monthly',   higherBetter: true,  unit: 'index' },
  { id: 'FRED_BAMLH0A0HYM2', name: 'HY Credit Spreads',        category: 'growth', sourceType: 'api',     sourceId: 'BAMLH0A0HYM2', frequency: 'daily',     higherBetter: false, unit: '%' },
  { id: 'DERIV_COPPER_GOLD', name: 'Copper/Gold Ratio',        category: 'growth', sourceType: 'derived', sourceId: null,           frequency: 'daily',     higherBetter: true,  unit: 'ratio' },

  // ── Inflation ───────────────────────────────────────────────────────
  { id: 'FRED_CPIAUCSL',     name: 'CPI',                      category: 'inflation', sourceType: 'api', sourceId: 'CPIAUCSL',     frequency: 'monthly',   higherBetter: false, unit: 'index' },
  { id: 'FRED_PCEPILFE',     name: 'Core PCE',                 category: 'inflation', sourceType: 'api', sourceId: 'PCEPILFE',     frequency: 'monthly',   higherBetter: false, unit: 'index' },
  { id: 'FRED_PPIACO',       name: 'PPI (All Commodities)',    category: 'inflation', sourceType: 'api', sourceId: 'PPIACO',       frequency: 'monthly',   higherBetter: false, unit: 'index' },
  { id: 'FRED_DFII10',       name: 'TIPS 10Y Real Yield',      category: 'inflation', sourceType: 'api', sourceId: 'DFII10',       frequency: 'daily',     higherBetter: null,  unit: '%' },
  { id: 'FRED_T5YIE',        name: '5Y Breakeven Inflation',   category: 'inflation', sourceType: 'api', sourceId: 'T5YIE',        frequency: 'daily',     higherBetter: false, unit: '%' },
  { id: 'FRED_MICH',         name: 'UMich Inflation Expect.',  category: 'inflation', sourceType: 'api', sourceId: 'MICH',         frequency: 'monthly',   higherBetter: false, unit: '%' },

  // ── Monetary ────────────────────────────────────────────────────────
  { id: 'FRED_FEDFUNDS',     name: 'Fed Funds Rate',           category: 'monetary', sourceType: 'api',    sourceId: 'FEDFUNDS',   frequency: 'monthly',   higherBetter: null,  unit: '%' },
  { id: 'FRED_M2SL',         name: 'M2 Money Supply',          category: 'monetary', sourceType: 'api',    sourceId: 'M2SL',       frequency: 'monthly',   higherBetter: true,  unit: 'USD bn' },
  { id: 'FRED_WALCL',        name: 'Fed Balance Sheet',        category: 'monetary', sourceType: 'api',    sourceId: 'WALCL',      frequency: 'weekly',    higherBetter: true,  unit: 'USD mn' },
  { id: 'FEDWATCH_HIKE',     name: 'CME FedWatch Hike Prob.',  category: 'monetary', sourceType: 'manual', sourceId: null,         frequency: 'weekly',    higherBetter: null,  unit: '%' },

  // ── Market ──────────────────────────────────────────────────────────
  { id: 'MKT_XAUUSD',        name: 'Gold XAU/USD',             category: 'market', sourceType: 'api', sourceId: 'XAU/USD',        frequency: 'daily', higherBetter: true,  unit: 'USD' },
  { id: 'MKT_BTC',           name: 'Bitcoin',                  category: 'market', sourceType: 'api', sourceId: 'bitcoin',        frequency: 'daily', higherBetter: true,  unit: 'USD' },
  // S&P, Nasdaq, VIX, USD index, WTI all served free by FRED (Twelve Data paywalls indices/commodities).
  { id: 'FRED_SP500',        name: 'S&P 500',                  category: 'market', sourceType: 'api', sourceId: 'SP500',          frequency: 'daily', higherBetter: true,  unit: 'index' },
  { id: 'FRED_NASDAQCOM',    name: 'Nasdaq Composite',         category: 'market', sourceType: 'api', sourceId: 'NASDAQCOM',      frequency: 'daily', higherBetter: true,  unit: 'index' },
  { id: 'FRED_VIXCLS',       name: 'VIX',                      category: 'market', sourceType: 'api', sourceId: 'VIXCLS',         frequency: 'daily', higherBetter: false, unit: 'index' },
  { id: 'FRED_DTWEXBGS',     name: 'US Dollar Index (broad)',  category: 'market', sourceType: 'api', sourceId: 'DTWEXBGS',       frequency: 'daily', higherBetter: null,  unit: 'index' },
  { id: 'FRED_DCOILWTICO',   name: 'WTI Crude Oil',            category: 'market', sourceType: 'api', sourceId: 'DCOILWTICO',     frequency: 'daily', higherBetter: null,  unit: 'USD' },
  { id: 'FRED_DGS2',         name: '2Y Treasury Yield',        category: 'market', sourceType: 'api', sourceId: 'DGS2',           frequency: 'daily', higherBetter: null,  unit: '%' },
  { id: 'FRED_DGS10',        name: '10Y Treasury Yield',       category: 'market', sourceType: 'api', sourceId: 'DGS10',          frequency: 'daily', higherBetter: null,  unit: '%' },
  { id: 'FRED_DGS30',        name: '30Y Treasury Yield',       category: 'market', sourceType: 'api', sourceId: 'DGS30',          frequency: 'daily', higherBetter: null,  unit: '%' },
  { id: 'MKT_GLD',           name: 'GLD (Gold ETF)',           category: 'market', sourceType: 'api', sourceId: 'GLD',            frequency: 'daily', higherBetter: true,  unit: 'USD' },
  { id: 'MKT_XLE',           name: 'XLE (Energy ETF)',         category: 'market', sourceType: 'api', sourceId: 'XLE',            frequency: 'daily', higherBetter: true,  unit: 'USD' },

  // ── Valuation ───────────────────────────────────────────────────────
  { id: 'VAL_BUFFETT',       name: 'Buffett Indicator',        category: 'valuation', sourceType: 'derived', sourceId: null,      frequency: 'quarterly', higherBetter: false, unit: '%' },
  { id: 'VAL_CAPE',          name: 'Shiller CAPE',             category: 'valuation', sourceType: 'api',     sourceId: 'MULTPL/SHILLER_PE_RATIO_MONTH', frequency: 'monthly', higherBetter: false, unit: 'ratio' },
  { id: 'VAL_FED_MODEL',     name: 'Fed Model (EY vs 10Y)',    category: 'valuation', sourceType: 'derived', sourceId: null,      frequency: 'monthly',   higherBetter: true,  unit: '%' },
  { id: 'VAL_DOW_GOLD',      name: 'Dow/Gold Ratio',           category: 'valuation', sourceType: 'derived', sourceId: null,      frequency: 'daily',     higherBetter: null,  unit: 'ratio' },
  { id: 'VAL_BTC_MVRV',      name: 'BTC MVRV',                 category: 'valuation', sourceType: 'manual',  sourceId: null,      frequency: 'weekly',    higherBetter: false, unit: 'ratio' },

  // ── Sentiment (direction handled contrarian in sentiment.ts → null) ──
  { id: 'SENT_CNN_FG',       name: 'CNN Fear & Greed',         category: 'sentiment', sourceType: 'api',     sourceId: null, frequency: 'daily',   higherBetter: null, unit: 'index' },
  { id: 'SENT_CRYPTO_FG',    name: 'Crypto Fear & Greed',      category: 'sentiment', sourceType: 'api',     sourceId: null, frequency: 'daily',   higherBetter: null, unit: 'index' },
  { id: 'SENT_AAII',         name: 'AAII Bull-Bear Spread',    category: 'sentiment', sourceType: 'scraped', sourceId: null, frequency: 'weekly',  higherBetter: null, unit: '%' },
  { id: 'SENT_BOFA_FMS',     name: 'BofA FMS Cash Level',      category: 'sentiment', sourceType: 'manual',  sourceId: null, frequency: 'monthly', higherBetter: null, unit: '%' },
  { id: 'SENT_COT_GOLD',     name: 'COT Gold Net Spec',        category: 'sentiment', sourceType: 'api',     sourceId: null, frequency: 'weekly',  higherBetter: null, unit: 'contracts' },
  { id: 'SENT_GLD_FLOWS',    name: 'GLD ETF Flows',            category: 'sentiment', sourceType: 'api',     sourceId: null, frequency: 'weekly',  higherBetter: null, unit: 'tonnes' },
];

async function main() {
  for (const r of rows) {
    await db.insert(indicators).values(r).onConflictDoUpdate({ target: indicators.id, set: r });
  }
  console.log(`seeded ${rows.length} indicators`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
