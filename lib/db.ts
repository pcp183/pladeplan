import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url && url.length > 0 ? url : undefined;
}

type Sql = NeonQueryFunction<false, false>;

let sqlClient: Sql | null = null;
let schemaReady: Promise<void> | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('NO_DATABASE');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function getSql(): Sql | null {
  const url = databaseUrl();
  if (!url) return null;
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  if (!sql) throw new DatabaseNotConfiguredError();
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS pladeplan_projects (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS pladeplan_billing (
          user_id TEXT PRIMARY KEY,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          status TEXT NOT NULL DEFAULT 'none',
          price_id TEXT,
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
          last_event_created BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      .then(() => sql`
        CREATE INDEX IF NOT EXISTS pladeplan_billing_customer_idx
        ON pladeplan_billing (stripe_customer_id)
      `)
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = null;
        throw error;
      });
  }
  await schemaReady;
}
