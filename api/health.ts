import { databaseIsConfigured, ensureSchema, getDatabaseUrl, getSql } from './_db.js';
import { sendJson } from './_http.js';
import type { ApiRequest, ApiResponse } from './_types.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });

  const envDetected = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DATABASE_POSTGRES_URL: Boolean(process.env.DATABASE_POSTGRES_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
    POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING),
    NEON_DATABASE_URL: Boolean(process.env.NEON_DATABASE_URL),
  };

  const configured = databaseIsConfigured();

  if (!configured) {
    return sendJson(res, 200, {
      status: 'error',
      message: 'Nenhuma variável de conexão Neon/Postgres encontrada nas variáveis de ambiente da Vercel.',
      variablesChecked: envDetected,
      recommendation: 'Adicione POSTGRES_URL ou DATABASE_URL nas configurações de Environment Variables da Vercel.',
    });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const result = (await sql`SELECT 1 as connected, NOW() as server_time`) as unknown as Array<Record<string, unknown>>;
    const usersCount = (await sql`SELECT COUNT(*)::int as count FROM gotas_users`) as unknown as Array<{ count: number }>;

    return sendJson(res, 200, {
      status: 'ok',
      message: 'Conexão com o banco Neon estabelecida com sucesso.',
      serverTime: result[0]?.server_time,
      usersCount: usersCount[0]?.count ?? 0,
      variablesChecked: envDetected,
    });
  } catch (error) {
    console.error('Falha de saúde do banco:', error);
    return sendJson(res, 503, {
      status: 'error',
      message: 'Erro ao conectar ou consultar o banco Neon.',
      error: error instanceof Error ? error.message : String(error),
      variablesChecked: envDetected,
    });
  }
}
