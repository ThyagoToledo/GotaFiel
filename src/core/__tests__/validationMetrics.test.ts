import { describe, expect, it } from 'vitest';
import {
  TARGET_SEGMENTATION_ACCURACY,
  compareBinaryMasks,
  compareCounts,
  meetsSegmentationTarget,
} from '../validationMetrics';

describe('métricas de validação independente', () => {
  it('calcula precisão, recall, F1 e IoU sem arredondar a evidência', () => {
    const metrics = compareBinaryMasks([1, 1, 0, 0], [1, 0, 1, 0]);
    expect(metrics).toMatchObject({ truePositive: 1, falsePositive: 1, falseNegative: 1, trueNegative: 1 });
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
    expect(metrics.f1).toBe(0.5);
    expect(metrics.iou).toBeCloseTo(1 / 3);
  });

  it('recusa máscaras de tamanhos diferentes', () => {
    expect(() => compareBinaryMasks([1], [1, 0])).toThrow('MASCARAS_COM_DIMENSOES_DIFERENTES');
  });

  it('trata referência com zero gotas sem inventar erro relativo', () => {
    expect(compareCounts(3, 0)).toEqual({ absoluteError: 3, relativeErrorPercent: null });
    expect(compareCounts(110, 100)).toEqual({ absoluteError: 10, relativeErrorPercent: 10 });
  });

  it('só aceita a meta quando precisão, recall e F1 atingem 95%', () => {
    expect(meetsSegmentationTarget({ precision: 0.95, recall: 0.95, f1: 0.95 })).toBe(true);
    expect(meetsSegmentationTarget({ precision: TARGET_SEGMENTATION_ACCURACY, recall: 0.94, f1: 0.96 })).toBe(false);
  });
});
