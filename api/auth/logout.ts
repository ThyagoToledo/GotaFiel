import { getSql } from '../_db.js';
import { clearSessionCookie, getCookie, isSameOrigin, sendJson } from '../_http.js';
import { hashSessionToken } from '../_security.js';
import type { ApiRequest, ApiResponse } from '../_types.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'ORIGEM_NAO_PERMITIDA' });
  try {
    const token = getCookie(req, 'gotas_session');
    if (token) await getSql()`DELETE FROM gotas_sessions WHERE token_hash = ${hashSessionToken(token)}`;
  } catch (error) {
    console.error('Falha ao encerrar sessão:', error);
  }
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}
