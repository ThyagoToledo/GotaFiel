import { describe, expect, it } from 'vitest';
import { assessMeasurementQuality } from '../measurementQuality';

function assess(effectiveDpi: number, coveragePercent = 5) {
  const cardWidthMm = 76;
  const cardHeightMm = 26;
  return assessMeasurementQuality({
    quadWidthPx: (cardWidthMm / 25.4) * effectiveDpi,
    quadHeightPx: (cardHeightMm / 25.4) * effectiveDpi,
    cardWidthMm,
    cardHeightMm,
    coveragePercent,
    orientationCorrected: false,
  });
}

describe('assessMeasurementQuality', () => {
  it('marca resolução abaixo de 300 dpi como inconclusiva', () => {
    const result = assess(299);
    expect(result.status).toBe('INCONCLUSIVA');
    expect(result.coverageReliable).toBe(false);
    expect(result.countDensityReliable).toBe(false);
    expect(result.sizeVolumeReliable).toBe(false);
  });

  it('marca 300 a 599 dpi como limitada', () => {
    const result = assess(450);
    expect(result.status).toBe('LIMITADA');
    expect(result.coverageReliable).toBe(true);
    expect(result.countDensityReliable).toBe(false);
  });

  it('aceita a resolução a partir de 600 dpi em baixa sobreposição', () => {
    const result = assess(600, 10);
    expect(result.status).toBe('ADEQUADA');
    expect(result.countDensityReliable).toBe(true);
    expect(result.sizeVolumeReliable).toBe(true);
  });

  it('mantém apenas cobertura confiável acima de 20% de sobreposição', () => {
    const result = assess(600, 20.1);
    expect(result.status).toBe('LIMITADA');
    expect(result.coverageReliable).toBe(true);
    expect(result.countDensityReliable).toBe(false);
    expect(result.sizeVolumeReliable).toBe(false);
  });
});
