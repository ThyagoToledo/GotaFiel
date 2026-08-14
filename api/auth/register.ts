import { getSql } from '../_db.js';
import { isSameOrigin, JsonBodyTooLargeError, readJson, sendJson, setSessionCookie } from '../_http.js';
import { createSessionToken, hashPassword, hashSessionToken, normalizeName, sessionExpiry } from '../_security.js';
import type { ApiRequest, ApiResponse } from '../_types.js';

type Credentials = { name?: unknown; password?: unknown };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'ORIGEM_NAO_PERMITIDA' });
  try {
    const body = await readJson<Credentials>(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2 || name.length > 80) return sendJson(res, 400, { error: 'NOME_INVALIDO' });
    if (password.length < 8 || password.length > 200) return sendJson(res, 400, { error: 'SENHA_INVALIDA' });

    const sql = getSql();
    const nameKey = normalizeName(name);
    const existing = (await sql`SELECT id FROM gotas_users WHERE name_key = ${nameKey} LIMIT 1`) as unknown as Array<Record<string, unknown>>;
    if (existing.length > 0) return sendJson(res, 409, { error: 'NOME_JA_CADASTRADO' });

    const created = (await sql`
      INSERT INTO gotas_users (name, name_key, password_hash)
      VALUES (${name}, ${nameKey}, ${hashPassword(password)})
      RETURNING id, name
    `) as unknown as Array<Record<string, unknown>>;
    const user = created[0] as { id: string; name: string } | undefined;
    if (!user) return sendJson(res, 500, { error: 'USUARIO_NAO_CRIADO' });

    const token = createSessionToken();
    await sql`INSERT INTO gotas_sessions (user_id, token_hash, expires_at) VALUES (${user.id}, ${hashSessionToken(token)}, ${sessionExpiry()})`;
    setSessionCookie(res, token);
    sendJson(res, 201, { user });
  } catch (error) {
    if (error instanceof JsonBodyTooLargeError) return sendJson(res, 413, { error: 'CORPO_MUITO_GRANDE' });
    console.error('Falha no cadastro:', error);
    sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  }
}
