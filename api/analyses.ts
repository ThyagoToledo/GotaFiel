import { getSql } from './_db.js';
import { readJson, sendJson } from './_http.js';
import { getCurrentUser } from './_security.js';
import type { ApiRequest, ApiResponse } from './_types.js';

type AnalysisInput = {
  id?: unknown;
  title?: unknown;
  fieldId?: unknown;
  fieldName?: unknown;
  crop?: unknown;
  cardSizeMm?: { width?: unknown; height?: unknown };
  sensitivity?: unknown;
  method?: unknown;
  totalDroplets?: unknown;
  density?: unknown;
  coveragePercent?: unknown;
  span?: unknown;
  vmdUm?: unknown;
  dv01Um?: unknown;
  dv09Um?: unknown;
  estimatedVolumeLha?: unknown;
  verdict?: unknown;
  verdictScore?: unknown;
  verdictMessage?: unknown;
  asabeCategory?: unknown;
};

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null;
}

function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) && result >= min && result <= max ? result : null;
}

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    fieldId: row.field_id,
    fieldName: row.field_name,
    crop: row.crop,
    timestamp: new Date(String(row.created_at)).getTime(),
    date: new Date(String(row.created_at)).toLocaleDateString('pt-BR'),
    cardSizeMm: { width: Number(row.card_width_mm), height: Number(row.card_height_mm) },
    sensitivity: Number(row.sensitivity),
    method: row.method,
    totalDroplets: Number(row.total_droplets),
    density: Number(row.density),
    coveragePercent: Number(row.coverage_percent),
    span: Number(row.span),
    vmdUm: Number(row.vmd_um),
    dv01Um: Number(row.dv01_um),
    dv09Um: Number(row.dv09_um),
    estimatedVolumeLha: Number(row.volume_l_ha),
    verdict: row.verdict,
    verdictScore: Number(row.verdict_score),
    verdictMessage: row.verdict_message,
    asabeCategory: row.asabe_category,
    imageUrl: '',
    droplets: [],
    remoteOnly: true,
  };
}

function values(input: AnalysisInput) {
  const cardWidth = number(input.cardSizeMm?.width, 0.1, 1000);
  const cardHeight = number(input.cardSizeMm?.height, 0.1, 1000);
  const verdict = text(input.verdict, 20);
  if (!text(input.title, 160) || !verdict || !['GREET', 'BOM', 'REGULAR', 'RUIM', 'EXCESSO'].includes(verdict)) return null;
  if (cardWidth === null || cardHeight === null) return null;
  const metrics = {
    totalDroplets: number(input.totalDroplets),
    density: number(input.density),
    coveragePercent: number(input.coveragePercent, 0, 100),
    span: number(input.span),
    vmdUm: number(input.vmdUm),
    dv01Um: number(input.dv01Um),
    dv09Um: number(input.dv09Um),
    volumeLHa: number(input.estimatedVolumeLha),
    verdictScore: number(input.verdictScore, 0, 100),
  };
  if (Object.values(metrics).some((value) => value === null)) return null;
  return {
    title: text(input.title, 160), fieldId: text(input.fieldId, 120), fieldName: text(input.fieldName, 160), crop: text(input.crop, 80),
    cardWidth, cardHeight, sensitivity: number(input.sensitivity, -50, 50), method: text(input.method, 30) ?? 'chromatic',
    ...metrics, verdict, verdictMessage: text(input.verdictMessage, 500), asabeCategory: text(input.asabeCategory, 40) ?? 'Não classificada',
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  try {
    const user = await getCurrentUser(req);
    if (!user) return sendJson(res, 401, { error: 'NAO_AUTENTICADO' });
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT id, title, field_id, field_name, crop, created_at, card_width_mm, card_height_mm,
          sensitivity, method, total_droplets, density, coverage_percent, span, vmd_um, dv01_um,
          dv09_um, volume_l_ha, verdict, verdict_score, verdict_message, asabe_category
        FROM gotas_analyses WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 200
      `) as unknown as Array<Record<string, unknown>>;
      return sendJson(res, 200, { analyses: rows.map((row) => mapRow(row as Record<string, unknown>)) });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      if (!id) return sendJson(res, 400, { error: 'ID_INVALIDO' });
      const deleted = (await sql`DELETE FROM gotas_analyses WHERE id = ${id} AND user_id = ${user.id} RETURNING id`) as unknown as Array<Record<string, unknown>>;
      return sendJson(res, deleted.length ? 200 : 404, deleted.length ? { ok: true } : { error: 'ANALISE_NAO_ENCONTRADA' });
    }

    const body = await readJson<AnalysisInput>(req);
    const row = values(body);
    if (!row) return sendJson(res, 400, { error: 'DADOS_DA_ANALISE_INVALIDOS' });
    const rows = (await sql`
      INSERT INTO gotas_analyses (
        user_id, client_id, title, field_id, field_name, crop, card_width_mm, card_height_mm, sensitivity, method,
        total_droplets, density, coverage_percent, span, vmd_um, dv01_um, dv09_um, volume_l_ha,
        verdict, verdict_score, verdict_message, asabe_category
      ) VALUES (
        ${user.id}, ${text(body.id, 120)}, ${row.title}, ${row.fieldId}, ${row.fieldName}, ${row.crop}, ${row.cardWidth}, ${row.cardHeight},
        ${row.sensitivity}, ${row.method}, ${row.totalDroplets}, ${row.density}, ${row.coveragePercent}, ${row.span}, ${row.vmdUm},
        ${row.dv01Um}, ${row.dv09Um}, ${row.volumeLHa}, ${row.verdict}, ${row.verdictScore}, ${row.verdictMessage}, ${row.asabeCategory}
      )
      RETURNING id, title, field_id, field_name, crop, created_at, card_width_mm, card_height_mm, sensitivity, method,
        total_droplets, density, coverage_percent, span, vmd_um, dv01_um, dv09_um, volume_l_ha, verdict,
        verdict_score, verdict_message, asabe_category
    `) as unknown as Array<Record<string, unknown>>;
    return sendJson(res, 201, { analysis: mapRow(rows[0] as Record<string, unknown>) });
  } catch (error) {
    console.error('Falha nas análises:', error);
    sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  }
}
