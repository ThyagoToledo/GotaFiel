-- Execute uma vez no projeto Neon antes de publicar esta alteração.
-- A tabela guarda somente hashes SHA-256 do nome normalizado, nunca nome, senha ou IP.
CREATE TABLE IF NOT EXISTS gotas_auth_rate_limits (
  operation TEXT NOT NULL CHECK (operation IN ('login', 'register')),
  subject_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (operation, subject_hash)
);

CREATE INDEX IF NOT EXISTS gotas_auth_rate_limits_updated_idx
  ON gotas_auth_rate_limits(updated_at);
