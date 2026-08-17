/** Métricas puras para comparar a saída do algoritmo GotaFiel com uma referência independente. */
export interface BinarySegmentationMetrics {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  iou: number | null;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Compara máscaras já alinhadas no mesmo raster. `true` ou valor diferente de
 * zero representa uma mancha. Tamanhos diferentes invalidam a comparação.
 */
export function compareBinaryMasks(
  predicted: ArrayLike<number | boolean>,
  reference: ArrayLike<number | boolean>,
): BinarySegmentationMetrics {
  if (predicted.length !== reference.length) throw new Error('MASCARAS_COM_DIMENSOES_DIFERENTES');

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;

  for (let index = 0; index < predicted.length; index += 1) {
    const observed = Boolean(predicted[index]);
    const expected = Boolean(reference[index]);
    if (observed && expected) truePositive += 1;
    else if (observed) falsePositive += 1;
    else if (expected) falseNegative += 1;
    else trueNegative += 1;
  }

  const precision = ratio(truePositive, truePositive + falsePositive);
  const recall = ratio(truePositive, truePositive + falseNegative);
  const f1 = precision === null || recall === null || precision + recall === 0
    ? null
    : (2 * precision * recall) / (precision + recall);
  const iou = ratio(truePositive, truePositive + falsePositive + falseNegative);

  return { truePositive, falsePositive, falseNegative, trueNegative, precision, recall, f1, iou };
}

export interface CountErrorMetrics {
  absoluteError: number;
  relativeErrorPercent: number | null;
}

/** O erro relativo não existe quando a referência é zero; não inventa precisão para esse caso. */
export function compareCounts(predictedCount: number, referenceCount: number): CountErrorMetrics {
  if (!Number.isFinite(predictedCount) || !Number.isFinite(referenceCount) || predictedCount < 0 || referenceCount < 0) {
    throw new Error('CONTAGEM_INVALIDA');
  }
  const absoluteError = Math.abs(predictedCount - referenceCount);
  return {
    absoluteError,
    relativeErrorPercent: referenceCount === 0 ? null : (absoluteError / referenceCount) * 100,
  };
}

export interface CoverageErrorMetrics {
  absoluteErrorPoints: number;
}

export function compareCoverage(predictedCoveragePercent: number, referenceCoveragePercent: number): CoverageErrorMetrics {
  if (!Number.isFinite(predictedCoveragePercent) || !Number.isFinite(referenceCoveragePercent)) {
    throw new Error('COBERTURA_INVALIDA');
  }
  return {
    absoluteErrorPoints: Math.abs(predictedCoveragePercent - referenceCoveragePercent),
  };
}

export interface AggregateValidationMetrics {
  totalTruePositive: number;
  totalFalsePositive: number;
  totalFalseNegative: number;
  totalTrueNegative: number;
  microPrecision: number | null;
  microRecall: number | null;
  microF1: number | null;
  microIou: number | null;
  macroPrecision: number | null;
  macroRecall: number | null;
  macroF1: number | null;
  macroIou: number | null;
  sampleCount: number;
}

export function aggregateValidationBatch(metricsList: BinarySegmentationMetrics[]): AggregateValidationMetrics {
  if (metricsList.length === 0) {
    return {
      totalTruePositive: 0,
      totalFalsePositive: 0,
      totalFalseNegative: 0,
      totalTrueNegative: 0,
      microPrecision: null,
      microRecall: null,
      microF1: null,
      microIou: null,
      macroPrecision: null,
      macroRecall: null,
      macroF1: null,
      macroIou: null,
      sampleCount: 0,
    };
  }

  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;
  let totalTN = 0;
  let sumP = 0;
  let sumR = 0;
  let sumF1 = 0;
  let sumIou = 0;
  let validPCount = 0;
  let validRCount = 0;
  let validF1Count = 0;
  let validIouCount = 0;

  for (const m of metricsList) {
    totalTP += m.truePositive;
    totalFP += m.falsePositive;
    totalFN += m.falseNegative;
    totalTN += m.trueNegative;
    if (m.precision !== null) { sumP += m.precision; validPCount++; }
    if (m.recall !== null) { sumR += m.recall; validRCount++; }
    if (m.f1 !== null) { sumF1 += m.f1; validF1Count++; }
    if (m.iou !== null) { sumIou += m.iou; validIouCount++; }
  }

  const microPrecision = ratio(totalTP, totalTP + totalFP);
  const microRecall = ratio(totalTP, totalTP + totalFN);
  const microF1 = microPrecision === null || microRecall === null || microPrecision + microRecall === 0
    ? null
    : (2 * microPrecision * microRecall) / (microPrecision + microRecall);
  const microIou = ratio(totalTP, totalTP + totalFP + totalFN);

  return {
    totalTruePositive: totalTP,
    totalFalsePositive: totalFP,
    totalFalseNegative: totalFN,
    totalTrueNegative: totalTN,
    microPrecision,
    microRecall,
    microF1,
    microIou,
    macroPrecision: validPCount > 0 ? sumP / validPCount : null,
    macroRecall: validRCount > 0 ? sumR / validRCount : null,
    macroF1: validF1Count > 0 ? sumF1 / validF1Count : null,
    macroIou: validIouCount > 0 ? sumIou / validIouCount : null,
    sampleCount: metricsList.length,
  };
}

/** Meta mínima proposta para o conjunto final, a ser aplicada somente após o protocolo de coleta. */
export const TARGET_SEGMENTATION_ACCURACY = 0.95;

export function meetsSegmentationTarget(metrics: Pick<BinarySegmentationMetrics, 'precision' | 'recall' | 'f1'>) {
  return metrics.precision !== null
    && metrics.recall !== null
    && metrics.f1 !== null
    && metrics.precision >= TARGET_SEGMENTATION_ACCURACY
    && metrics.recall >= TARGET_SEGMENTATION_ACCURACY
    && metrics.f1 >= TARGET_SEGMENTATION_ACCURACY;
}

export function meetsFullValidationCriteria(
  segmentation: Pick<BinarySegmentationMetrics, 'precision' | 'recall' | 'f1'>,
  coverageError?: CoverageErrorMetrics
) {
  const segOk = meetsSegmentationTarget(segmentation);
  const covOk = coverageError ? coverageError.absoluteErrorPoints <= 0.5 : true;
  return segOk && covOk;
}
