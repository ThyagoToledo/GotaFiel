import { describe, it, expect } from 'vitest';
import { AnalysisData } from '../../types';
import {
  binarizeImageBuffer,
  computeMetricsFromHistogram,
  rectifyPixels,
} from '../imageProcessor';
import { CropCorners } from '../types';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';

describe('Auditoria Corretiva - Spray Analysis Core Verification', () => {
  const baseMockAnalysis: AnalysisData = {
    id: 'ana-audit-1',
    title: 'Amostra Excesso Audit',
    date: 'Hoje',
    timestamp: Date.now(),
    imageUrl: 'data:image/png;base64,mock',
    cardColor: 'Amarelo',
    cardSizeMm: { width: 10, height: 10 }, // 1 cm²
    dpi: 300,
    sensitivity: 0,
    mmPerPixel: 0.1,
    rectWidthPx: 100,
    rectHeightPx: 100,
    totalDroplets: 0,
    density: 0,
    coveragePercent: 0,
    span: 0,
    vmdUm: 0,
    dv01Um: 0,
    dv09Um: 0,
    estimatedVolumeLha: 0,
    verdict: 'RUIM',
    verdictScore: 0,
    asabeCategory: 'Média',
    droplets: [
      { id: 'd1', x: 20, y: 30, sizePx: 10, diameterUm: 200, included: true, pixelCount: 100, areaMm2: 1.00 },
      { id: 'd2', x: 50, y: 50, sizePx: 15, diameterUm: 300, included: true, pixelCount: 200, areaMm2: 2.00 },
      { id: 'd3', x: 80, y: 70, sizePx: 20, diameterUm: 400, included: true, pixelCount: 300, areaMm2: 3.00 },
    ],
  };

  // Pre-calculate baseline metrics to simulate Step 05 result
  const initialAnalysis05 = recalculateAnalysisData(baseMockAnalysis);

  // 1. Tela 05 e Tela 06 produzem métricas idênticas com zero gotas excluídas
  it('Tela 05 e Tela 06 produzem métricas idênticas com zero gotas excluídas', () => {
    const step06Result = recalculateAnalysisData(initialAnalysis05);

    expect(step06Result.totalDroplets).toBe(initialAnalysis05.totalDroplets);
    expect(step06Result.coveragePercent).toBe(initialAnalysis05.coveragePercent);
    expect(step06Result.density).toBe(initialAnalysis05.density);
    expect(step06Result.span).toBe(initialAnalysis05.span);
    expect(step06Result.vmdUm).toBe(initialAnalysis05.vmdUm);
    expect(step06Result.dv01Um).toBe(initialAnalysis05.dv01Um);
    expect(step06Result.dv09Um).toBe(initialAnalysis05.dv09Um);
  });

  // 2. Excluir uma gota altera somente os agregados correspondentes
  it('Excluir uma gota altera métricas agregadas', () => {
    const withOneExcluded = {
      ...initialAnalysis05,
      droplets: initialAnalysis05.droplets.map((d, i) => (i === 0 ? { ...d, included: false } : d)),
    };

    const recalculated = recalculateAnalysisData(withOneExcluded);
    expect(recalculated.totalDroplets).toBe(2);
    expect(recalculated.coveragePercent).toBeLessThan(initialAnalysis05.coveragePercent);
    expect(recalculated.density).toBeLessThan(initialAnalysis05.density);
  });

  // 3. Restaurar todas recupera exatamente os valores originais
  it('Restaurar todas recupera exatamente os valores originais', () => {
    const withExcluded = {
      ...initialAnalysis05,
      droplets: initialAnalysis05.droplets.map((d) => ({ ...d, included: false })),
    };

    const restored = {
      ...withExcluded,
      droplets: withExcluded.droplets.map((d) => ({ ...d, included: true })),
    };

    const recalculated = recalculateAnalysisData(restored);
    expect(recalculated.totalDroplets).toBe(initialAnalysis05.totalDroplets);
    expect(recalculated.coveragePercent).toBe(initialAnalysis05.coveragePercent);
    expect(recalculated.density).toBe(initialAnalysis05.density);
    expect(recalculated.span).toBe(initialAnalysis05.span);
  });

  it('Inspeção manual preserva a qualidade original da captura', () => {
    const quality = {
      status: 'LIMITADA' as const,
      effectiveDpi: 450,
      orientationCorrected: false,
      coverageReliable: true,
      countDensityReliable: false,
      sizeVolumeReliable: false,
      warnings: ['Resolução efetiva limitada.'],
      algorithmVersion: '3.2.0-alpha.1',
      captureQuality: {
        cardOccupancyPercent: 42,
        focusLaplacianVariance: 12.5,
        illuminationVariationPercent: 8,
        darkPixelPercent: 1,
        highlightPixelPercent: 0.2,
        sampleCount: 1000,
        version: 'capture-signals-v1' as const,
        calibrationStatus: 'NAO_CALIBRADO' as const,
      },
    };
    const withQuality = { ...initialAnalysis05, measurementQuality: quality };
    const changed = {
      ...withQuality,
      droplets: withQuality.droplets.map((drop, index) => ({ ...drop, included: index !== 0 })),
    };

    const recalculated = recalculateAnalysisData(changed);

    expect(recalculated.measurementQuality).toEqual(quality);
  });

  // 4. Otsu=0 não transforma todo o fundo em gota
  it('Otsu=0 não transforma todo o fundo com stain=0 em gota', () => {
    const pixels = new Uint8ClampedArray(10 * 10 * 4); // all zero RGB values (stain = 0)
    const { binaryMask } = binarizeImageBuffer(pixels, 10, 10, 'chromatic', 0);

    // Background pixels with stain = 0 must NOT become droplets
    expect(binaryMask.every((val) => val === 0)).toBe(true);
  });

  // 5. Cobertura não muda quando somente a dimensão física do cartão muda
  //    NOTA: este caso usa escalas isotrópicas em ambos os lados, então não detecta
  //    o defeito da média aritmética. A cobertura de verdade é coberta em
  //    calibrationInvariance.test.ts, que varia o cartão mantendo o raster fixo.
  it('Cobertura não muda quando somente a dimensão física do cartão muda com mesma proporção de píxeis', () => {
    const histogram = [{ pixelCount: 100, quantity: 10 }];
    const metricsA = computeMetricsFromHistogram(histogram, 100, 100, 1000, 1000);
    const metricsB = computeMetricsFromHistogram(histogram, 200, 200, 1000, 1000);

    expect(metricsA.coveragePercent).toBe(0.1);
    expect(metricsB.coveragePercent).toBe(0.1);
    expect(metricsA.coveragePercent).toBe(metricsB.coveragePercent);
  });

  // 6. Densidade, diâmetros e volume respondem corretamente à mudança de escala
  it('Densidade, diâmetros e volume respondem corretamente à mudança de escala', () => {
    const histogram = [{ pixelCount: 100, quantity: 10 }];
    const metricsA = computeMetricsFromHistogram(histogram, 10, 10, 100, 100);
    const metricsB = computeMetricsFromHistogram(histogram, 20, 20, 100, 100);

    expect(metricsA.density).toBe(10);
    expect(metricsB.density).toBe(2.5);
    expect(metricsB.dv05Um).toBeGreaterThan(metricsA.dv05Um);
    expect(metricsB.estimatedVolumeLha).toBeGreaterThan(metricsA.estimatedVolumeLha);
  });

  // 7. Compatibilidade GOTAS usa média RGB e o limiar histórico, não Otsu
  it('Compatibilidade GOTAS usa média RGB e o limiar histórico', () => {
    const pixels = new Uint8ClampedArray(4 * 4);
    pixels[0] = 30;
    pixels[1] = 60;
    pixels[2] = 90;
    pixels[3] = 255;

    const result = binarizeImageBuffer(pixels, 1, 1, 'gotas-legacy', 0);
    expect(result.stainValues[0]).toBe(60);
    expect(result.thresholdUsed).toBe(20);
    expect(result.binaryMask[0]).toBe(0);
  });

  // 8. Homografia mantém a medição em uma imagem inclinada
  it('Homografia 3x3 retifica quad inclinado', () => {
    const srcWidth = 100;
    const srcHeight = 100;
    const srcPixels = new Uint8ClampedArray(srcWidth * srcHeight * 4).fill(200);

    const corners: CropCorners = {
      tl: { x: 10, y: 10 },
      tr: { x: 90, y: 15 },
      br: { x: 85, y: 85 },
      bl: { x: 15, y: 90 },
    };

    const rectified = rectifyPixels(srcPixels, srcWidth, srcHeight, corners, 50, 50);
    expect(rectified.length).toBe(50 * 50 * 4);
    expect(rectified[0]).toBe(200);
  });
});
