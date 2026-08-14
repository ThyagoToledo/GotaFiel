# Neon e contas de usuário

## O que o app salva

O processamento de imagem continua no navegador. A API envia ao Neon o resumo textual e numérico da análise: nome, talhão/cultura quando informados, densidade, cobertura, span, DV, volume estimado, versão do algoritmo e indicadores de confiabilidade.

As análises novas também podem guardar `capture_quality`, um objeto numérico com ocupação do cartão, sinal de nitidez, variação de iluminação e altas luzes neutras. Esses sinais são diagnósticos informativos, versionados como `capture-signals-v1`, e permanecem marcados como `NAO_CALIBRADO` até existir uma coleção rotulada.

Máscara, pixels, histograma e lista de gotas não são enviados ao Neon. Quando o usuário salva uma análise, a imagem original e o recorte retificado podem ser armazenados de forma privada no Vercel Blob; o Neon guarda apenas as URLs privadas usadas pelos endpoints autenticados do Gotas2.

## Configuração

1. Crie um projeto/branch no Neon.
2. No SQL Editor do Neon, execute todo o arquivo `scripts/neon-schema.sql`.
3. Na Vercel, use a variável sensível criada pela integração Neon (`DATABASE_POSTGRES_URL`) ou adicione manualmente `DATABASE_URL` com a connection string do branch de produção. O backend aceita as duas; não coloque nenhuma delas no código-fonte.
4. Faça um novo deploy.
5. Abra `/` e crie o primeiro usuário com nome e senha de no mínimo 8 caracteres.

As rotas da API ficam em:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET|POST|DELETE /api/analyses`

A senha nunca é salva em texto puro: a API usa `scrypt` com salt individual. A sessão fica em cookie `HttpOnly`, e todas as consultas de análise filtram pelo usuário da sessão no servidor.

## Migração da geração 3

Projetos já existentes também devem executar novamente `scripts/neon-schema.sql`. Os comandos `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` acrescentam status da leitura, dpi efetivo, correção de orientação, confiabilidade por grupo de métricas, avisos, sinais de captura, versão do algoritmo, passagens de suavização e preenchimento de buracos sem apagar as análises anteriores. Registros antigos recebem `INCONCLUSIVA` e versão `legacy`, pois não há informação suficiente para reavaliá-los retroativamente.

Para uma instalação que já está na geração anterior, é suficiente executar `scripts/neon-migration-phase2.sql` antes de publicar esta fase. A migração é aditiva e não altera registros existentes.

## Migração do limite de autenticação

Antes de publicar a fase de proteção distribuída, execute uma única vez
`scripts/neon-migration-auth-rate-limit.sql` no mesmo branch de produção do Neon. Ela cria
apenas a tabela operacional de tentativas, sem tocar em usuários, sessões ou análises.

Os registros expirados não interferem no limite, pois a janela é de 15 minutos. Para manter
a tabela compacta, a operação do banco pode remover registros com mais de 48 horas quando
necessário:

```sql
DELETE FROM gotas_auth_rate_limits
WHERE updated_at < NOW() - INTERVAL '48 hours';
```

## Desenvolvimento local

O frontend continua sendo executado com `npm run dev`. As funções `/api` são funções Vercel e devem ser exercitadas em um ambiente Vercel (`vercel dev` ou preview/deploy), com `DATABASE_URL` ou `DATABASE_POSTGRES_URL` configurada. Sem uma delas, o app mostra a indisponibilidade do banco em vez de fabricar dados.
