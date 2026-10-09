import type { ApiRequest, ApiResponse } from './_types.js';

export class JsonBodyTooLargeError extends Error {
  constructor() {
    super('JSON_BODY_TOO_LARGE');
    this.name = 'JsonBodyTooLargeError';
  }
}

export const DEFAULT_JSON_BODY_LIMIT = 256 * 1024;

export async function readJson<T>(req: ApiRequest, maxBytes = DEFAULT_JSON_BODY_LIMIT): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > maxBytes) throw new JsonBodyTooLargeError();
    return req.body as T;
  }
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new JsonBodyTooLargeError();

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) throw new JsonBodyTooLargeError();
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

export function sendJson(res: ApiResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * State-changing requests from the site carry an Origin header. Rejecting a
 * different origin provides a second CSRF defense alongside SameSite cookies,
 * while still allowing server-to-server calls that omit Origin.
 */
export function isSameOrigin(req: ApiRequest) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (Array.isArray(origin) || origin === 'null') return false;

  const forwardedHost = req.headers['x-forwarded-host'];
  const requestHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost ?? req.headers.host;
  if (!requestHost) return false;

  try {
    return new URL(origin).host === requestHost.split(',')[0].trim();
  } catch {
    return false;
  }
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
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `gotas_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}
