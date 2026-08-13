import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import { getSql } from './_db.js';
import { getCurrentUser } from './_security.js';
import type { ApiRequest, ApiResponse } from './_types.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) return end(res, 401);

    const id = typeof req.query?.id === 'string' ? req.query.id : '';
    const kind = req.query?.kind === 'rectified' ? 'rectified' : 'original';
    if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return end(res, 400);

    const column = kind === 'rectified' ? 'rectified_image_url' : 'image_url';
    const sql = getSql();
    const rows = await sql.query(
      `SELECT ${column} AS image_url FROM gotas_analyses WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, user.id],
    ) as Array<{ image_url: string | null }>;
    const url = rows[0]?.image_url;
    if (!url) return end(res, 404);

    const blob = await get(url, { access: 'private' });
    if (!blob || blob.statusCode === 304 || !blob.stream) return end(res, 404);

    res.statusCode = 200;
    res.setHeader('Content-Type', blob.blob.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(blob.blob.size));
    res.setHeader('Cache-Control', 'private, max-age=300');
    return Readable.fromWeb(blob.stream as any).pipe(res);
  } catch (error) {
    console.error('Falha ao renderizar imagem:', error);
    return end(res, 503);
  }
}

function end(res: ApiResponse, status: number) {
  res.statusCode = status;
  return res.end();
}
