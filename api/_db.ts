import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | undefined;

export function getSql() {
  // Vercel's Neon integration exposes the connection as DATABASE_POSTGRES_URL.
  // Keep DATABASE_URL as the local/deployment-agnostic override.
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL_NAO_CONFIGURADA');
  client ??= neon(url);
  return client;
}

export function databaseIsConfigured() {
  return Boolean(process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL);
}
