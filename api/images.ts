import { put } from '@vercel/blob';
import { isSameOrigin, JsonBodyTooLargeError, readJson, sendJson } from './_http.js';
import { getCurrentUser } from './_security.js';
import type { ApiRequest, ApiResponse } from './_types.js';

type ImageInput = { dataUrl?: unknown; analysisId?: unknown; kind?: unknown };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'ORIGEM_NAO_PERMITIDA' });
  try {
    const user = await getCurrentUser(req);
    if (!user) return sendJson(res, 401, { error: 'NAO_AUTENTICADO' });
    const body = await readJson<ImageInput>(req, 6 * 1024 * 1024);
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
    const analysisId = typeof body.analysisId === 'string' ? body.analysisId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) : '';
    const kind = body.kind === 'rectified' ? 'rectified' : 'original';
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/);
    if (!match || !analysisId) return sendJson(res, 400, { error: 'IMAGEM_INVALIDA' });
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 4 * 1024 * 1024) return sendJson(res, 413, { error: 'IMAGEM_MUITO_GRANDE' });
    const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
    const blob = await put(`users/${user.id}/analyses/${analysisId}/${kind}.${extension}`, bytes, {
      access: 'private', contentType: match[1], addRandomSuffix: true,
    });
    return sendJson(res, 201, { url: blob.url });
  } catch (error) {
    if (error instanceof JsonBodyTooLargeError) return sendJson(res, 413, { error: 'CORPO_MUITO_GRANDE' });
    console.error('Falha ao salvar imagem:', error);
    return sendJson(res, 503, { error: 'ARMAZENAMENTO_INDISPONIVEL' });
  }
}
