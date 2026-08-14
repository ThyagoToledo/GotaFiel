import { describe, expect, it } from 'vitest';
import { isSameOrigin } from '../_http';
import type { ApiRequest } from '../_types';

function request(headers: Record<string, string>): ApiRequest {
  return { headers } as ApiRequest;
}

describe('proteções HTTP da API', () => {
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
