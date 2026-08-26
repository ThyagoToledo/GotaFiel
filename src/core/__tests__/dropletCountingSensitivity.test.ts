import { describe, it, expect } from 'vitest';
import { runAnalysisCore } from '../analysisCore';
import { CropCorners } from '../types';

const FULL_CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

function createSyntheticCard(width: number, height: number, backgroundRgb = [240, 220, 45]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = backgroundRgb[0];
    pixels[i * 4 + 1] = backgroundRgb[1];
    pixels[i * 4 + 2] = backgroundRgb[2];
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

function drawCircle(
  pixels: Uint8ClampedArray,
  width: number,
  cx: number,
  cy: number,
  r: number,
  rgb = [20, 40, 180]
) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const idx = ((cy + dy) * width + (cx + dx)) * 4;
        pixels[idx] = rgb[0];
        pixels[idx + 1] = rgb[1];
        pixels[idx + 2] = rgb[2];
        pixels[idx + 3] = 255;
      }
    }
  }
}

describe('Sensibilidade de Detecção e Contagem Fiel de Gotas', () => {
  it('1. Detecta microgotas fracas e de baixo contraste com alta sensibilidade', () => {
    const width = 300;
    const height = 150;
    const pixels = createSyntheticCard(width, height);

    // Desenha 5 microgotas fracas (azul-acinzentadas / difusas)
    drawCircle(pixels, width, 50, 50, 3, [120, 135, 170]);
    drawCircle(pixels, width, 100, 80, 2, [130, 140, 175]);
    drawCircle(pixels, width, 150, 50, 3, [110, 130, 165]);
    drawCircle(pixels, width, 200, 100, 2, [125, 138, 170]);
    drawCircle(pixels, width, 250, 60, 4, [100, 120, 160]);

    const result = runAnalysisCore({
      pixels,
      srcWidth: width,
      srcHeight: height,
      corners: FULL_CORNERS,
      targetWidth: width,
      targetHeight: height,
      cardSizeMm: { width: 76, height: 26 },
      params: {
        method: 'hybrid',
        thresholdAdjustment: 0,
        minAreaPx: 1,
        minDropletUm: 1,
        discardBorder: false,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    expect(result.metrics.totalDroplets).toBe(5);
    expect(result.droplets.filter((d) => d.included).length).toBe(5);
  });

  it('2. Desmembra par de gotas pequenas encostadas com formato de haltere/amendoim', () => {
    const width = 200;
    const height = 100;
    const pixels = createSyntheticCard(width, height);

    // Duas gotas de raio 4 encostadas lado a lado (centros separados por 6 pixels)
    drawCircle(pixels, width, 97, 50, 4, [15, 30, 190]);
    drawCircle(pixels, width, 103, 50, 4, [15, 30, 190]);

    const result = runAnalysisCore({
      pixels,
      srcWidth: width,
      srcHeight: height,
      corners: FULL_CORNERS,
      targetWidth: width,
      targetHeight: height,
      cardSizeMm: { width: 76, height: 26 },
      params: {
        method: 'hybrid',
        thresholdAdjustment: 0,
        minAreaPx: 1,
        minDropletUm: 1,
        discardBorder: false,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    // Deve desmembrar o aglomerado em 2 gotas individuais
    expect(result.metrics.totalDroplets).toBe(2);
    expect(result.droplets.filter((d) => d.included).length).toBe(2);
  });

  it('3. Contagem exata em cartão simulado com gotas esparsas e aglomerados', () => {
    const width = 400;
    const height = 200;
    const pixels = createSyntheticCard(width, height);

    // 4 gotas isoladas
    drawCircle(pixels, width, 50, 50, 5);
    drawCircle(pixels, width, 120, 120, 6);
    drawCircle(pixels, width, 200, 60, 4);
    drawCircle(pixels, width, 320, 140, 5);

    // 1 par de gotas encostadas (2 gotas)
    drawCircle(pixels, width, 260, 110, 5);
    drawCircle(pixels, width, 268, 110, 5);

    // Total esperado: 6 gotas
    const result = runAnalysisCore({
      pixels,
      srcWidth: width,
      srcHeight: height,
      corners: FULL_CORNERS,
      targetWidth: width,
      targetHeight: height,
      cardSizeMm: { width: 76, height: 26 },
      params: {
        method: 'hybrid',
        thresholdAdjustment: 0,
        minAreaPx: 1,
        minDropletUm: 1,
        discardBorder: false,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    expect(result.metrics.totalDroplets).toBe(6);
  });
});
