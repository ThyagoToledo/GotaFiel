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

CREATE TABLE IF NOT EXISTS gotas_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES gotas_users(id) ON DELETE CASCADE,
  client_id TEXT,
  title TEXT NOT NULL,
  field_id TEXT,
  field_name TEXT,
  crop TEXT,
  card_width_mm NUMERIC(10, 3) NOT NULL,
  card_height_mm NUMERIC(10, 3) NOT NULL,
  sensitivity NUMERIC(5, 2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'chromatic',
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gotas_analyses_user_created_idx ON gotas_analyses(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gotas_analyses_client_user_idx ON gotas_analyses(user_id, client_id) WHERE client_id IS NOT NULL;
