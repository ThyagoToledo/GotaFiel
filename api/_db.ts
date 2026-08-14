import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | undefined;
let schemaPromise: Promise<void> | undefined;

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    undefined
  );
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) throw new Error('DATABASE_URL_NAO_CONFIGURADA');
  client ??= neon(url);
  return client;
}

export function databaseIsConfigured() {
  return Boolean(getDatabaseUrl());
}

/**
 * Garante a criação automática e idempotente de todas as tabelas necessárias no Neon.
 */
export async function ensureSchema(): Promise<void> {
  if (!databaseIsConfigured()) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS gotas_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          name_key TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS gotas_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES gotas_users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS gotas_sessions_user_idx ON gotas_sessions(user_id);
        CREATE INDEX IF NOT EXISTS gotas_sessions_token_idx ON gotas_sessions(token_hash);

        CREATE TABLE IF NOT EXISTS gotas_auth_rate_limits (
          operation TEXT NOT NULL CHECK (operation IN ('login', 'register')),
          subject_hash TEXT NOT NULL,
          window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (operation, subject_hash)
        );
        CREATE INDEX IF NOT EXISTS gotas_auth_rate_limits_updated_idx ON gotas_auth_rate_limits(updated_at);

        CREATE TABLE IF NOT EXISTS gotas_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES gotas_users(id) ON DELETE CASCADE,
          client_id TEXT,
          title TEXT NOT NULL,
          field_id TEXT,
          field_name TEXT,
          crop TEXT,
          image_url TEXT,
          rectified_image_url TEXT,
          card_width_mm NUMERIC(10, 3) NOT NULL,
          card_height_mm NUMERIC(10, 3) NOT NULL,
          sensitivity NUMERIC(5, 2) NOT NULL DEFAULT 0,
          method TEXT NOT NULL DEFAULT 'hybrid',
          mean_filter_passes INTEGER NOT NULL DEFAULT 0,
          fill_holes BOOLEAN NOT NULL DEFAULT FALSE,
          total_droplets INTEGER NOT NULL,
          density NUMERIC(12, 4) NOT NULL,
          coverage_percent NUMERIC(8, 4) NOT NULL,
          span NUMERIC(12, 4) NOT NULL,
          vmd_um NUMERIC(12, 3) NOT NULL,
          dv01_um NUMERIC(12, 3) NOT NULL,
          dv09_um NUMERIC(12, 3) NOT NULL,
          volume_l_ha NUMERIC(12, 4) NOT NULL,
          verdict TEXT NOT NULL,
          verdict_score NUMERIC(5, 2) NOT NULL,
          verdict_message TEXT,
          asabe_category TEXT NOT NULL,
          quality_status TEXT NOT NULL DEFAULT 'INCONCLUSIVA',
          effective_dpi NUMERIC(10, 2) NOT NULL DEFAULT 0,
          orientation_corrected BOOLEAN NOT NULL DEFAULT FALSE,
          coverage_reliable BOOLEAN NOT NULL DEFAULT FALSE,
          count_density_reliable BOOLEAN NOT NULL DEFAULT FALSE,
          size_volume_reliable BOOLEAN NOT NULL DEFAULT FALSE,
          quality_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
          capture_quality JSONB,
          algorithm_version TEXT NOT NULL DEFAULT 'legacy',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS gotas_analyses_user_created_idx ON gotas_analyses(user_id, created_at DESC);
      `;
    })().catch((err) => {
      schemaPromise = undefined;
      throw err;
    });
  }
  return schemaPromise;
}
