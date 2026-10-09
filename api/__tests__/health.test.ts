import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn(async () => [{ connected: 1 }]) }));
vi.mock('../_db', () => ({ databaseIsConfigured: () => true, getSql: () => mockSql }));

import health from '../health';

describe('endpoint público de saúde', () => {
  beforeEach(() => mockSql.mockClear());

  it('retorna somente o estado sem revelar informações do banco ou das contas', async () => {
    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      body: '',
      setHeader(name: string, value: string) { this.headers[name] = value; },
      end(value = '') { this.body = value; },
    };

    await health({ method: 'GET', headers: {} } as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    expect(response.body).not.toMatch(/usersCount|serverTime|DATABASE_URL|variablesChecked/i);
    expect(mockSql).toHaveBeenCalledOnce();
  });
});
