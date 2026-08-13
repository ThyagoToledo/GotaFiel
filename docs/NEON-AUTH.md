# Neon e contas de usuário

## O que o app salva

O processamento de imagem continua no navegador. A API envia ao Neon apenas o resumo textual e numérico da análise: nome, talhão/cultura quando informados, veredito, pontuação, densidade, cobertura, span, DV e volume.

Não são enviados nem armazenados `imageUrl`, recorte retificado, máscara, pixels, histograma ou lista de gotas.

## Configuração

1. Crie um projeto/branch no Neon.
2. No SQL Editor do Neon, execute todo o arquivo `scripts/neon-schema.sql`.
3. Na Vercel, adicione `DATABASE_URL` com a connection string do branch de produção.
4. Faça um novo deploy.
5. Abra `/` e crie o primeiro usuário com nome e senha de no mínimo 8 caracteres.

As rotas da API ficam em:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET|POST|DELETE /api/analyses`

A senha nunca é salva em texto puro: a API usa `scrypt` com salt individual. A sessão fica em cookie `HttpOnly`, e todas as consultas de análise filtram pelo usuário da sessão no servidor.

## Desenvolvimento local

O frontend continua sendo executado com `npm run dev`. As funções `/api` são funções Vercel e devem ser exercitadas em um ambiente Vercel (`vercel dev` ou preview/deploy), com `DATABASE_URL` configurada. Sem essa variável, o app mostra a indisponibilidade do banco em vez de fabricar dados.
