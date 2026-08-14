-- Migração segura da Fase 2 para projetos que já executaram neon-schema.sql.
-- Não contém dados de imagem: apenas cria a coluna JSONB dos sinais numéricos.
ALTER TABLE gotas_analyses
  ADD COLUMN IF NOT EXISTS capture_quality JSONB;
