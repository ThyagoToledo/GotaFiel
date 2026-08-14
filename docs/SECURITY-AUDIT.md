# Auditoria de segurança — Gotas2

Data da auditoria: 14/08/2026

## Resultado

Não foram encontrados tokens, senhas, connection strings ou chaves privadas nos arquivos versionados nem nos commits presentes no histórico local. Os arquivos `.env*`, `.vercel` e artefatos de benchmark estão ignorados pelo Git; `.env.example` contém apenas valores fictícios.

O banco usa consultas parametrizadas pelo driver Neon. Senhas são armazenadas com `scrypt` e salt individual, e a sessão usa token aleatório armazenado apenas como hash no banco. O cookie de sessão é `HttpOnly`, `SameSite=Lax` e `Secure` em produção.

As imagens usam Vercel Blob privado. O navegador não recebe a URL privada diretamente: o endpoint autenticado consulta a análise do usuário e faz o streaming do Blob somente depois de verificar a posse do registro.

## Proteções adicionadas

- Cabeçalhos globais na Vercel: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS.
- Verificação de `Origin` em login, cadastro, logout, upload, criação e exclusão de análises. Requisições sem `Origin` continuam permitidas para integrações servidor-a-servidor; origens diferentes são rejeitadas.
- Limite de corpo JSON de 256 KiB para autenticação e análises.
- Limite de 6 MiB para o JSON de upload, compatível com o limite de 4 MiB dos bytes da imagem após a decodificação Base64.
- Respostas JSON marcadas como `Cache-Control: no-store`.
- Limite distribuído no Neon para login e cadastro: no máximo oito tentativas sem sucesso por nome normalizado e operação a cada 15 minutos; uma operação concluída limpa o contador. A tabela guarda somente o hash SHA-256 do nome, nunca senha, token ou IP.

## Riscos que permanecem explicitamente conhecidos

- O rate limit é deliberadamente por nome, não por IP: ele reduz tentativas repetidas contra a mesma conta sem armazenar endereço IP. Uma proteção global contra ataques que alternam nomes exigirá WAF/provedor dedicado e política de privacidade/retenção antes de ser adicionada.
- O armazenamento não substitui validação científica. A aplicação continua mostrando limitações de qualidade e não transforma o resultado do cartão em laudo agronômico.
- O scanner local encontrou zero ocorrências de padrões fortes de segredo. Como nenhuma ferramenta dedicada de secret scanning está instalada no ambiente, a revisão foi feita com padrões de connection string, chaves privadas, tokens conhecidos e inspeção do histórico Git.

## Checklist antes de cada publicação

1. `git status -sb` e revisão do diff.
2. Verificação de `.env*`, `.vercel` e artefatos temporários fora do commit.
3. Busca por `postgresql://`, chaves privadas, tokens e credenciais.
4. `npm.cmd run lint`, `npm.cmd test` e `npm.cmd run build`.
5. Conferência das variáveis secretas somente na Vercel/Neon, nunca no código.
