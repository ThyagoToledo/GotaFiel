import { describe, it, expect } from 'vitest';
import {
  calculateWetBulbC,
  calculateWeatherRisk,
  calculateVolumeDeCalda,
  evaluateNozzles,
} from '../sprayAnalytics';

describe('calculateWetBulbC (aproximação de Stull)', () => {
  // Valores de referência calculados independentemente pela fórmula de Stull (2011).
  it('26 °C / 65% UR → bulbo úmido ~21,1 °C', () => {
    expect(calculateWetBulbC(26, 65)).toBeCloseTo(21.1, 0);
  });

  it('30 °C / 40% UR → bulbo úmido ~20,2 °C', () => {
    const tw = calculateWetBulbC(30, 40);
    expect(tw).toBeGreaterThan(19);
    expect(tw).toBeLessThan(22);
  });

  it('bulbo úmido nunca excede o bulbo seco', () => {
    for (const t of [10, 20, 30, 40]) {
      for (const rh of [20, 50, 80, 99]) {
        expect(calculateWetBulbC(t, rh)).toBeLessThanOrEqual(t + 0.01);
      }
    }
  });

  it('com UR ~100% o bulbo úmido tende ao bulbo seco', () => {
    expect(calculateWetBulbC(25, 99)).toBeCloseTo(25, 0);
  });
});

describe('calculateWeatherRisk', () => {
  it('condições da tela padrão (26 °C, 65%, 6 km/h) são ótimas com Delta T ~4,9', () => {
    const r = calculateWeatherRisk(26, 65, 6);
    expect(r.status).toBe('OPTIMAL');
    expect(r.deltaT).toBeGreaterThan(4);
    expect(r.deltaT).toBeLessThan(6);
  });

  it('vento abaixo de 2 km/h alerta inversão térmica', () => {
    expect(calculateWeatherRisk(26, 65, 1).status).toBe('INVERSION_WARNING');
  });

  it('vento acima de 10 km/h alerta deriva', () => {
    expect(calculateWeatherRisk(26, 65, 12).status).toBe('DRIFT_WARNING');
  });

  it('ar quente e seco alerta evaporação', () => {
    const r = calculateWeatherRisk(34, 30, 6);
    expect(r.status).toBe('EVAPORATION_WARNING');
    expect(r.deltaT).toBeGreaterThan(8);
  });
});

describe('calculateVolumeDeCalda', () => {
  it('fórmula clássica: (0,8 × 600) / (0,5 m × 6,5 km/h) = 147,7 L/ha', () => {
    expect(calculateVolumeDeCalda(0.8, 50, 6.5)).toBe(147.7);
  });

  it('entradas inválidas retornam 0', () => {
    expect(calculateVolumeDeCalda(0, 50, 6.5)).toBe(0);
    expect(calculateVolumeDeCalda(0.8, 0, 6.5)).toBe(0);
    expect(calculateVolumeDeCalda(0.8, 50, 0)).toBe(0);
    expect(calculateVolumeDeCalda(NaN, 50, 6.5)).toBe(0);
  });
});

describe('evaluateNozzles', () => {
  it('classifica por desvio absoluto: ≥10% substituir, ≥6% limpar', () => {
    const result = evaluateNozzles([800, 800, 880, 704]);
    // média = 796 → desvios ~ +1%, +1%, +11%, -12%
    expect(result.nozzleDeviations[0].actionRequired).toBe('OK');
    expect(result.nozzleDeviations[2].actionRequired).toBe('SUBSTITUIR');
    expect(result.nozzleDeviations[3].actionRequired).toBe('SUBSTITUIR');
  });

  it('lista vazia não explode', () => {
    const result = evaluateNozzles([]);
    expect(result.overallAvgMl).toBe(0);
    expect(result.nozzleDeviations).toEqual([]);
  });
});
