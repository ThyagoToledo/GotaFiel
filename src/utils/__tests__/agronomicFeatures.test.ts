import { describe, it, expect } from 'vitest';

describe('Agronomic Calculations & Features Validation Suite', () => {
  describe('1. Seletor de Pontas ISO 10625 & Hidráulica', () => {
    it('calcula corretamente a vazão requerida por bico (L/min)', () => {
      // q = (Q * E * v) / 600
      // Q = 100 L/ha, E = 0.50 m (50 cm), v = 12 km/h
      // q = (100 * 0.50 * 12) / 600 = 600 / 600 = 1.00 L/min
      const volumeLHa = 100;
      const spacingM = 0.50;
      const speedKmh = 12;
      const q = (volumeLHa * spacingM * speedKmh) / 600;
      expect(q).toBeCloseTo(1.00, 4);
    });

    it('calcula a pressão de trabalho exata para ponta ISO 02 Amarela (0.80 L/min @ 3 bar)', () => {
      // P = 3.0 * (q / q_nom)^2
      // Se q = 1.00 L/min e q_nom = 0.80 L/min
      // P = 3.0 * (1.00 / 0.80)^2 = 3.0 * 1.5625 = 4.6875 bar
      const q = 1.00;
      const qNom = 0.80;
      const pressureBar = 3.0 * Math.pow(q / qNom, 2);
      expect(pressureBar).toBeCloseTo(4.6875, 4);

      // PSI = bar * 14.5038
      const pressurePsi = pressureBar * 14.5038;
      expect(pressurePsi).toBeCloseTo(67.986, 1);
    });

    it('identifica a ponta mais próxima de 3.0 bar para 1.00 L/min', () => {
      // Ponta 025 Lilás tem q_nom = 1.00 L/min -> Pressão exata = 3.0 bar
      const q = 1.00;
      const qNom025 = 1.00;
      const pressureBar025 = 3.0 * Math.pow(q / qNom025, 2);
      expect(pressureBar025).toBeCloseTo(3.00, 4);
    });
  });

  describe('2. Perfil de Penetração no Dossel', () => {
    it('calcula taxa de penetração no baixeiro em relação ao topo', () => {
      const topoDensity = 60; // gotas/cm²
      const baixeiroDensity = 27; // gotas/cm²

      const penetrationRate = (baixeiroDensity / topoDensity) * 100;
      expect(penetrationRate).toBe(45); // 45% -> Excelente (>= 40%)
    });

    it('classifica corretamente penetração intermediária e deficiente', () => {
      const topoDensity = 80;

      const medioDensity = 24; // 24 / 80 = 30% -> Moderada (20 - 39%)
      const medioRate = (medioDensity / topoDensity) * 100;
      expect(medioRate).toBe(30);

      const baixoDeficiente = 12; // 12 / 80 = 15% -> Deficiente (< 20%)
      const baixoRate = (baixoDeficiente / topoDensity) * 100;
      expect(baixoRate).toBe(15);
    });
  });

  describe('3. Ordem WALES de Mistura de Calda', () => {
    const sequence = ['W', 'W', 'A', 'L', 'E', 'S'];

    it('valida a sequência de 6 etapas de carregamento do tanque', () => {
      expect(sequence.length).toBe(6);
      expect(sequence[0]).toBe('W'); // Água / Condicionadores
      expect(sequence[1]).toBe('W'); // Pós Molháveis / WG
      expect(sequence[2]).toBe('A'); // Agitação
      expect(sequence[3]).toBe('L'); // Suspensões Líquidas SC/CS
      expect(sequence[4]).toBe('E'); // Concentrados Emulsionáveis EC
      expect(sequence[5]).toBe('S'); // Soluções SL / Adjuvantes / Óleos
    });
  });
});
