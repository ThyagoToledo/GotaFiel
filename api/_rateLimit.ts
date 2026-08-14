import { createHash } from 'node:crypto';
import { getSql } from './_db.js';
import { normalizeName } from './_security.js';

export const AUTH_RATE_LIMIT_WINDOW_MINUTES = 15;
export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8;

type AuthOperation = 'login' | 'register';

export class AuthRateLimitError extends Error {
  constructor() {
    super('MUITAS_TENTATIVAS');
  }
}

/**
 * Não persiste nome, senha ou IP. O hash impede que a tabela operacional seja
 * usada para identificar usuários, mas ainda permite agrupar tentativas contra
 * a mesma conta em todas as instâncias serverless.
 */
export function hashAuthRateLimitSubject(operation: AuthOperation, name: string) {
  return createHash('sha256')
    .update(`${operation}:${normalizeName(name)}`)
    .digest('hex');
}

export function isAuthRateLimited(attemptCount: number) {
  return attemptCount > AUTH_RATE_LIMIT_MAX_ATTEMPTS;
}

export async function consumeAuthAttempt(operation: AuthOperation, name: string) {
  const rows = (await getSql()`
    INSERT INTO gotas_auth_rate_limits (
      operation,
      subject_hash,
      window_started_at,
      attempt_count,
      updated_at
    )
    VALUES (
      ${operation},
      ${hashAuthRateLimitSubject(operation, name)},
      NOW(),
      1,
      NOW()
    )
    ON CONFLICT (operation, subject_hash) DO UPDATE SET
      window_started_at = CASE
        WHEN gotas_auth_rate_limits.window_started_at <= NOW() - (${AUTH_RATE_LIMIT_WINDOW_MINUTES} * INTERVAL '1 minute')
          THEN NOW()
        ELSE gotas_auth_rate_limits.window_started_at
      END,
      attempt_count = CASE
        WHEN gotas_auth_rate_limits.window_started_at <= NOW() - (${AUTH_RATE_LIMIT_WINDOW_MINUTES} * INTERVAL '1 minute')
          THEN 1
        ELSE gotas_auth_rate_limits.attempt_count + 1
      END,
      updated_at = NOW()
    RETURNING attempt_count
  `) as unknown as Array<{ attempt_count: number | string }>;

  const attemptCount = Number(rows[0]?.attempt_count);
  if (!Number.isFinite(attemptCount)) throw new Error('RATE_LIMIT_INVALIDO');
  if (isAuthRateLimited(attemptCount)) throw new AuthRateLimitError();
}

/** Uma autenticação concluída não deve deixar tentativas anteriores bloqueando o titular da conta. */
export async function clearAuthAttempts(operation: AuthOperation, name: string) {
  await getSql()`
    DELETE FROM gotas_auth_rate_limits
    WHERE operation = ${operation} AND subject_hash = ${hashAuthRateLimitSubject(operation, name)}
  `;
}
