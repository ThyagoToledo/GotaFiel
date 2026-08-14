import { describe, expect, it } from 'vitest';
import { assessCaptureQuality } from '../captureQuality';
import type { CropCorners } from '../types';

const corners: CropCorners = {
  tl: { x: 25, y: 25 },
  tr: { x: 75, y: 25 },
  br: { x: 75, y: 75 },
  bl: { x: 25, y: 75 },
};

function rgba(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = pixel(x, y);
      result[offset] = red;
      result[offset + 1] = green;
      result[offset + 2] = blue;
      result[offset + 3] = 255;
    }
  }
  return result;
}

describe('assessCaptureQuality', () => {
  it('calcula ocupação do cartão e mantém os sinais como não calibrados', () => {
    const result = assessCaptureQuality({
      rectifiedPixels: rgba(40, 20, () => [220, 220, 120]),
      rectWidthPx: 40,
      rectHeightPx: 20,
      sourceWidthPx: 100,
      sourceHeightPx: 100,
      corners,
    });

    expect(result.cardOccupancyPercent).toBe(25);
    expect(result.focusLaplacianVariance).toBe(0);
    expect(result.illuminationVariationPercent).toBe(0);
    expect(result.calibrationStatus).toBe('NAO_CALIBRADO');
    expect(result.version).toBe('capture-signals-v1');
  });

  it('detecta variação de bordas e altas luzes neutras sem classificá-las', () => {
    const result = assessCaptureQuality({
      rectifiedPixels: rgba(64, 32, (x, y) => {
        if (x === 32 || y === 16) return [0, 0, 0];
        if (x < 8 && y < 8) return [255, 255, 255];
        return [220, 220, 120];
      }),
      rectWidthPx: 64,
      rectHeightPx: 32,
      sourceWidthPx: 100,
      sourceHeightPx: 100,
      corners,
    });

    expect(result.focusLaplacianVariance).toBeGreaterThan(0);
    expect(result.highlightPixelPercent).toBeGreaterThan(0);
    expect(result.sampleCount).toBeGreaterThan(0);
    expect(Number.isFinite(result.illuminationVariationPercent)).toBe(true);
  });

  it('não produz NaN para um raster degenerado', () => {
    const result = assessCaptureQuality({
      rectifiedPixels: new Uint8ClampedArray(4 * 4 * 4),
      rectWidthPx: 4,
      rectHeightPx: 4,
      sourceWidthPx: 0,
      sourceHeightPx: 0,
      corners,
    });

    expect(Object.values(result).every((value) => typeof value !== 'number' || Number.isFinite(value))).toBe(true);
  });
});
