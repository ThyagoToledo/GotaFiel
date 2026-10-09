# Configuração Vercel — GotaFiel

Projeto informado: `gotafiel`, na conta `thyagos-projects-2a538c0c`.

## Configuração esperada no painel

- Framework: Vite ou Other.
- Root Directory: raiz deste repositório.
- Install Command: comando baseado no lockfile e runtime escolhido; hoje o projeto mantém `bun.lock` e `.npmrc` bloqueia a criação acidental de `package-lock.json`.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Região do banco e das funções: preferencialmente próxima ao Neon e aos usuários, quando suportado pelo plano.
- Variáveis de servidor: `DATABASE_URL` (ou integração Neon equivalente) e `BLOB_READ_WRITE_TOKEN` para Blob privado.
- Nunca usar essas credenciais em variáveis públicas `VITE_*`.

## Verificação antes de produção

1. Confirmar que Git está ligado ao `ThyagoToledo/GotaFiel`, branch de produção correta e deployment atual.
2. Verificar domínio de produção e se `/api/health` não revela conteúdo de mensagens de erro, credenciais ou dados pessoais.
3. Verificar a conexão Neon, schema `gotas_*`, insert/read/delete da conta autenticada e limite de tentativas.
4. Verificar que upload de imagem é privado e que a API permite recuperar apenas imagens da própria conta.
5. Conferir deployment protection/SSO. Páginas legais para Play Store precisam estar acessíveis publicamente sem autenticação.
6. Confirmar os contatos, responsável, retenção e titularidade antes de preencher a política.

## Estado de verificação

O código local define um projeto Vite com `dist`, funções na pasta `api` e cabeçalhos de segurança em `vercel.json`. A leitura do projeto Vercel via conector não foi autorizada pelo escopo da conta nesta sessão (403); não foram lidas nem alteradas variáveis, recursos de banco, domínios ou configurações de implantação.
