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
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = null;
        throw error;
      });
  }
  await schemaReady;
}
