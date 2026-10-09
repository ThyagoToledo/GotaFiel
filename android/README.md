# GotaFiel para Android

O aplicativo Android empacota a interface web existente com Capacitor. O app continua usando a API `/api` no mesmo domínio de produção da Vercel; nenhuma credencial Neon ou Blob é incluída no Android.

## Requisitos de compilação

- Node.js 22 ou 24 e `npm install` (o repositório mantém `bun.lock` como fonte de dependências).
- Android Studio estável recente, Android SDK 36 e JDK 21.
- `appId` em `capacitor.config.ts` confirmado como identificador definitivo antes do primeiro envio. Identificador da Play Store não pode mudar para atualizações.
- Chave de upload Android guardada com backup criptografado. Não adicionar keystore nem senha ao Git.

## Comandos

```powershell
npm install
npm run lint
npm test
npm run android:sync
npm run android:open
```

Abra o projeto no Android Studio, configure o SDK/JDK, teste em emulador e aparelho físico, depois gere um Android App Bundle (AAB) assinado. Configure Play App Signing e mantenha a chave de upload em local seguro.

## Antes de publicar

1. Confirmar pacote definitivo e titularidade do app.
2. Completar e revisar `public/privacidade.html`; inserir o canal de contato e os dados dos titulares/direitos depois de formalizados.
3. Confirmar ambiente Vercel: projeto e domínio de produção, branch e diretório raiz, build `npm run build`, saída `dist`, Node compatível, região, variáveis `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN`, conexão Neon e tabelas.
4. Não colocar segredos em `VITE_*`, arquivos compilados ou assets do app. A API usa variáveis de ambiente apenas no servidor.
5. Testar cadastro, autenticação, sessão/cookies, upload privado, sincronização, uso offline e logout no Android.
6. Finalizar declarações Data Safety, política pública, conteúdo, classificação, público-alvo, ficha da loja, testes fechados e fluxo de exclusão/atendimento.

O projeto e esta pasta de documentação não incluem credenciais nem afirmam que a revisão jurídica ou institucional foi concluída. Vercel deve ser inspecionado pelo painel autenticado do proprietário; alterações de produção exigem valores e titularidade confirmados.
