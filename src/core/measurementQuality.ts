import type { MeasurementQuality } from '../types';

/** Incrementar sempre que uma mudança puder alterar as métricas publicadas. */
export const ANALYSIS_ALGORITHM_VERSION = '3.1.0-alpha.1';

export interface MeasurementQualityInput {
  quadWidthPx: number;
  quadHeightPx: number;
  cardWidthMm: number;
  cardHeightMm: number;
  coveragePercent: number;
  orientationCorrected: boolean;
}

/**
 * Avalia somente condições que já têm regra técnica documentada.
 *
 * Foco, sombra, reflexo e fidelidade de cor serão incorporados depois que seus limites
 * forem calibrados em imagens rotuladas. Inventar cortes agora criaria uma falsa
 * precisão tão problemática quanto não avisar nada.
 */
export function assessMeasurementQuality(input: MeasurementQualityInput): MeasurementQuality {
  const {
    quadWidthPx,
    quadHeightPx,
    cardWidthMm,
    cardHeightMm,
    coveragePercent,
    orientationCorrected,
  } = input;

  const dpiX = cardWidthMm > 0 ? quadWidthPx / (cardWidthMm / 25.4) : 0;
  const dpiY = cardHeightMm > 0 ? quadHeightPx / (cardHeightMm / 25.4) : 0;
  const effectiveDpi = Number.isFinite(dpiX) && Number.isFinite(dpiY)
    ? Math.max(0, Math.round(Math.min(dpiX, dpiY)))
    : 0;

  const belowMinimumResolution = effectiveDpi < 300;
  const belowRecommendedResolution = effectiveDpi < 600;
  const highOverlap = Number.isFinite(coveragePercent) && coveragePercent > 20;
  const warnings: string[] = [];

  if (belowMinimumResolution) {
    warnings.push(
      `Resolução efetiva de ${effectiveDpi} dpi, abaixo do mínimo de 300 dpi para medições físicas.`
    );
  } else if (belowRecommendedResolution) {
    warnings.push(
      `Resolução efetiva de ${effectiveDpi} dpi. Use 600 dpi ou mais para medir gotas pequenas com menor erro.`
    );
  }

  if (highOverlap) {
    warnings.push(
      `Cobertura de ${coveragePercent.toFixed(1).replace('.', ',')}%: manchas sobrepostas impedem recuperar contagem e tamanhos com segurança.`
    );
  }

  if (orientationCorrected) {
    warnings.push('A orientação vertical do cartão foi corrigida automaticamente antes da análise.');
  }

  warnings.push(
    'Algoritmo em validação: o resultado é uma medição experimental do cartão, não um veredito agronômico.'
  );

  const coverageReliable = !belowMinimumResolution;
  const countDensityReliable = !belowRecommendedResolution && !highOverlap;
  const sizeVolumeReliable = !belowRecommendedResolution && !highOverlap;

  let status: MeasurementQuality['status'] = 'ADEQUADA';
  if (belowMinimumResolution) status = 'INCONCLUSIVA';
  else if (belowRecommendedResolution || highOverlap) status = 'LIMITADA';

  return {
    status,
    effectiveDpi,
    orientationCorrected,
    coverageReliable,
    countDensityReliable,
    sizeVolumeReliable,
    warnings,
    algorithmVersion: ANALYSIS_ALGORITHM_VERSION,
  };
}

/** Dados antigos não possuem resolução e avisos suficientes para uma avaliação retroativa. */
export function legacyMeasurementQuality(): MeasurementQuality {
  return {
    status: 'INCONCLUSIVA',
    effectiveDpi: 0,
    orientationCorrected: false,
    coverageReliable: false,
    countDensityReliable: false,
    sizeVolumeReliable: false,
    warnings: [
      'Análise criada por uma versão anterior, sem metadados suficientes para avaliar a confiabilidade.',
    ],
    algorithmVersion: 'legacy',
  };
}
