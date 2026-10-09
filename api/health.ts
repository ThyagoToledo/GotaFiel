import { databaseIsConfigured, getSql } from './_db.js';
import { sendJson } from './_http.js';
import type { ApiRequest, ApiResponse } from './_types.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!databaseIsConfigured()) return sendJson(res, 503, { status: 'error' });

  try {
    await getSql()`SELECT 1`;
    return sendJson(res, 200, { status: 'ok' });
  } catch (error) {
    console.error('Falha de saúde do banco:', error);
    return sendJson(res, 503, { status: 'error' });
  }
}
