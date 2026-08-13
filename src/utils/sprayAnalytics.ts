import {
  AnalysisData,
  ASABECategory,
  DEFAULT_NOZZLE_CRITERIA,
  NozzleCriteria,
  NozzleCriteriaMode,
  QualityVerdict,
} from '../types';
import {
  computeMetricsFromHistogram,
  computeMm2PerPixel,
  computeTargetRaster,
} from '../core/imageProcessor';
import { assessMeasurementQuality } from '../core/measurementQuality';

/**
 * Recalculates AnalysisData metrics based on real droplet list and card dimensions.
 */
export function recalculateAnalysisData(analysis: AnalysisData): AnalysisData {
  const cardWidthMm = analysis.cardSizeMm?.width || 76;
  const cardHeightMm = analysis.cardSizeMm?.height || 26;
  // Registros gravados antes do raster dinâmico podem não trazer as dimensões. Derivar
  // do cartão mantém o pixel quadrado; um raster fixo distorceria um cartão 26x38.
  // Quem tem raster gravado usa o seu, então mudar a resolução alvo não reescreve o
  // resultado de análises antigas.
  const plannedRaster = computeTargetRaster(cardWidthMm, cardHeightMm);
  const rectWidthPx = analysis.rectWidthPx || plannedRaster.targetWidth;
  const rectHeightPx = analysis.rectHeightPx || plannedRaster.targetHeight;

  // Canonical calibration: physical AREA of one pixel. Derived from the card and the
  // raster, never from a persisted linear mm/px average.
  const mm2PerPixel = computeMm2PerPixel(cardWidthMm, cardHeightMm, rectWidthPx, rectHeightPx);

  // Filter active included droplets
  const activeDroplets = analysis.droplets.filter((d) => d.included !== false);

  if (activeDroplets.length === 0) {
    return {
      ...analysis,
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      span: 0,
      vmdUm: 0,
      dv01Um: 0,
      dv09Um: 0,
      estimatedVolumeLha: 0,
      verdict: 'NAO_AVALIADO',
      verdictScore: 0,
      verdictMessage: 'A adequação agronômica não é avaliada automaticamente.',
      asabeCategory: 'Não classificada',
    };
  }

  // Build histogram directly from active droplets' pixel counts without roundtripping through diameter
  const binMap = new Map<number, number>();
  for (const drop of activeDroplets) {
    let pxCount = drop.pixelCount;
    if (pxCount === undefined || pxCount <= 0) {
      // Reconstruct the pixel count from physical area using the pixel AREA, not a
      // squared linear scale.
      if (drop.areaMm2 && drop.areaMm2 > 0 && mm2PerPixel > 0) {
        pxCount = Math.max(1, Math.round(drop.areaMm2 / mm2PerPixel));
      } else if (mm2PerPixel > 0) {
        const areaMm2 = Math.PI * Math.pow((drop.diameterUm || 100) / 2000, 2);
        pxCount = Math.max(1, Math.round(areaMm2 / mm2PerPixel));
      } else {
        pxCount = 1;
      }
    }
    binMap.set(pxCount, (binMap.get(pxCount) || 0) + 1);
  }

  const histogramBins = Array.from(binMap.entries()).map(([pixelCount, quantity]) => ({
    pixelCount,
    quantity,
  }));

  const metrics = computeMetricsFromHistogram(
    histogramBins,
    cardWidthMm,
    cardHeightMm,
    rectWidthPx,
    rectHeightPx
  );
  const measurementQuality = analysis.measurementQuality
    ? assessMeasurementQuality({
        quadWidthPx: (cardWidthMm / 25.4) * analysis.measurementQuality.effectiveDpi,
        quadHeightPx: (cardHeightMm / 25.4) * analysis.measurementQuality.effectiveDpi,
        cardWidthMm,
        cardHeightMm,
        coveragePercent: metrics.coveragePercent,
        orientationCorrected: analysis.measurementQuality.orientationCorrected,
      })
    : undefined;

  return {
    ...analysis,
    totalDroplets: metrics.totalDroplets,
    density: metrics.density,
    coveragePercent: metrics.coveragePercent,
    span: metrics.span,
    vmdUm: metrics.dv05Um,
    dv01Um: metrics.dv01Um,
    dv09Um: metrics.dv09Um,
    estimatedVolumeLha: metrics.estimatedVolumeLha,
    verdict: metrics.verdict,
    verdictScore: metrics.verdictScore,
    verdictMessage: metrics.verdictMessage,
    asabeCategory: metrics.asabeCategory,
    measurementQuality,
  };
}

// Weather and Drift Risk Analytics
export interface WeatherConditionResult {
  deltaT: number;
  status: 'OPTIMAL' | 'EVAPORATION_WARNING' | 'DRIFT_WARNING' | 'INVERSION_WARNING';
  statusLabel: string;
  recommendation: string;
}

/**
 * Temperatura de bulbo úmido pela aproximação de Stull (2011), válida para
 * -20–50 °C e UR 5–99% — a faixa de qualquer aplicação real.
 */
export function calculateWetBulbC(temperatureC: number, humidityPercent: number): number {
  const T = temperatureC;
  const RH = Math.min(99, Math.max(5, humidityPercent));
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  );
}

export function calculateWeatherRisk(
  temperatureC: number,
  humidityPercent: number,
  windKmh: number
): WeatherConditionResult {
  // Delta T é bulbo seco − bulbo úmido. A versão anterior usava a depressão do ponto
  // de orvalho, que superestima o valor e disparava alerta de evaporação cedo demais.
  const wetBulbC = calculateWetBulbC(temperatureC, humidityPercent);
  const deltaT = Number((temperatureC - wetBulbC).toFixed(1));

  if (windKmh < 2) {
    return {
      deltaT,
      status: 'INVERSION_WARNING',
      statusLabel: 'Inversão Térmica / Vento Insuficiente',
      recommendation: 'Evite aplicar. Vento abaixo de 2 km/h pode reter gotas finas suspensas em camada de inversão.',
    };
  }

  if (windKmh > 10) {
    return {
      deltaT,
      status: 'DRIFT_WARNING',
      statusLabel: 'Risco Elevado de Deriva',
      recommendation: 'Vento acima de 10 km/h. Reduza a pressão, utilize bicos de indução de ar ou suspenda a aplicação.',
    };
  }

  if (humidityPercent < 50 || temperatureC > 30 || deltaT > 8) {
    return {
      deltaT,
      status: 'EVAPORATION_WARNING',
      statusLabel: 'Atenção: Alta Evaporação (Delta T elevado)',
      recommendation: 'Umidade baixa ou temperatura alta. Utilize gotas grossas/muito grossas e adicione adjuvantes antideriva.',
    };
  }

  return {
    deltaT,
    status: 'OPTIMAL',
    statusLabel: 'Condições Climáticas Ideais',
    recommendation: 'Temperatura, umidade e vento favoráveis para excelente deposição e penetração de gotas no dossel.',
  };
}

export function calculateVolumeDeCalda(vazaoLmin: number, espacamentoCm: number, velocidadeKmh: number): number {
  if (!Number.isFinite(vazaoLmin) || vazaoLmin <= 0) return 0;
  if (!Number.isFinite(espacamentoCm) || espacamentoCm <= 0) return 0;
  if (!Number.isFinite(velocidadeKmh) || velocidadeKmh <= 0) return 0;

  const espacamentoM = espacamentoCm / 100;
  const volume = (vazaoLmin * 600) / (espacamentoM * velocidadeKmh);
  if (!Number.isFinite(volume) || volume <= 0) return 0;

  return Number(volume.toFixed(1));
}

export type NozzleAction = 'SUBSTITUIR' | 'LIMPAR' | 'OK';

/**
 * Normaliza critérios vindos do localStorage (podem estar ausentes, fora de faixa ou
 * invertidos) para valores utilizáveis, sem nunca deixar limpar >= substituir.
 */
export function sanitizeNozzleCriteria(criteria?: Partial<NozzleCriteria> | null): NozzleCriteria {
  const mode: NozzleCriteriaMode =
    criteria?.mode === 'direcional' ? 'direcional' : DEFAULT_NOZZLE_CRITERIA.mode;

  const clampPercent = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.min(100, Math.round(value * 10) / 10)
      : fallback;

  const clean = clampPercent(
    criteria?.cleanThresholdPercent,
    DEFAULT_NOZZLE_CRITERIA.cleanThresholdPercent
  );
  let replace = clampPercent(
    criteria?.replaceThresholdPercent,
    DEFAULT_NOZZLE_CRITERIA.replaceThresholdPercent
  );

  // Substituir abaixo de limpar deixaria a faixa "LIMPAR" inalcançável.
  if (replace <= clean) replace = clean;

  return { mode, cleanThresholdPercent: clean, replaceThresholdPercent: replace };
}

/** Ação recomendada para um único bico, dado o desvio percentual assinado. */
export function resolveNozzleAction(deviationPercent: number, criteria: NozzleCriteria): NozzleAction {
  const magnitude = Math.abs(deviationPercent);
  if (magnitude < criteria.cleanThresholdPercent) return 'OK';

  if (criteria.mode === 'direcional') {
    // Acima da média: orifício desgastado/alargado — limpar não recupera a vazão.
    if (deviationPercent > 0) return 'SUBSTITUIR';
    // Abaixo da média: obstrução. Vira troca quando o desvio passa do limite maior.
    return magnitude >= criteria.replaceThresholdPercent ? 'SUBSTITUIR' : 'LIMPAR';
  }

  return magnitude >= criteria.replaceThresholdPercent ? 'SUBSTITUIR' : 'LIMPAR';
}

// Nozzle flow rate evaluation
export function evaluateNozzles(
  volumesMl: number[],
  criteria: NozzleCriteria = DEFAULT_NOZZLE_CRITERIA
): {
  overallAvgMl: number;
  flowAvgLmin: number;
  maxDevPercent: number;
  nozzleDeviations: Array<{ volumeMl: number; deviationPercent: number; actionRequired: NozzleAction }>;
} {
  if (!volumesMl || volumesMl.length === 0) {
    return { overallAvgMl: 0, flowAvgLmin: 0, maxDevPercent: 0, nozzleDeviations: [] };
  }

  const activeCriteria = sanitizeNozzleCriteria(criteria);
  const validVolumes = volumesMl.map((v) => Math.max(0, Number.isFinite(v) ? v : 0));
  const sum = validVolumes.reduce((acc, curr) => acc + curr, 0);
  const overallAvgMl = Math.round(sum / validVolumes.length);
  const flowAvgLmin = Number((overallAvgMl / 1000).toFixed(2));

  let maxDev = 0;
  const nozzleDeviations = validVolumes.map((vol) => {
    let dev = 0;
    if (overallAvgMl > 0) {
      dev = Math.round(((vol - overallAvgMl) / overallAvgMl) * 100);
    }
    if (Math.abs(dev) > maxDev) maxDev = Math.abs(dev);

    return {
      volumeMl: vol,
      deviationPercent: Number.isFinite(dev) ? dev : 0,
      actionRequired: resolveNozzleAction(Number.isFinite(dev) ? dev : 0, activeCriteria),
    };
  });

  return {
    overallAvgMl,
    flowAvgLmin,
    maxDevPercent: Number.isFinite(maxDev) ? maxDev : 0,
    nozzleDeviations,
  };
}
