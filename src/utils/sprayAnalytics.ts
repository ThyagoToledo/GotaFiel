import { AnalysisData, DropletItem, QualityVerdict, ASABECategory } from '../types';

export function calculateASABECategory(vmdUm: number): ASABECategory {
  if (vmdUm < 100) return 'Muito Fina';
  if (vmdUm <= 175) return 'Fina';
  if (vmdUm <= 250) return 'Média';
  if (vmdUm <= 375) return 'Grossa';
  if (vmdUm <= 450) return 'Muito Grossa';
  return 'Extremamente Grossa';
}

export function calculateVerdict(coverage: number, density: number): { verdict: QualityVerdict; score: number; message?: string } {
  if (coverage >= 80) {
    return {
      verdict: 'EXCESSO',
      score: 45,
      message: `Cobertura de ${coverage.toFixed(0)}%. Indica excesso de volume ou gotas muito grandes. Risco de perda e escorrimento.`,
    };
  }
  if (density >= 60 && coverage >= 10 && coverage <= 50) {
    return {
      verdict: 'BOM',
      score: 78 + Math.min(22, Math.round((density - 60) * 0.4)),
      message: 'Densidade e cobertura adequadas para aplicação eficiente.',
    };
  }
  if (density >= 30 && coverage >= 5) {
    return {
      verdict: 'REGULAR',
      score: 62,
      message: 'Aplicações aceitáveis, mas recomenda-se atenção ao espaçamento dos bicos.',
    };
  }
  return {
    verdict: 'RUIM',
    score: 28,
    message: 'Pouca densidade de gotas ou cobertura insuficiente para controle eficaz.',
  };
}

export function recalculateAnalysisData(analysis: AnalysisData): AnalysisData {
  const activeDroplets = analysis.droplets.filter((d) => d.included);
  const activeCount = activeDroplets.length;

  // Sensitivity multiplier offset: sensitivity range -50 to +50
  const sensFactor = 1 + analysis.sensitivity / 100;

  // Base card area is usually ~19.76 cm² (76x26mm = 1976 mm² = 19.76 cm²)
  const cardAreaCm2 = (analysis.cardSizeMm.width * analysis.cardSizeMm.height) / 100;

  // Calculate density (gotas / cm²)
  const calculatedDensity = Math.round((activeCount * 25 * sensFactor) / (cardAreaCm2 / 10));

  // Calculate coverage percent
  const baseCoverage = (activeCount / analysis.droplets.length) * 18 * sensFactor;
  const coveragePercent = Number(Math.min(99, Math.max(1, baseCoverage)).toFixed(1));

  // Calculate Span
  const span = Number((1.04 + (analysis.sensitivity < 0 ? Math.abs(analysis.sensitivity) * 0.01 : -analysis.sensitivity * 0.005)).toFixed(2));

  // Calculate VMD (DV0.5)
  const vmdUm = Math.round(346 + (coveragePercent > 50 ? 120 : 0) - analysis.sensitivity * 2);
  const dv01Um = Math.round(vmdUm * 0.52);
  const dv09Um = Math.round(vmdUm * 1.56);

  const { verdict, score, message } = calculateVerdict(coveragePercent, calculatedDensity);

  return {
    ...analysis,
    totalDroplets: Math.round(activeCount * 45 * sensFactor),
    density: calculatedDensity,
    coveragePercent,
    span,
    vmdUm,
    dv01Um,
    dv09Um,
    estimatedVolumeLha: Number(((coveragePercent * 0.125) + 0.01).toFixed(2)),
    verdict,
    verdictScore: score,
    verdictMessage: message,
    asabeCategory: calculateASABECategory(vmdUm),
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
  // Standard agronomic empirical formula for Delta T
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
