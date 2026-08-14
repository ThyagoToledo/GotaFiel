/** Métricas puras para comparar a saída do Gotas2 com uma referência independente. */
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
