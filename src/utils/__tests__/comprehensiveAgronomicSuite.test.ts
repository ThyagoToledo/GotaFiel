import { describe, it, expect } from 'vitest';
import {
  calculateRequiredNozzleFlow,
  calculateIsoNozzlePressure,
  calculateCanopyPenetration,
} from '../sprayAnalytics';

describe('Comprehensive Agronomic Calculations & Stress Tests', () => {
  describe('1. Cálculo de Vazão Requerida por Bico (L/min)', () => {
    it('calcula vazão padrão com precisão dimensional', () => {
      // 100 L/ha, 50 cm, 12 km/h -> 1.000 L/min
      const flow = calculateRequiredNozzleFlow(100, 50, 12);
      expect(flow).toBe(1.0);
    });

    it('suporta velocidades baixas (ex: pulverização em pomares/café)', () => {
      // 400 L/ha, 80 cm, 4.5 km/h -> (400 * 0.8 * 4.5) / 600 = 1440 / 600 = 2.4 L/min
      const flow = calculateRequiredNozzleFlow(400, 80, 4.5);
      expect(flow).toBe(2.4);
    });

    it('suporta velocidades elevadas (ex: autopropelido a 25 km/h)', () => {
      // 70 L/ha, 50 cm, 25 km/h -> (70 * 0.5 * 25) / 600 = 875 / 600 = 1.4583 L/min
      const flow = calculateRequiredNozzleFlow(70, 50, 25);
      expect(flow).toBeCloseTo(1.4583, 3);
    });

    it('retorna 0 para entradas inválidas (zeros, negativos, NaN)', () => {
      expect(calculateRequiredNozzleFlow(0, 50, 12)).toBe(0);
      expect(calculateRequiredNozzleFlow(100, -50, 12)).toBe(0);
      expect(calculateRequiredNozzleFlow(100, 50, NaN)).toBe(0);
      expect(calculateRequiredNozzleFlow(100, 50, -10)).toBe(0);
    });
  });

  describe('2. Lei Hidráulica e Pressão ISO 10625', () => {
    it('calcula pressão exata de 3.00 bar quando vazão coincide com a nominal', () => {
      const result = calculateIsoNozzlePressure(1.20, 1.20);
      expect(result.pressureBar).toBe(3.0);
      expect(result.pressurePsi).toBeCloseTo(43.5, 1);
      expect(result.status).toBe('ideal');
      expect(result.statusLabel).toContain('Ideal');
    });

    it('classifica faixas de pressão (Ideal, Aceitável e Inadequada)', () => {
      // Ponta 02 Amarela (0.80 L/min @ 3 bar)
      // Vazão 0.70 L/min -> P = 3.0 * (0.70/0.80)^2 = 2.296 bar -> Ideal (2.0 a 4.0)
      const resIdeal = calculateIsoNozzlePressure(0.70, 0.80);
      expect(resIdeal.status).toBe('ideal');

      // Vazão 0.50 L/min -> P = 3.0 * (0.50/0.80)^2 = 1.17 bar -> Inadequada (< 1.5)
      const resBaixa = calculateIsoNozzlePressure(0.50, 0.80);
      expect(resBaixa.status).toBe('inadequate');

      // Vazão 1.05 L/min -> P = 3.0 * (1.05/0.80)^2 = 5.16 bar -> Inadequada (> 5.0)
      const resAlta = calculateIsoNozzlePressure(1.05, 0.80);
      expect(resAlta.status).toBe('inadequate');

      // Vazão 0.95 L/min -> P = 3.0 * (0.95/0.80)^2 = 4.22 bar -> Aceitável (4.0 a 5.0)
      const resAceitavel = calculateIsoNozzlePressure(0.95, 0.80);
      expect(resAceitavel.status).toBe('acceptable');
    });

    it('trata valores nulos ou inválidos com retorno seguro', () => {
      const invalid = calculateIsoNozzlePressure(0, 0.80);
      expect(invalid.status).toBe('inadequate');
      expect(invalid.pressureBar).toBe(0);
    });
  });

  describe('3. Diagnóstico de Penetração no Dossel', () => {
    it('classifica penetração excelente (>= 40%)', () => {
      const eval1 = calculateCanopyPenetration(50, 25);
      expect(eval1.penetrationRate).toBe(50.0);
      expect(eval1.classification).toBe('excelente');
      expect(eval1.message).toContain('Excelente penetração');
    });

    it('classifica penetração moderada (20% a 39.9%)', () => {
      const eval2 = calculateCanopyPenetration(70, 21);
      expect(eval2.penetrationRate).toBe(30.0);
      expect(eval2.classification).toBe('moderada');
    });

    it('classifica penetração deficiente (< 20%) com alerta de escape de doenças', () => {
      const eval3 = calculateCanopyPenetration(80, 8);
      expect(eval3.penetrationRate).toBe(10.0);
      expect(eval3.classification).toBe('deficiente');
      expect(eval3.message).toContain('escape de doenças');
    });

    it('retorna inconclusiva quando a densidade no topo é 0 (prevenção de divisão por zero)', () => {
      const evalZero = calculateCanopyPenetration(0, 10);
      expect(evalZero.penetrationRate).toBeNull();
      expect(evalZero.classification).toBe('inconclusiva');
    });

    it('trata densidades negativas ou NaN de forma segura', () => {
      const evalNeg = calculateCanopyPenetration(-50, 10);
      expect(evalNeg.penetrationRate).toBeNull();
      expect(evalNeg.classification).toBe('inconclusiva');
    });
  });
});
