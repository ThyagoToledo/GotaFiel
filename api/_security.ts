import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getCookie } from './_http.js';
import { getSql } from './_db.js';
import type { ApiRequest } from './_types.js';

const PASSWORD_KEY_LENGTH = 64;

export function normalizeName(name: string) {
  return name.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export async function getCurrentUser(req: ApiRequest) {
  const token = getCookie(req, 'gotas_session');
  if (!token) return null;
  const rows = await getSql()`
    SELECT u.id, u.name
    FROM gotas_sessions s
    INNER JOIN gotas_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)} AND s.expires_at > NOW()
    LIMIT 1
  `;
  return (rows[0] as { id: string; name: string } | undefined) ?? null;
}
