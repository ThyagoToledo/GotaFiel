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
    process.env.DATABASE_URL_UNPOOLED ||
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
 * Executa cada comando DDL individualmente para compatibilidade total com o driver Neon Serverless.
 */
export async function ensureSchema(): Promise<void> {
  if (!databaseIsConfigured()) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql();

      // 1. Tabela de Usuários
      await sql`
        CREATE TABLE IF NOT EXISTS gotas_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          name_key TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      // 2. Tabela de Sessões
      await sql`
        CREATE TABLE IF NOT EXISTS gotas_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES gotas_users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS gotas_sessions_user_idx ON gotas_sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS gotas_sessions_token_idx ON gotas_sessions(token_hash)`;

      // 3. Tabela de Rate Limit Distribuído
      await sql`
        CREATE TABLE IF NOT EXISTS gotas_auth_rate_limits (
          operation TEXT NOT NULL CHECK (operation IN ('login', 'register')),
          subject_hash TEXT NOT NULL,
          window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (operation, subject_hash)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS gotas_auth_rate_limits_updated_idx ON gotas_auth_rate_limits(updated_at)`;

      // 4. Tabela de Análises
      await sql`
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
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS gotas_analyses_user_created_idx ON gotas_analyses(user_id, created_at DESC)`;

      // 5. Colunas aditivas para retrocompatibilidade
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS image_url TEXT`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS rectified_image_url TEXT`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'INCONCLUSIVA'`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS effective_dpi NUMERIC(10, 2) NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS orientation_corrected BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS coverage_reliable BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS count_density_reliable BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS size_volume_reliable BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS quality_warnings JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS capture_quality JSONB`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS algorithm_version TEXT NOT NULL DEFAULT 'legacy'`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS mean_filter_passes INTEGER NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS fill_holes BOOLEAN NOT NULL DEFAULT FALSE`;
    })().catch((err) => {
      schemaPromise = undefined;
      throw err;
    });
  }
  return schemaPromise;
}
