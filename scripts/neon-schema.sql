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
  image_url TEXT,
  rectified_image_url TEXT,
  card_width_mm NUMERIC(10, 3) NOT NULL,
  card_height_mm NUMERIC(10, 3) NOT NULL,
  sensitivity NUMERIC(5, 2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'chromatic',
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
  algorithm_version TEXT NOT NULL DEFAULT 'legacy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gotas_analyses_user_created_idx ON gotas_analyses(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gotas_analyses_client_user_idx ON gotas_analyses(user_id, client_id) WHERE client_id IS NOT NULL;

ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS rectified_image_url TEXT;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'INCONCLUSIVA';
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS effective_dpi NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS orientation_corrected BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS coverage_reliable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS count_density_reliable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS size_volume_reliable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS quality_warnings JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS algorithm_version TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS mean_filter_passes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gotas_analyses ADD COLUMN IF NOT EXISTS fill_holes BOOLEAN NOT NULL DEFAULT FALSE;
