import type { ApiRequest, ApiResponse } from './_types';

export async function readJson<T>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

export function sendJson(res: ApiResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function getCookie(req: ApiRequest, name: string) {
  const fromVercel = req.cookies?.[name];
  if (fromVercel) return fromVercel;
  const header = req.headers.cookie ?? '';
  const pair = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

export function setSessionCookie(res: ApiResponse, token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `gotas_session=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

export function clearSessionCookie(res: ApiResponse) {
  res.setHeader('Set-Cookie', 'gotas_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
}
