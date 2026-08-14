import { describe, expect, it } from 'vitest';
import {
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  hashAuthRateLimitSubject,
  isAuthRateLimited,
} from '../_rateLimit';

describe('limite distribuído de autenticação', () => {
  it('só bloqueia depois do máximo de tentativas na janela', () => {
    expect(isAuthRateLimited(AUTH_RATE_LIMIT_MAX_ATTEMPTS)).toBe(false);
    expect(isAuthRateLimited(AUTH_RATE_LIMIT_MAX_ATTEMPTS + 1)).toBe(true);
  });

  it('normaliza o mesmo nome e separa as operações', () => {
    expect(hashAuthRateLimitSubject('login', ' Thyago ')).toBe(hashAuthRateLimitSubject('login', 'thyago'));
    expect(hashAuthRateLimitSubject('login', 'thyago')).not.toBe(hashAuthRateLimitSubject('register', 'thyago'));
  });
});
