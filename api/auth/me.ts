import { databaseIsConfigured } from '../_db';
import { sendJson } from '../_http';
import { getCurrentUser } from '../_security';
import type { ApiRequest, ApiResponse } from '../_types';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!databaseIsConfigured()) return sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  try {
    const user = await getCurrentUser(req);
    sendJson(res, 200, { user });
  } catch (error) {
    console.error('Falha ao ler sessão:', error);
    sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  }
}
