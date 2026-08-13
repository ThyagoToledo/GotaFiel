import { describe, it, expect } from 'vitest';
import {
  calculateWetBulbC,
  calculateWeatherRisk,
  calculateVolumeDeCalda,
  evaluateNozzles,
  resolveNozzleAction,
  sanitizeNozzleCriteria,
} from '../sprayAnalytics';
import { DEFAULT_NOZZLE_CRITERIA, NozzleCriteria } from '../../types';

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

  it('sem critério explícito usa o padrão de fábrica', () => {
    const semCriterio = evaluateNozzles([800, 800, 880, 704]);
    const comPadrao = evaluateNozzles([800, 800, 880, 704], DEFAULT_NOZZLE_CRITERIA);
    expect(semCriterio).toEqual(comPadrao);
  });

  it('critério configurado altera a classificação', () => {
    const rigoroso: NozzleCriteria = {
      mode: 'absoluto',
      cleanThresholdPercent: 3,
      replaceThresholdPercent: 5,
    };
    // média 796 → +1%, +1%, +11%, -12%
    const padrao = evaluateNozzles([800, 800, 830, 760]);
    const estrito = evaluateNozzles([800, 800, 830, 760], rigoroso);
    // média 797 → +0%, +0%, +4%, -5%
    expect(padrao.nozzleDeviations[2].actionRequired).toBe('OK');
    expect(estrito.nozzleDeviations[2].actionRequired).toBe('LIMPAR');
    expect(estrito.nozzleDeviations[3].actionRequired).toBe('SUBSTITUIR');
  });
});

describe('resolveNozzleAction', () => {
  const absoluto = DEFAULT_NOZZLE_CRITERIA;
  const direcional: NozzleCriteria = { ...DEFAULT_NOZZLE_CRITERIA, mode: 'direcional' };

  it('modo absoluto ignora o sentido do desvio', () => {
    expect(resolveNozzleAction(8, absoluto)).toBe('LIMPAR');
    expect(resolveNozzleAction(-8, absoluto)).toBe('LIMPAR');
    expect(resolveNozzleAction(12, absoluto)).toBe('SUBSTITUIR');
    expect(resolveNozzleAction(-12, absoluto)).toBe('SUBSTITUIR');
  });

  it('modo direcional manda substituir qualquer bico acima da média', () => {
    expect(resolveNozzleAction(7, direcional)).toBe('SUBSTITUIR');
    expect(resolveNozzleAction(30, direcional)).toBe('SUBSTITUIR');
  });

  it('modo direcional manda limpar bico obstruído até o limite maior', () => {
    expect(resolveNozzleAction(-7, direcional)).toBe('LIMPAR');
    expect(resolveNozzleAction(-9, direcional)).toBe('LIMPAR');
    expect(resolveNozzleAction(-10, direcional)).toBe('SUBSTITUIR');
  });

  it('desvio abaixo do primeiro limiar é OK nos dois modos', () => {
    expect(resolveNozzleAction(5, absoluto)).toBe('OK');
    expect(resolveNozzleAction(5, direcional)).toBe('OK');
    expect(resolveNozzleAction(-5, direcional)).toBe('OK');
  });
});

describe('sanitizeNozzleCriteria', () => {
  it('sem valor salvo devolve o padrão', () => {
    expect(sanitizeNozzleCriteria(null)).toEqual(DEFAULT_NOZZLE_CRITERIA);
    expect(sanitizeNozzleCriteria(undefined)).toEqual(DEFAULT_NOZZLE_CRITERIA);
  });

  it('modo desconhecido volta para absoluto', () => {
    expect(sanitizeNozzleCriteria({ mode: 'qualquer' } as never).mode).toBe('absoluto');
  });

  it('nunca deixa substituir abaixo de limpar', () => {
    const r = sanitizeNozzleCriteria({
      mode: 'absoluto',
      cleanThresholdPercent: 15,
      replaceThresholdPercent: 5,
    });
    expect(r.replaceThresholdPercent).toBeGreaterThanOrEqual(r.cleanThresholdPercent);
  });

  it('rejeita valores não numéricos, zero, negativos e acima de 100', () => {
    const r = sanitizeNozzleCriteria({
      mode: 'direcional',
      cleanThresholdPercent: -4,
      replaceThresholdPercent: 500,
    });
    expect(r.mode).toBe('direcional');
    expect(r.cleanThresholdPercent).toBe(DEFAULT_NOZZLE_CRITERIA.cleanThresholdPercent);
    expect(r.replaceThresholdPercent).toBe(100);

    const nan = sanitizeNozzleCriteria({ cleanThresholdPercent: NaN, replaceThresholdPercent: 0 });
    expect(nan).toEqual(DEFAULT_NOZZLE_CRITERIA);
  });
});
