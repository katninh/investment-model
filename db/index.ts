import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Reuse one postgres client across hot-reloads (dev) so we don't pay the TLS
// handshake to the (remote) pooler on every request.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // Supabase transaction pooler (pgbouncer, port 6543)
    max: 5,
    idle_timeout: 120, // keep connections warm between navigations (seconds)
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export * as schema from './schema';
