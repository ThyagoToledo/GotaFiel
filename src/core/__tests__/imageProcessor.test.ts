import { describe, it, expect } from 'vitest';
import {
  calculateCorrectedDiameterUm,
  calculateASABECategory,
  calculateVerdict,
  computeOtsuThreshold,
  rectifyPixels,
  binarizeImageBuffer,
  findConnectedComponents,
  buildHistogramBins,
  computeMetricsFromHistogram,
  convertComponentsToDropletItems,
} from '../imageProcessor';
import { CropCorners } from '../types';

describe('Spray Analysis Image Processing Pipeline - 20 Verification Tests', () => {
  // Test 1: Determinismo de processamento
  it('1. Determinismo: com as mesmas entradas, deve produzir rigorosamente as mesmas métricas', () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // Draw a 4x4 blue stain in the middle
    for (let y = 8; y <= 11; y++) {
      for (let x = 8; x <= 11; x++) {
        const idx = (y * width + x) * 4;
        pixels[idx] = 10;
        pixels[idx + 1] = 10;
        pixels[idx + 2] = 200; // High blue
        pixels[idx + 3] = 255;
      }
    }

    const { binaryMask: mask1 } = binarizeImageBuffer(pixels, width, height, 'chromatic', 0);
    const { binaryMask: mask2 } = binarizeImageBuffer(pixels, width, height, 'chromatic', 0);

    expect(mask1).toEqual(mask2);

    const comps1 = findConnectedComponents(mask1, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 10,
      mmPerPixel: 0.1,
    });
    const comps2 = findConnectedComponents(mask2, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 10,
      mmPerPixel: 0.1,
    });

    expect(comps1).toEqual(comps2);
  });

  // Test 2: Validação de escala com dimensões zero/negativas
  it('2. Validação de escala: deve lidar graciosamente com dimensões ou mmPerPixel zero e negativos', () => {
    const metricsZero = computeMetricsFromHistogram([], 0, 0, 0);
    expect(metricsZero.totalDroplets).toBe(0);
    expect(metricsZero.density).toBe(0);
    expect(metricsZero.coveragePercent).toBe(0);
    expect(metricsZero.verdict).toBe('RUIM');

    const metricsNeg = computeMetricsFromHistogram([{ pixelCount: 10, quantity: 2 }], -76, -26, -0.1);
    expect(metricsNeg.totalDroplets).toBe(0);
  });

  // Test 3: Precisão do Fator de Espalhamento
  it('3. Fator de Espalhamento: testa a fórmula exata DC = DL / (0.8419 + 0.000152*DL + 0.1758*ln(DL))', () => {
    expect(calculateCorrectedDiameterUm(0)).toBe(0);
    expect(calculateCorrectedDiameterUm(-50)).toBe(0);

    const DL = 200; // µm
    const expectedDenominator = 0.8419 + 0.000152 * 200 + 0.1758 * Math.log(200);
    const expectedDC = 200 / expectedDenominator;

    const actualDC = calculateCorrectedDiameterUm(200);
    expect(actualDC).toBeCloseTo(expectedDC, 5);
  });

  // Test 4: Binarização Cromática vs GOTAS Legacy
  it('4. Binarização: distingue método cromático B - max(R,G) vs GOTAS Legacy RGB Media', () => {
    const pixels = new Uint8ClampedArray(4 * 4); // 1 pixel
    // Pure blue pixel: R=0, G=0, B=255
    pixels[0] = 0;
    pixels[1] = 0;
    pixels[2] = 255;
    pixels[3] = 255;

    const binarizedChromatic = binarizeImageBuffer(pixels, 1, 1, 'chromatic', 0);
    expect(binarizedChromatic.stainValues[0]).toBe(255); // 255 - max(0, 0) = 255

    const binarizedLegacy = binarizeImageBuffer(pixels, 1, 1, 'gotas-legacy', 0);
    expect(binarizedLegacy.stainValues[0]).toBe(Math.round((0 + 0 + 255) / 3)); // Media RGB = 85
  });

  // Test 5: Filtragem de borda (discardBorder)
  it('5. Filtragem de borda: ignora gotas tocando as bordas quando discardBorder = true', () => {
    const width = 5;
    const height = 5;
    const mask = new Uint8Array(width * height);
    // Stain on top-left border (x=0, y=0)
    mask[0] = 1;

    const compsWithBorder = findConnectedComponents(mask, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 0,
      mmPerPixel: 0.1,
    });
    expect(compsWithBorder.length).toBe(0);

    const compsKeepBorder = findConnectedComponents(mask, width, height, {
      discardBorder: false,
      minAreaPx: 1,
      minDropletUm: 0,
      mmPerPixel: 0.1,
    });
    expect(compsKeepBorder.length).toBe(1);
    expect(compsKeepBorder[0].touchesBorder).toBe(true);
  });

  // Test 6: Filtragem por tamanho mínimo (minDropletUm)
  it('6. Filtragem por tamanho mínimo: ignora manchas menores que minDropletUm', () => {
    const width = 10;
    const height = 10;
    const mask = new Uint8Array(width * height);
    // 1 pixel stain inside center
    mask[5 * width + 5] = 1;

    const comps = findConnectedComponents(mask, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 500, // Very large min threshold
      mmPerPixel: 0.1,
    });

    expect(comps.length).toBe(1);
    expect(comps[0].included).toBe(false); // Filtered out
  });

  // Test 7: Cálculo dos percentis volumétricos (DV0.1, DV0.5, DV0.9) e Span
  it('7. Percentis volumétricos e Span: calcula DV0.1, DV0.5, DV0.9 e Span = (DV0.9 - DV0.1) / DV0.5', () => {
    const histogram = [
      { pixelCount: 5, quantity: 10 },
      { pixelCount: 20, quantity: 10 },
      { pixelCount: 50, quantity: 10 },
    ];

    const metrics = computeMetricsFromHistogram(histogram, 76, 26, 0.1);
    expect(metrics.dv01Um).toBeGreaterThan(0);
    expect(metrics.dv05Um).toBeGreaterThanOrEqual(metrics.dv01Um);
    expect(metrics.dv09Um).toBeGreaterThanOrEqual(metrics.dv05Um);
    const expectedSpan = Number(((metrics.dv09Um - metrics.dv01Um) / metrics.dv05Um).toFixed(2));
    expect(metrics.span).toBe(expectedSpan);
  });

  // Test 8: Porcentagem de cobertura e densidade de gotas
  it('8. Cobertura e Densidade: calcula densidade (gotas/cm²) e cobertura % corretamente', () => {
    // Card size 10mm x 10mm = 1 cm²
    const histogram = [{ pixelCount: 100, quantity: 50 }]; // 50 droplets
    const mmPerPx = 0.1; // Area per pixel = 0.01 mm² -> 100 px = 1 mm² stain each -> 50 mm² total stain area out of 100 mm² card

    const metrics = computeMetricsFromHistogram(histogram, 10, 10, mmPerPx);
    expect(metrics.totalDroplets).toBe(50);
    expect(metrics.density).toBe(50); // 50 droplets / 1 cm²
    expect(metrics.coveragePercent).toBe(50); // 50 mm² / 100 mm² = 50%
  });

  // Test 9: Descarte de amostras com zero gotas válidas
  it('9. Zero gotas válidas: retorna estrutura limpa sem NaN', () => {
    const metrics = computeMetricsFromHistogram([], 76, 26, 0.1);
    expect(metrics.totalDroplets).toBe(0);
    expect(metrics.density).toBe(0);
    expect(metrics.coveragePercent).toBe(0);
    expect(metrics.span).toBe(0);
    expect(metrics.verdict).toBe('RUIM');
  });

  // Test 10: Comportamento com imagem 100% branca e 100% preta
  it('10. Imagem 100% branca e 100% preta: processa sem falhas de divisão por zero', () => {
    const total = 100;
    const whitePixels = new Uint8ClampedArray(total * 4).fill(255);
    const blackPixels = new Uint8ClampedArray(total * 4).fill(0);

    const binarizedWhite = binarizeImageBuffer(whitePixels, 10, 10, 'chromatic', 0);
    expect(binarizedWhite.binaryMask.every((v) => v === 0)).toBe(true);

    const binarizedBlack = binarizeImageBuffer(blackPixels, 10, 10, 'chromatic', 0);
    expect(binarizedBlack.thresholdUsed).toBeDefined();
  });

  // Test 11: Limites de score do veredito
  it('11. Limites do veredito: avalia pontuações para EXCESSO, BOM, REGULAR e RUIM', () => {
    expect(calculateVerdict(85, 100).verdict).toBe('EXCESSO');
    expect(calculateVerdict(20, 70).verdict).toBe('BOM');
    expect(calculateVerdict(2, 15).verdict).toBe('REGULAR');
    expect(calculateVerdict(0.5, 5).verdict).toBe('RUIM');
  });

  // Test 12: Limiares das categorias ASABE
  it('12. Categorias ASABE: verifica classificação de tamanho de gota conforme vmd', () => {
    expect(calculateASABECategory(80)).toBe('Muito Fina');
    expect(calculateASABECategory(150)).toBe('Fina');
    expect(calculateASABECategory(220)).toBe('Média');
    expect(calculateASABECategory(300)).toBe('Grossa');
    expect(calculateASABECategory(400)).toBe('Muito Grossa');
    expect(calculateASABECategory(500)).toBe('Extremamente Grossa');
  });

  // Test 13: Desempenho e eficiência do algoritmo
  it('13. Desempenho: binarização de 10.000 pixels executa em menos de 50ms', () => {
    const size = 100;
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.floor(Math.random() * 256);
      pixels[i + 1] = Math.floor(Math.random() * 256);
      pixels[i + 2] = Math.floor(Math.random() * 256);
      pixels[i + 3] = 255;
    }

    const t0 = performance.now();
    binarizeImageBuffer(pixels, size, size, 'chromatic', 0);
    const t1 = performance.now();

    expect(t1 - t0).toBeLessThan(50);
  });

  // Test 14: Tratamento de entradas inválidas (NaN, Infinity)
  it('14. Entradas inválidas: tolera valores NaN ou Infinity', () => {
    expect(calculateCorrectedDiameterUm(NaN)).toBe(0);
    expect(calculateCorrectedDiameterUm(Infinity)).toBe(0);

    const verdict = calculateVerdict(NaN, Infinity);
    expect(verdict.verdict).toBe('RUIM');
    expect(verdict.score).toBe(0);
  });

  // Test 15: Coordenadas de Bounding Box
  it('15. Bounding Box: calcula minX, maxX, minY, maxY com precisão', () => {
    const width = 10;
    const height = 10;
    const mask = new Uint8Array(width * height);
    // Draw 2x3 block at x=2..3, y=4..6
    for (let y = 4; y <= 6; y++) {
      for (let x = 2; x <= 3; x++) {
        mask[y * width + x] = 1;
      }
    }

    const comps = findConnectedComponents(mask, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 0,
      mmPerPixel: 0.1,
    });

    expect(comps.length).toBe(1);
    expect(comps[0].minX).toBe(2);
    expect(comps[0].maxX).toBe(3);
    expect(comps[0].minY).toBe(4);
    expect(comps[0].maxY).toBe(6);
  });

  // Test 16: Cálculo do Centroide
  it('16. Centroide: calcula posição média dos pixels em percentual', () => {
    const width = 10;
    const height = 10;
    const mask = new Uint8Array(width * height);
    // 2x2 block at x=4..5, y=4..5 -> center is at 4.5, 4.5 -> 45%
    mask[4 * width + 4] = 1;
    mask[4 * width + 5] = 1;
    mask[5 * width + 4] = 1;
    mask[5 * width + 5] = 1;

    const comps = findConnectedComponents(mask, width, height, {
      discardBorder: true,
      minAreaPx: 1,
      minDropletUm: 0,
      mmPerPixel: 0.1,
    });

    expect(comps[0].centerX).toBe(45);
    expect(comps[0].centerY).toBe(45);
  });

  // Test 17: Acurácia do Histograma
  it('17. Histograma: agrupa componentes por contagem de pixels', () => {
    const components = [
      { pixelCount: 10, included: true },
      { pixelCount: 10, included: true },
      { pixelCount: 25, included: true },
      { pixelCount: 5, included: false }, // Discarded
    ];

    const bins = buildHistogramBins(components);
    expect(bins).toEqual([
      { pixelCount: 10, quantity: 2 },
      { pixelCount: 25, quantity: 1 },
    ]);
  });

  // Test 18: Cálculo do Volume em L/ha
  it('18. Volume L/ha: deriva o volume acumulado projetado por hectare', () => {
    const histogram = [{ pixelCount: 50, quantity: 100 }];
    const metrics = computeMetricsFromHistogram(histogram, 76, 26, 0.1);
    expect(metrics.estimatedVolumeLha).toBeGreaterThan(0);
    expect(Number.isFinite(metrics.estimatedVolumeLha)).toBe(true);
  });

  // Test 19: Conversão para DropletItem
  it('19. Conversão DropletItem: converte componentes em itens de exibição para inspeção manual', () => {
    const comps = [
      {
        id: 'drop-1',
        pixelCount: 12,
        areaMm2: 0.12,
        diameterUm: 320,
        centerX: 50,
        centerY: 50,
        minX: 4,
        maxX: 6,
        minY: 4,
        maxY: 6,
        touchesBorder: false,
        included: true,
      },
    ];

    const dropletItems = convertComponentsToDropletItems(comps, 100, 100);
    expect(dropletItems.length).toBe(1);
    expect(dropletItems[0].id).toBe('drop-1');
    expect(dropletItems[0].included).toBe(true);
    expect(dropletItems[0].diameterUm).toBe(320);
  });

  // Test 20: Retificação de perspectiva
  it('20. Retificação: mapeia pixels do quad selecionado para canvas retificado', () => {
    const srcWidth = 10;
    const srcHeight = 10;
    const srcPixels = new Uint8ClampedArray(srcWidth * srcHeight * 4).fill(128);

    const corners: CropCorners = {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 100 },
      bl: { x: 0, y: 100 },
    };

    const targetWidth = 5;
    const targetHeight = 5;
    const rectified = rectifyPixels(srcPixels, srcWidth, srcHeight, corners, targetWidth, targetHeight);

    expect(rectified.length).toBe(targetWidth * targetHeight * 4);
    expect(rectified[0]).toBe(128);
  });
});
