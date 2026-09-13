import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Lazy: don't read DATABASE_URL or open a connection at import time, so the
// production build (which imports these modules to "collect page data") never
// depends on the DB. The client is created on the first actual query at runtime.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };
let _db: Db | undefined;

function initDb(): Db {
  if (_db) return _db;
  const client =
    globalForDb.pgClient ??
    postgres(process.env.DATABASE_URL!, {
      prepare: false, // Supabase transaction pooler (pgbouncer, port 6543)
      max: 10,
      idle_timeout: 120,
      connect_timeout: 15,
    });
  if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client;
  _db = drizzle(client, { schema });
  return _db;
}

// Proxy preserves the `db.select()/insert()/execute()` API while deferring init.
export const db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = initDb() as unknown as Record<string | symbol, unknown>;
    const val = real[prop];
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(real) : val;
  },
});

export * as schema from './schema';
