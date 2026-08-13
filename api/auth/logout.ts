import { getSql } from '../_db';
import { clearSessionCookie, getCookie, sendJson } from '../_http';
import { hashSessionToken } from '../_security';
import type { ApiRequest, ApiResponse } from '../_types';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  try {
    const token = getCookie(req, 'gotas_session');
    if (token) await getSql()`DELETE FROM gotas_sessions WHERE token_hash = ${hashSessionToken(token)}`;
  } catch (error) {
    console.error('Falha ao encerrar sessão:', error);
  }
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}
