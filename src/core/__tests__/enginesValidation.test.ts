import { describe, it, expect } from 'vitest';
import { runAnalysisCore } from '../analysisCore';
import { CropCorners } from '../types';

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

function createSampleHydrosensitiveCard(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  // Background: Yellow hydrosensitive paper
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      pixels[idx] = 240;     // R
      pixels[idx + 1] = 220; // G
      pixels[idx + 2] = 45;  // B
      pixels[idx + 3] = 255;
    }
  }

  // Draw 5 blue stains (droplets) of radius 6
  const dropCoords = [
    { cx: 100, cy: 60, r: 6 },
    { cx: 240, cy: 120, r: 7 },
    { cx: 380, cy: 80, r: 6 },
    { cx: 520, cy: 160, r: 8 },
    { cx: 660, cy: 100, r: 6 },
  ];

  for (const drop of dropCoords) {
    for (let dy = -drop.r; dy <= drop.r; dy++) {
      for (let dx = -drop.r; dx <= drop.r; dx++) {
        if (dx * dx + dy * dy <= drop.r * drop.r) {
          const px = drop.cx + dx;
          const py = drop.cy + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            pixels[idx] = 30;     // R
            pixels[idx + 1] = 35; // G
            pixels[idx + 2] = 180;// B (Blue stain)
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  return pixels;
}

describe('Motores de Visão Computacional - Validação Cruzada (Hybrid, Chromatic, Gotas-Legacy)', () => {
  const pixels = createSampleHydrosensitiveCard(RASTER_W, RASTER_H);

  it('Motor 1 (Híbrido Adaptativo): executa pipeline completo com normalização e split de clusters', () => {
    const result = runAnalysisCore({
      pixels,
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
        minDropletUm: 50,
        discardBorder: true,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    expect(result.metrics.totalDroplets).toBe(5);
    expect(result.metrics.density).toBeGreaterThan(0);
    expect(result.metrics.coveragePercent).toBeGreaterThan(0);
    expect(result.metrics.dv05Um).toBeGreaterThan(0);
    expect(result.metrics.asabeCategory).not.toBe('Não classificada');
    expect(result.droplets.length).toBe(5);
  });

  it('Motor 2 (Cromático Espectral): executa binarização espectral pura B - max(R,G)', () => {
    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params: {
        method: 'chromatic',
        thresholdAdjustment: 0,
        minAreaPx: 4,
        minDropletUm: 50,
        discardBorder: true,
      },
    });

    expect(result.metrics.totalDroplets).toBe(5);
    expect(result.metrics.density).toBeGreaterThan(0);
    expect(result.metrics.coveragePercent).toBeGreaterThan(0);
    expect(result.metrics.dv05Um).toBeGreaterThan(0);
  });

  it('Motor 3 (Monocromático / Gotas-Legacy): executa binarização em escala de cinza com suavização e preenchimento', () => {
    const result = runAnalysisCore({
      pixels,
      srcWidth: RASTER_W,
      srcHeight: RASTER_H,
      corners: FULL_CORNERS,
      targetWidth: RASTER_W,
      targetHeight: RASTER_H,
      cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
      params: {
        method: 'gotas-legacy',
        thresholdAdjustment: 0,
        minAreaPx: 4,
        minDropletUm: 50,
        discardBorder: true,
        meanFilterPasses: 1,
        fillHoles: true,
      },
    });

    expect(result.metrics.totalDroplets).toBe(5);
    expect(result.metrics.density).toBeGreaterThan(0);
    expect(result.metrics.coveragePercent).toBeGreaterThan(0);
    expect(result.metrics.dv05Um).toBeGreaterThan(0);
  });
});
