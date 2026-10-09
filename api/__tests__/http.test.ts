import { describe, expect, it } from 'vitest';
import { clearSessionCookie, isSameOrigin } from '../_http';
import type { ApiRequest } from '../_types';

function request(headers: Record<string, string>): ApiRequest {
  return { headers } as ApiRequest;
}

describe('proteções HTTP da API', () => {
  it('preserva Secure também ao encerrar a sessão em produção', () => {
    const priorNodeEnv = process.env.NODE_ENV;
    const priorVercel = process.env.VERCEL;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.VERCEL;
      let cookie = '';
      clearSessionCookie({ setHeader: (_name: string, value: string) => { cookie = value; } } as any);
      expect(cookie).toContain('HttpOnly; SameSite=Lax; Secure');
    } finally {
      if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = priorNodeEnv;
      if (priorVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = priorVercel;
    }
  });

  it('aceita chamadas sem Origin para integrações servidor-a-servidor', () => {
    expect(isSameOrigin(request({ host: 'gotas2.vercel.app' }))).toBe(true);
  });

  it('aceita a origem do próprio site', () => {
    expect(isSameOrigin(request({ host: 'gotas2.vercel.app', origin: 'https://gotas2.vercel.app' }))).toBe(true);
  });

  it('rejeita uma origem diferente', () => {
    expect(isSameOrigin(request({ host: 'gotas2.vercel.app', origin: 'https://exemplo.invalid' }))).toBe(false);
  });

  it('usa o host encaminhado pela Vercel quando disponível', () => {
    expect(isSameOrigin(request({ host: 'internal.vercel', 'x-forwarded-host': 'gotas2.vercel.app', origin: 'https://gotas2.vercel.app' }))).toBe(true);
  });
});
