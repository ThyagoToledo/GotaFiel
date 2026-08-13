import { AnalysisData } from '../types';
import { PersistedAnalysis } from '../core/types';
import {
  computeMm2PerPixel,
  computeTargetRaster,
  mmPerPixelEquivalent,
} from '../core/imageProcessor';

export function formatPtBrNumber(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '0';
  return val.toFixed(decimals).replace('.', ',');
}

const CSV_HEADERS = [
  'ID',
  'Data',
  'Titulo',
  'Largura_mm',
  'Altura_mm',
  'Raster_largura_px',
  'Raster_altura_px',
  'mm2_por_pixel',
  'mm_por_pixel',
  'Metodo',
  'Ajuste_Limiar',
  'Min_Area_px',
  'Descartar_Borda',
  'Total_Gotas',
  'Densidade_gotas_cm2',
  'Cobertura_pct',
  'DV01_um',
  'DV05_VMD_um',
  'DV09_um',
  'Span',
  'Volume_Lha',
  'Veredito',
  'Score',
  'ASABE',
];

function buildAnalysisCsvRow(data: AnalysisData | PersistedAnalysis): string {
  const isPersisted = 'metrics' in data;

  const totalDroplets = isPersisted ? data.metrics.totalDroplets : data.totalDroplets;
  const density = isPersisted ? data.metrics.density : data.density;
  const coveragePercent = isPersisted ? data.metrics.coveragePercent : data.coveragePercent;
  const dv01Um = isPersisted ? data.metrics.dv01Um : data.dv01Um;
  const dv05Um = isPersisted ? data.metrics.dv05Um : data.vmdUm;
  const dv09Um = isPersisted ? data.metrics.dv09Um : data.dv09Um;
  const span = isPersisted ? data.metrics.span : data.span;
  const estimatedVolumeLha = isPersisted ? data.metrics.estimatedVolumeLha : data.estimatedVolumeLha;
  const verdict = isPersisted ? data.metrics.verdict : data.verdict;
  const verdictScore = isPersisted ? data.metrics.verdictScore : data.verdictScore;
  const asabeCategory = isPersisted ? data.metrics.asabeCategory : data.asabeCategory;

  const method = isPersisted ? data.params.method : 'chromatic';
  const thresholdAdjustment = isPersisted ? data.params.thresholdAdjustment : (data.sensitivity || 0);
  const minAreaPx = isPersisted ? data.params.minAreaPx : 1;
  const discardBorder = isPersisted ? data.params.discardBorder : true;
  // Calibration is (cardSizeMm, raster dimensions). Derive the pixel AREA from those and
  // report the linear ratio only as sqrt(mm2PerPixel), for spreadsheet compatibility.
  const plannedRaster = computeTargetRaster(data.cardSizeMm.width, data.cardSizeMm.height);
  const rectWidthPx = data.rectWidthPx || plannedRaster.targetWidth;
  const rectHeightPx = data.rectHeightPx || plannedRaster.targetHeight;
  const mm2PerPixel = computeMm2PerPixel(
    data.cardSizeMm.width,
    data.cardSizeMm.height,
    rectWidthPx,
    rectHeightPx
  );
  const mmPerPixel = mmPerPixelEquivalent(mm2PerPixel);

  // Check validity
  const numericValues = [
    totalDroplets,
    density,
    coveragePercent,
    dv01Um,
    dv05Um,
    dv09Um,
    span,
    estimatedVolumeLha,
    verdictScore,
    data.cardSizeMm.width,
    data.cardSizeMm.height,
    mm2PerPixel,
    mmPerPixel,
  ];

  for (const num of numericValues) {
    if (!Number.isFinite(num)) {
      throw new Error('Não é possível exportar CSV com valores inválidos (NaN/Infinity).');
    }
  }

  const dateStr = 'date' in data && data.date ? data.date : new Date(data.timestamp || Date.now()).toLocaleDateString('pt-BR');

  const row = [
    data.id,
    dateStr,
    `"${(data.title || 'Amostra').replace(/"/g, '""')}"`,
    formatPtBrNumber(data.cardSizeMm.width, 1),
    formatPtBrNumber(data.cardSizeMm.height, 1),
    rectWidthPx,
    rectHeightPx,
    formatPtBrNumber(mm2PerPixel, 9),
    formatPtBrNumber(mmPerPixel, 6),
    method,
    thresholdAdjustment,
    minAreaPx,
    discardBorder ? 'SIM' : 'NAO',
    totalDroplets,
    formatPtBrNumber(density, 1),
    formatPtBrNumber(coveragePercent, 2),
    Math.round(dv01Um),
    Math.round(dv05Um),
    Math.round(dv09Um),
    formatPtBrNumber(span, 2),
    formatPtBrNumber(estimatedVolumeLha, 2),
    verdict,
    verdictScore,
    asabeCategory,
  ];

  return row.join(';');
}

export function generateAnalysisCsvString(data: AnalysisData | PersistedAnalysis): string {
  return `${CSV_HEADERS.join(';')}\n${buildAnalysisCsvRow(data)}`;
}

/**
 * CSV consolidado com uma linha por an\u00E1lise salva \u2014 \u00E9 o que o "Exportar Todos os
 * Dados" da tela Mais baixa. An\u00E1lises com m\u00E9tricas inv\u00E1lidas s\u00E3o puladas em vez de
 * derrubar a exporta\u00E7\u00E3o inteira.
 */
export function generateAllAnalysesCsvString(analyses: AnalysisData[]): string {
  const rows: string[] = [];
  for (const analysis of analyses) {
    try {
      rows.push(buildAnalysisCsvRow(analysis));
    } catch {
      // pulada: mant\u00E9m as demais an\u00E1lises export\u00E1veis
    }
  }
  if (rows.length === 0) {
    throw new Error('Nenhuma an\u00E1lise com dados v\u00E1lidos para exportar.');
  }
  return `${CSV_HEADERS.join(';')}\n${rows.join('\n')}`;
}

function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAnalysisCsv(data: AnalysisData | PersistedAnalysis): void {
  const cleanTitle = (data.title || 'amostra').toLowerCase().replace(/[^a-z0-9]/g, '_');
  triggerCsvDownload(generateAnalysisCsvString(data), `${cleanTitle}_gotas.csv`);
}

export function downloadAllAnalysesCsv(analyses: AnalysisData[]): void {
  const dateSlug = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(generateAllAnalysesCsvString(analyses), `relatorio_gotas_${dateSlug}.csv`);
}
