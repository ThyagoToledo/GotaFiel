import { getSql } from '../_db.js';
import { isSameOrigin, JsonBodyTooLargeError, readJson, sendJson, setSessionCookie } from '../_http.js';
import { createSessionToken, hashSessionToken, normalizeName, sessionExpiry, verifyPassword } from '../_security.js';
import type { ApiRequest, ApiResponse } from '../_types.js';

type Credentials = { name?: unknown; password?: unknown };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'ORIGEM_NAO_PERMITIDA' });
  try {
    const body = await readJson<Credentials>(req);
    const name = typeof body.name === 'string' ? body.name : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const sql = getSql();
    const rows = (await sql`SELECT id, name, password_hash FROM gotas_users WHERE name_key = ${normalizeName(name)} LIMIT 1`) as unknown as Array<Record<string, unknown>>;
    const user = rows[0] as { id: string; name: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) return sendJson(res, 401, { error: 'CREDENCIAIS_INVALIDAS' });

    const token = createSessionToken();
    await sql`INSERT INTO gotas_sessions (user_id, token_hash, expires_at) VALUES (${user.id}, ${hashSessionToken(token)}, ${sessionExpiry()})`;
    setSessionCookie(res, token);
    sendJson(res, 200, { user: { id: user.id, name: user.name } });
  } catch (error) {
    if (error instanceof JsonBodyTooLargeError) return sendJson(res, 413, { error: 'CORPO_MUITO_GRANDE' });
    console.error('Falha no login:', error);
    sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  }
}
