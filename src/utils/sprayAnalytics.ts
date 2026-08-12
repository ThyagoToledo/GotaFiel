import { AnalysisData, ASABECategory, QualityVerdict } from '../types';
import {
  calculateASABECategory,
  calculateVerdict,
  computeMetricsFromHistogram,
  computeMm2PerPixel,
} from '../core/imageProcessor';

/**
 * Recalculates AnalysisData metrics based on real droplet list and card dimensions.
 */
export function recalculateAnalysisData(analysis: AnalysisData): AnalysisData {
  const cardWidthMm = analysis.cardSizeMm?.width || 76;
  const cardHeightMm = analysis.cardSizeMm?.height || 26;
  const rectWidthPx = analysis.rectWidthPx || 760;
  const rectHeightPx = analysis.rectHeightPx || 260;

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
      verdict: 'RUIM',
      verdictScore: 0,
      verdictMessage: 'Nenhuma gota ativa selecionada para análise.',
      asabeCategory: 'Muito Fina',
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
  };
}

// Weather and Drift Risk Analytics
export interface WeatherConditionResult {
  deltaT: number;
  status: 'OPTIMAL' | 'EVAPORATION_WARNING' | 'DRIFT_WARNING' | 'INVERSION_WARNING';
  statusLabel: string;
  recommendation: string;
}

export function calculateWeatherRisk(
  temperatureC: number,
  humidityPercent: number,
  windKmh: number
): WeatherConditionResult {
  // Approximate Delta T calculation: T_dry - T_wet
  const dewPoint = temperatureC - (100 - humidityPercent) / 5;
  const deltaT = Number((temperatureC - dewPoint).toFixed(1));

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

// Nozzle flow rate evaluation
export function evaluateNozzles(volumesMl: number[]): {
  overallAvgMl: number;
  flowAvgLmin: number;
  maxDevPercent: number;
  nozzleDeviations: Array<{ volumeMl: number; deviationPercent: number; actionRequired: 'SUBSTITUIR' | 'LIMPAR' | 'OK' }>;
} {
  if (!volumesMl || volumesMl.length === 0) {
    return { overallAvgMl: 0, flowAvgLmin: 0, maxDevPercent: 0, nozzleDeviations: [] };
  }

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

    let actionRequired: 'SUBSTITUIR' | 'LIMPAR' | 'OK' = 'OK';
    if (Math.abs(dev) >= 10) {
      actionRequired = 'SUBSTITUIR';
    } else if (Math.abs(dev) >= 6) {
      actionRequired = 'LIMPAR';
    }

    return {
      volumeMl: vol,
      deviationPercent: Number.isFinite(dev) ? dev : 0,
      actionRequired,
    };
  });

  return {
    overallAvgMl,
    flowAvgLmin,
    maxDevPercent: Number.isFinite(maxDev) ? maxDev : 0,
    nozzleDeviations,
  };
}
