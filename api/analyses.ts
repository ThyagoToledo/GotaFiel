import { del } from '@vercel/blob';
import { ensureSchema, getSql } from './_db.js';
import { isSameOrigin, readJson, sendJson } from './_http.js';
import { getCurrentUser } from './_security.js';
import type { ApiRequest, ApiResponse } from './_types.js';
import {
  ANALYSIS_ALGORITHM_VERSION,
  assessMeasurementQuality,
} from '../src/core/measurementQuality.js';
import type { CaptureQualitySignals } from '../src/types.js';

type AnalysisInput = {
  id?: unknown;
  title?: unknown;
  fieldId?: unknown;
  fieldName?: unknown;
  crop?: unknown;
  cardSizeMm?: { width?: unknown; height?: unknown };
  sensitivity?: unknown;
  method?: unknown;
  meanFilterPasses?: unknown;
  fillHoles?: unknown;
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
  imageUrl?: unknown;
  rectifiedImageUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  canopyPosition?: unknown;
  measurementQuality?: {
    status?: unknown;
    effectiveDpi?: unknown;
    orientationCorrected?: unknown;
    coverageReliable?: unknown;
    countDensityReliable?: unknown;
    sizeVolumeReliable?: unknown;
    warnings?: unknown;
    algorithmVersion?: unknown;
    captureQuality?: unknown;
  };
};

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null;
}

function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) && result >= min && result <= max ? result : null;
}

function boolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function warningList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 10);
}

function captureQuality(value: unknown): CaptureQualitySignals | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const finite = (name: string, min: number, max: number) => {
    const candidate = typeof item[name] === 'number' ? item[name] : Number(item[name]);
    return Number.isFinite(candidate) && candidate >= min && candidate <= max ? candidate : null;
  };
  const occupancy = finite('cardOccupancyPercent', 0, 100);
  const focus = finite('focusLaplacianVariance', 0, Number.MAX_SAFE_INTEGER);
  const illumination = finite('illuminationVariationPercent', 0, 100);
  const dark = finite('darkPixelPercent', 0, 100);
  const highlight = finite('highlightPixelPercent', 0, 100);
  const samples = finite('sampleCount', 0, 10_000_000);
  if (
    occupancy === null || focus === null || illumination === null || dark === null ||
    highlight === null || samples === null || !Number.isInteger(samples) || samples < 0 ||
    item.version !== 'capture-signals-v1' || item.calibrationStatus !== 'NAO_CALIBRADO'
  ) return null;
  return {
    cardOccupancyPercent: occupancy,
    focusLaplacianVariance: focus,
    illuminationVariationPercent: illumination,
    darkPixelPercent: dark,
    highlightPixelPercent: highlight,
    sampleCount: samples,
    version: 'capture-signals-v1',
    calibrationStatus: 'NAO_CALIBRADO',
  };
}

function mapRow(row: Record<string, unknown>) {
  const id = String(row.id);
  const imageUrl = typeof row.image_url === 'string' && row.image_url.length > 0 ? `/api/image?id=${encodeURIComponent(id)}&kind=original` : '';
  const rectifiedImageUrl = typeof row.rectified_image_url === 'string' && row.rectified_image_url.length > 0 ? `/api/image?id=${encodeURIComponent(id)}&kind=rectified` : undefined;
  const qualityStatus = typeof row.quality_status === 'string' ? row.quality_status : 'INCONCLUSIVA';
  const storedWarnings = Array.isArray(row.quality_warnings)
    ? warningList(row.quality_warnings)
    : warningList(
        typeof row.quality_warnings === 'string'
          ? (() => { try { return JSON.parse(row.quality_warnings); } catch { return []; } })()
          : []
      );
  const storedCaptureQuality = captureQuality(
    typeof row.capture_quality === 'string'
      ? (() => { try { return JSON.parse(row.capture_quality); } catch { return null; } })()
      : row.capture_quality
  );
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
    analysisMethod: row.method,
    meanFilterPasses: Number(row.mean_filter_passes ?? 0),
    fillHoles: row.fill_holes === true,
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
    imageUrl,
    rectifiedImageUrl,
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : undefined,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : undefined,
    canopyPosition: typeof row.canopy_position === 'string' ? row.canopy_position : undefined,
    droplets: [],
    remoteOnly: true,
    measurementQuality: {
      status: ['ADEQUADA', 'LIMITADA', 'INCONCLUSIVA'].includes(qualityStatus)
        ? qualityStatus
        : 'INCONCLUSIVA',
      effectiveDpi: Number(row.effective_dpi ?? 0),
      orientationCorrected: row.orientation_corrected === true,
      coverageReliable: row.coverage_reliable === true,
      countDensityReliable: row.count_density_reliable === true,
      sizeVolumeReliable: row.size_volume_reliable === true,
      warnings: storedWarnings.length
        ? storedWarnings
        : ['Análise anterior sem metadados suficientes para avaliar a confiabilidade.'],
      algorithmVersion: typeof row.algorithm_version === 'string' ? row.algorithm_version : 'legacy',
      ...(storedCaptureQuality ? { captureQuality: storedCaptureQuality } : {}),
    },
  };
}

function values(input: AnalysisInput) {
  const cardWidth = number(input.cardSizeMm?.width, 0.1, 1000);
  const cardHeight = number(input.cardSizeMm?.height, 0.1, 1000);
  const sensitivity = number(input.sensitivity, -50, 50);
  const verdict = text(input.verdict, 20);
  const method = text(input.method, 30) ?? 'hybrid';
  if (!text(input.title, 160) || !verdict || !['NAO_AVALIADO', 'GREET', 'BOM', 'REGULAR', 'RUIM', 'EXCESSO'].includes(verdict)) return null;
  if (!['chromatic', 'gotas-legacy', 'hybrid'].includes(method)) return null;
  if (cardWidth === null || cardHeight === null || sensitivity === null) return null;
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
  const quality = input.measurementQuality;
  const qualityStatus = text(quality?.status, 20);
  if (!qualityStatus || !['ADEQUADA', 'LIMITADA', 'INCONCLUSIVA'].includes(qualityStatus)) return null;
  const effectiveDpi = number(quality?.effectiveDpi, 0, 10000);
  const orientationCorrected = boolean(quality?.orientationCorrected);
  const coverageReliable = boolean(quality?.coverageReliable);
  const countDensityReliable = boolean(quality?.countDensityReliable);
  const sizeVolumeReliable = boolean(quality?.sizeVolumeReliable);
  const algorithmVersion = text(quality?.algorithmVersion, 60);
  const captureQualityInput = quality?.captureQuality;
  const captureQualityValue = captureQuality(captureQualityInput);
  const meanFilterPasses = number(input.meanFilterPasses, 0, 3);
  const fillHoles = boolean(input.fillHoles);
  if (
    effectiveDpi === null || orientationCorrected === null || coverageReliable === null ||
    countDensityReliable === null || sizeVolumeReliable === null || !algorithmVersion ||
    meanFilterPasses === null || fillHoles === null ||
    (captureQualityInput !== undefined && captureQualityValue === null)
  ) return null;
  if (!Number.isInteger(meanFilterPasses)) return null;
  if (algorithmVersion !== ANALYSIS_ALGORITHM_VERSION) return null;

  const expectedQuality = assessMeasurementQuality({
    quadWidthPx: (cardWidth / 25.4) * effectiveDpi,
    quadHeightPx: (cardHeight / 25.4) * effectiveDpi,
    cardWidthMm: cardWidth,
    cardHeightMm: cardHeight,
    coveragePercent: metrics.coveragePercent as number,
    orientationCorrected,
    ...(captureQualityValue ? { captureQuality: captureQualityValue } : {}),
  });
  if (
    qualityStatus !== expectedQuality.status ||
    coverageReliable !== expectedQuality.coverageReliable ||
    countDensityReliable !== expectedQuality.countDensityReliable ||
    sizeVolumeReliable !== expectedQuality.sizeVolumeReliable
  ) return null;
  return {
    title: text(input.title, 160), fieldId: text(input.fieldId, 120), fieldName: text(input.fieldName, 160), crop: text(input.crop, 80),
    imageUrl: blobUrl(input.imageUrl), rectifiedImageUrl: blobUrl(input.rectifiedImageUrl),
    cardWidth, cardHeight, sensitivity, method,
    meanFilterPasses, fillHoles,
    ...metrics, verdict, verdictMessage: text(input.verdictMessage, 500), asabeCategory: text(input.asabeCategory, 40) ?? 'Não classificada',
    qualityStatus, effectiveDpi, orientationCorrected, coverageReliable,
    countDensityReliable, sizeVolumeReliable, qualityWarnings: expectedQuality.warnings,
    algorithmVersion: ANALYSIS_ALGORITHM_VERSION,
    captureQuality: expectedQuality.captureQuality ?? null,
    latitude: number(input.latitude, -90, 90),
    longitude: number(input.longitude, -180, 180),
    canopyPosition: text(input.canopyPosition, 30),
  };
}

function blobUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com') ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) return sendJson(res, 405, { error: 'METODO_NAO_PERMITIDO' });
  if (req.method !== 'GET' && !isSameOrigin(req)) return sendJson(res, 403, { error: 'ORIGEM_NAO_PERMITIDA' });
  try {
    await ensureSchema();
    const user = await getCurrentUser(req);
    if (!user) return sendJson(res, 401, { error: 'NAO_AUTENTICADO' });
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT id, title, field_id, field_name, crop, image_url, rectified_image_url, created_at, card_width_mm, card_height_mm,
          sensitivity, method, mean_filter_passes, fill_holes, total_droplets, density, coverage_percent, span, vmd_um, dv01_um,
          dv09_um, volume_l_ha, verdict, verdict_score, verdict_message, asabe_category,
          quality_status, effective_dpi, orientation_corrected, coverage_reliable,
          count_density_reliable, size_volume_reliable, quality_warnings, algorithm_version
          , capture_quality, latitude, longitude, canopy_position
        FROM gotas_analyses WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 200
      `) as unknown as Array<Record<string, unknown>>;
      return sendJson(res, 200, { analyses: rows.map((row) => mapRow(row as Record<string, unknown>)) });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      if (!id) return sendJson(res, 400, { error: 'ID_INVALIDO' });
      const deleted = (await sql`DELETE FROM gotas_analyses WHERE id = ${id} AND user_id = ${user.id} RETURNING id, image_url, rectified_image_url`) as unknown as Array<Record<string, unknown>>;
      if (deleted.length) {
        const urls = [deleted[0].image_url, deleted[0].rectified_image_url].filter((value): value is string => typeof value === 'string' && value.length > 0);
        if (urls.length) await del(urls);
      }
      return sendJson(res, deleted.length ? 200 : 404, deleted.length ? { ok: true } : { error: 'ANALISE_NAO_ENCONTRADA' });
    }

    const body = await readJson<AnalysisInput>(req);
    const row = values(body);
    if (!row) return sendJson(res, 400, { error: 'DADOS_DA_ANALISE_INVALIDOS' });
    const rows = (await sql`
      INSERT INTO gotas_analyses (
        user_id, client_id, title, field_id, field_name, crop, image_url, rectified_image_url, card_width_mm, card_height_mm, sensitivity, method, mean_filter_passes, fill_holes,
        total_droplets, density, coverage_percent, span, vmd_um, dv01_um, dv09_um, volume_l_ha,
        verdict, verdict_score, verdict_message, asabe_category, quality_status, effective_dpi,
        orientation_corrected, coverage_reliable, count_density_reliable, size_volume_reliable,
        quality_warnings, algorithm_version
        , capture_quality, latitude, longitude, canopy_position
      ) VALUES (
        ${user.id}, ${text(body.id, 120)}, ${row.title}, ${row.fieldId}, ${row.fieldName}, ${row.crop}, ${row.imageUrl}, ${row.rectifiedImageUrl}, ${row.cardWidth}, ${row.cardHeight},
        ${row.sensitivity}, ${row.method}, ${row.meanFilterPasses}, ${row.fillHoles}, ${row.totalDroplets}, ${row.density}, ${row.coveragePercent}, ${row.span}, ${row.vmdUm},
        ${row.dv01Um}, ${row.dv09Um}, ${row.volumeLHa}, ${row.verdict}, ${row.verdictScore}, ${row.verdictMessage}, ${row.asabeCategory},
        ${row.qualityStatus}, ${row.effectiveDpi}, ${row.orientationCorrected}, ${row.coverageReliable},
        ${row.countDensityReliable}, ${row.sizeVolumeReliable}, ${JSON.stringify(row.qualityWarnings)}::jsonb,
        ${row.algorithmVersion}, ${row.captureQuality ? JSON.stringify(row.captureQuality) : null}::jsonb,
        ${row.latitude}, ${row.longitude}, ${row.canopyPosition}
      )
      RETURNING id, title, field_id, field_name, crop, image_url, rectified_image_url, created_at, card_width_mm, card_height_mm, sensitivity, method, mean_filter_passes, fill_holes,
        total_droplets, density, coverage_percent, span, vmd_um, dv01_um, dv09_um, volume_l_ha, verdict,
        verdict_score, verdict_message, asabe_category, quality_status, effective_dpi,
        orientation_corrected, coverage_reliable, count_density_reliable, size_volume_reliable,
        quality_warnings, algorithm_version
        , capture_quality, latitude, longitude, canopy_position
    `) as unknown as Array<Record<string, unknown>>;
    return sendJson(res, 201, { analysis: mapRow(rows[0] as Record<string, unknown>) });
  } catch (error) {
    console.error('Falha nas análises:', error);
    sendJson(res, 503, { error: 'BANCO_INDISPONIVEL' });
  }
}
