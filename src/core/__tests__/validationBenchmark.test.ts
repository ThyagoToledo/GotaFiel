import { describe, expect, it } from 'vitest';
import { runAnalysisCore } from '../analysisCore';
import {
  aggregateValidationBatch,
  compareBinaryMasks,
  compareCounts,
  compareCoverage,
  meetsFullValidationCriteria,
  meetsSegmentationTarget,
} from '../validationMetrics';
import { AnalysisParams, CropCorners } from '../types';

const CARD_W_MM = 76;
const CARD_H_MM = 26;
const RASTER_W = 760;
const RASTER_H = 260;

const FULL_CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

interface SyntheticDropletDef {
  cx: number;
  cy: number;
  radius: number;
}

/**
 * Cria uma imagem sintética de cartão hidrossensível amarelo com gotas azuis e sua
 * respectiva máscara binária exata de verdade-terreno (ground truth).
 */
function createSyntheticGroundTruthCard(
  width: number,
  height: number,
  droplets: SyntheticDropletDef[],
  options: {
    shadowGradient?: boolean;
    noiseLevel?: number;
    addLinearFiber?: boolean;
  } = {}
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const groundTruthMask = new Uint8Array(width * height);

  // Fundo padrão amarelo do papel hidrossensível
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let illumination = 1.0;
      if (options.shadowGradient) {
        // Gradiente de iluminação: 1.0 na esquerda até 0.45 na direita (sombra forte)
        illumination = 1.0 - 0.55 * (x / width);
      }

      const noise = options.noiseLevel ? (Math.random() - 0.5) * options.noiseLevel : 0;
      pixels[idx] = Math.max(0, Math.min(255, Math.round((240 + noise) * illumination)));     // R
      pixels[idx + 1] = Math.max(0, Math.min(255, Math.round((220 + noise) * illumination))); // G
      pixels[idx + 2] = Math.max(0, Math.min(255, Math.round((45 + noise) * illumination)));  // B
      pixels[idx + 3] = 255;
    }
  }

  // Desenha as gotas circulares na imagem e na máscara de referência
  for (const drop of droplets) {
    const minX = Math.max(0, Math.floor(drop.cx - drop.radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(drop.cx + drop.radius + 1));
    const minY = Math.max(0, Math.floor(drop.cy - drop.radius - 1));
    const maxY = Math.min(height - 1, Math.ceil(drop.cy + drop.radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x - drop.cx, y - drop.cy);
        if (dist <= drop.radius) {
          const idx = (y * width + x) * 4;
          const maskIdx = y * width + x;
          groundTruthMask[maskIdx] = 1;

          let illumination = 1.0;
          if (options.shadowGradient) {
            illumination = 1.0 - 0.55 * (x / width);
          }

          // Cor azul escura de mancha reagida no papel hidrossensível
          pixels[idx] = Math.max(0, Math.min(255, Math.round(35 * illumination)));     // R
          pixels[idx + 1] = Math.max(0, Math.min(255, Math.round(40 * illumination))); // G
          pixels[idx + 2] = Math.max(0, Math.min(255, Math.round(180 * illumination)));// B
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  // Opcional: Adiciona fibra/risco linear não-gota (alta excentricidade)
  if (options.addLinearFiber) {
    const fiberX = Math.floor(width * 0.5);
    const fiberY = Math.floor(height * 0.2);
    for (let dy = 0; dy < 40; dy++) {
      const idx = ((fiberY + dy) * width + fiberX) * 4;
      pixels[idx] = 40;
      pixels[idx + 1] = 40;
      pixels[idx + 2] = 40;
      pixels[idx + 3] = 255;
      // Não marca como gota na verdade-terreno porque é um risco/fibra
    }
  }

  return { pixels, groundTruthMask, dropletCount: droplets.length };
}

describe('Bateria de Validação Científica — Meta de 95% de Precisão/Recall/F1', () => {
  it('1. Atinge >= 95% de precisão, recall e F1 em padrão de calibração padrão', () => {
    // 25 gotas de diâmetros variados (5 px a 18 px de raio) distribuídas no cartão
    const droplets: SyntheticDropletDef[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        droplets.push({
          cx: 60 + col * 150,
          cy: 35 + row * 48,
          radius: 5 + (row + col) * 1.5,
        });
      }
    }

    const { pixels, groundTruthMask, dropletCount } = createSyntheticGroundTruthCard(
      RASTER_W,
      RASTER_H,
      droplets
    );

    const params: AnalysisParams = {
      method: 'hybrid',
      thresholdAdjustment: 0,
      minAreaPx: 5,
      minDropletUm: 0,
      discardBorder: false,
      normalizeIllumination: true,
    };

    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params,
    });

    const metrics = compareBinaryMasks(result.binaryMask, groundTruthMask);
    const countMetrics = compareCounts(result.metrics.totalDroplets, dropletCount);

    // Verificação estrita das metas de aceitação
    expect(metrics.precision).not.toBeNull();
    expect(metrics.recall).not.toBeNull();
    expect(metrics.f1).not.toBeNull();
    expect(metrics.iou).not.toBeNull();

    expect(metrics.precision!).toBeGreaterThanOrEqual(0.95);
    expect(metrics.recall!).toBeGreaterThanOrEqual(0.95);
    expect(metrics.f1!).toBeGreaterThanOrEqual(0.95);
    expect(metrics.iou!).toBeGreaterThanOrEqual(0.90);
    expect(meetsSegmentationTarget(metrics)).toBe(true);

    // Contagem exata de gotas
    expect(countMetrics.absoluteError).toBeLessThanOrEqual(1);
    expect(countMetrics.relativeErrorPercent).toBeLessThanOrEqual(5.0);
  });

  it('2. Recupera gotas com >= 95% de precisão mesmo sob gradiente severo de sombra', () => {
    // Gotas espalhadas ao longo do cartão sob gradiente de sombra (100% a 45% de luz)
    const droplets: SyntheticDropletDef[] = [];
    for (let i = 0; i < 18; i++) {
      droplets.push({
        cx: 40 + i * 38,
        cy: 50 + (i % 4) * 45,
        radius: 8,
      });
    }

    const { pixels, groundTruthMask } = createSyntheticGroundTruthCard(
      RASTER_W,
      RASTER_H,
      droplets,
      { shadowGradient: true, noiseLevel: 10 }
    );

    const params: AnalysisParams = {
      method: 'hybrid',
      thresholdAdjustment: 0,
      minAreaPx: 5,
      minDropletUm: 0,
      discardBorder: false,
      normalizeIllumination: true,
    };

    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params,
    });

    const metrics = compareBinaryMasks(result.binaryMask, groundTruthMask);

    expect(metrics.precision!).toBeGreaterThanOrEqual(0.95);
    expect(metrics.recall!).toBeGreaterThanOrEqual(0.95);
    expect(metrics.f1!).toBeGreaterThanOrEqual(0.95);
    expect(meetsSegmentationTarget(metrics)).toBe(true);
  });

  it('3. Separa aglomerados de gotas em contato com a separação morfológica ativada', () => {
    // Pares de gotas que se tocam com constrição ("waist")
    const droplets: SyntheticDropletDef[] = [
      // Par 1
      { cx: 120, cy: 100, radius: 14 },
      { cx: 142, cy: 100, radius: 14 },
      // Par 2
      { cx: 300, cy: 120, radius: 16 },
      { cx: 326, cy: 120, radius: 16 },
      // Gota isolada
      { cx: 500, cy: 100, radius: 12 },
    ];

    const { pixels, groundTruthMask } = createSyntheticGroundTruthCard(
      RASTER_W,
      RASTER_H,
      droplets
    );

    const params: AnalysisParams = {
      method: 'hybrid',
      thresholdAdjustment: 0,
      minAreaPx: 5,
      minDropletUm: 0,
      discardBorder: false,
      splitOverlappingDroplets: true,
    };

    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params,
    });

    // Com o separador, os 2 pares (4 gotas) + 1 gota isolada = 5 componentes identificados
    expect(result.components.length).toBe(5);
    const splitCount = result.components.filter((c) => c.isSplitCluster).length;
    expect(splitCount).toBe(4);

    const metrics = compareBinaryMasks(result.binaryMask, groundTruthMask);
    expect(metrics.f1!).toBeGreaterThanOrEqual(0.95);
  });

  it('4. Rejeita fibras e riscos não-gotas por filtro de circularidade', () => {
    const droplets: SyntheticDropletDef[] = [
      { cx: 100, cy: 80, radius: 12 },
      { cx: 250, cy: 80, radius: 10 },
      { cx: 400, cy: 80, radius: 14 },
    ];

    const { pixels } = createSyntheticGroundTruthCard(
      RASTER_W,
      RASTER_H,
      droplets,
      { addLinearFiber: true }
    );

    const paramsWithFilter: AnalysisParams = {
      method: 'hybrid',
      thresholdAdjustment: 0,
      minAreaPx: 5,
      minDropletUm: 0,
      discardBorder: false,
      filterArtifacts: true,
      roundnessMin: 0.2,
    };

    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params: paramsWithFilter,
    });

    // As 3 gotas genuínas são mantidas e a fibra linear (baixa circularidade) é descartada
    expect(result.components.length).toBe(3);
    for (const comp of result.components) {
      expect(comp.roundness).toBeDefined();
      expect(comp.roundness!).toBeGreaterThanOrEqual(0.2);
    }
  });

  it('5. Avaliação em lote de múltiplos cenários atinge critérios completos de validação', () => {
    const testCases = [
      // Caso A: Gotas finas esparsas
      createSyntheticGroundTruthCard(RASTER_W, RASTER_H, [
        { cx: 80, cy: 60, radius: 6 },
        { cx: 200, cy: 120, radius: 7 },
        { cx: 350, cy: 80, radius: 5 },
        { cx: 500, cy: 140, radius: 8 },
        { cx: 650, cy: 90, radius: 6 },
      ]),
      // Caso B: Gotas médias com ruído
      createSyntheticGroundTruthCard(RASTER_W, RASTER_H, [
        { cx: 100, cy: 70, radius: 12 },
        { cx: 250, cy: 150, radius: 14 },
        { cx: 420, cy: 60, radius: 10 },
        { cx: 600, cy: 130, radius: 15 },
      ], { noiseLevel: 8 }),
      // Caso C: Gotas com gradiente de iluminação
      createSyntheticGroundTruthCard(RASTER_W, RASTER_H, [
        { cx: 70, cy: 90, radius: 10 },
        { cx: 220, cy: 90, radius: 12 },
        { cx: 380, cy: 90, radius: 11 },
        { cx: 540, cy: 90, radius: 13 },
        { cx: 680, cy: 90, radius: 10 },
      ], { shadowGradient: true }),
    ];

    const metricsList = testCases.map((tc) => {
      const run = runAnalysisCore({
        pixels: tc.pixels,
        srcWidth: RASTER_W,
        srcHeight: RASTER_H,
        corners: FULL_CORNERS,
        targetWidth: RASTER_W,
        targetHeight: RASTER_H,
        cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
        params: {
          method: 'hybrid',
          thresholdAdjustment: 0,
          minAreaPx: 4,
          minDropletUm: 0,
          discardBorder: false,
          normalizeIllumination: true,
        },
      });

      const segMetrics = compareBinaryMasks(run.binaryMask, tc.groundTruthMask);
      const refCoverage = (Array.from(tc.groundTruthMask).filter((v) => v === 1).length / (RASTER_W * RASTER_H)) * 100;
      const covMetrics = compareCoverage(run.metrics.coveragePercentExact, refCoverage);

      expect(meetsFullValidationCriteria(segMetrics, covMetrics)).toBe(true);
      return segMetrics;
    });

    const batch = aggregateValidationBatch(metricsList);

    expect(batch.microPrecision!).toBeGreaterThanOrEqual(0.95);
    expect(batch.microRecall!).toBeGreaterThanOrEqual(0.95);
    expect(batch.microF1!).toBeGreaterThanOrEqual(0.95);
    expect(batch.macroF1!).toBeGreaterThanOrEqual(0.95);
  });
});
