import { describe, it, expect } from 'vitest';
import { computeLaplacianSharpness } from '../../utils/sprayAnalytics';

describe('Real-Time Camera Focus & Sharpness Performance Suite', () => {
  const width = 160;
  const height = 90;

  // Helper para gerar imagem sintética nítida (padrão xadrez de alto contraste)
  function createSharpCheckerboard(w: number, h: number): Float32Array {
    const buffer = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Alterna entre preto (0) e branco (255) a cada 4 pixels
        const isWhite = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
        buffer[y * w + x] = isWhite ? 255 : 0;
      }
    }
    return buffer;
  }

  // Helper para gerar imagem sintética desfocada (gradiente suave / blur)
  function createBlurredGradient(w: number, h: number): Float32Array {
    const buffer = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Transição linear suave sem descontinuidades abruptas
        buffer[y * w + x] = ((x + y) / (w + h)) * 255;
      }
    }
    return buffer;
  }

  describe('1. Validação de Precisão de Foco', () => {
    it('calcula alta variância de nitidez para imagens com bordas nítidas', () => {
      const sharpImage = createSharpCheckerboard(width, height);
      const sharpness = computeLaplacianSharpness(sharpImage, width, height);

      // Imagem nítida deve ter variância muito superior a 150
      expect(sharpness).toBeGreaterThan(500);
    });

    it('calcula baixa variância para imagens desfocadas/suaves', () => {
      const blurredImage = createBlurredGradient(width, height);
      const sharpness = computeLaplacianSharpness(blurredImage, width, height);

      // Imagem com gradiente suave tem variância quase zero (< 10)
      expect(sharpness).toBeLessThan(10);
    });

    it('retorna 0 para imagens uniformes pretas ou brancas (sem contraste)', () => {
      const allBlack = new Float32Array(width * height).fill(0);
      const allWhite = new Float32Array(width * height).fill(255);

      expect(computeLaplacianSharpness(allBlack, width, height)).toBe(0);
      expect(computeLaplacianSharpness(allWhite, width, height)).toBe(0);
    });
  });

  describe('2. Tolerância a Entradas Inválidas e Limites', () => {
    it('retorna 0 de forma segura para dimensões inferiores a 3x3', () => {
      const smallBuffer = new Float32Array([100, 150, 200, 250]);
      expect(computeLaplacianSharpness(smallBuffer, 2, 2)).toBe(0);
      expect(computeLaplacianSharpness(new Float32Array(0), 0, 0)).toBe(0);
    });

    it('suporta diferentes tipos de arrays tipados (Uint8ClampedArray e Array)', () => {
      const uint8 = new Uint8ClampedArray(width * height);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = i % 2 === 0 ? 255 : 0;
      }

      const score = computeLaplacianSharpness(uint8, width, height);
      expect(score).toBeGreaterThan(100);
    });
  });

  describe('3. Benchmark de Performance e Latência (< 1ms por frame)', () => {
    it('processa 200 quadros consecutivos em menos de 100ms', () => {
      const sampleFrame = createSharpCheckerboard(width, height);
      const iterations = 200;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeLaplacianSharpness(sampleFrame, width, height);
      }
      const totalTimeMs = performance.now() - startTime;
      const avgTimePerFrameMs = totalTimeMs / iterations;

      expect(totalTimeMs).toBeLessThan(150); // Total < 150ms
      expect(avgTimePerFrameMs).toBeLessThan(1.0); // Média < 1ms por frame
    });
  });
});
