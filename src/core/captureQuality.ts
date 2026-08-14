import type { CaptureQualitySignals } from '../types';
import type { CropCorners } from './types';

interface CaptureQualityInput {
  rectifiedPixels: Uint8ClampedArray | Uint8Array;
  rectWidthPx: number;
  rectHeightPx: number;
  sourceWidthPx: number;
  sourceHeightPx: number;
  corners: CropCorners;
}

const MAX_FOCUS_SAMPLES = 250_000;
const GRID_SIZE = 4;

function luminance(pixels: Uint8ClampedArray | Uint8Array, offset: number) {
  return 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
}

function normalizePoint(point: { x: number; y: number }, width: number, height: number) {
  return { x: (point.x / 100) * width, y: (point.y / 100) * height };
}

function polygonArea(corners: CropCorners, width: number, height: number) {
  const points = [corners.tl, corners.tr, corners.br, corners.bl]
    .map((point) => normalizePoint(point, width, height));
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function quantile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Produz sinais brutos de qualidade da captura, sem convertê-los em aprovação.
 *
 * A imagem retificada é usada para manter o foco/exposição no mesmo espaço que
 * será segmentado. A ocupação vem da foto original, antes da retificação.
 */
export function assessCaptureQuality(input: CaptureQualityInput): CaptureQualitySignals {
  const {
    rectifiedPixels,
    rectWidthPx,
    rectHeightPx,
    sourceWidthPx,
    sourceHeightPx,
    corners,
  } = input;

  const totalPixels = Math.max(0, rectWidthPx * rectHeightPx);
  const stride = Math.max(1, Math.ceil(Math.sqrt(totalPixels / MAX_FOCUS_SAMPLES)));
  const luminances: number[] = [];
  const tileMeans: number[] = [];
  let darkCount = 0;
  let neutralHighlightCount = 0;
  let focusCount = 0;
  let focusMean = 0;
  let focusM2 = 0;

  for (let y = 1; y < rectHeightPx - 1; y += stride) {
    for (let x = 1; x < rectWidthPx - 1; x += stride) {
      const offset = (y * rectWidthPx + x) * 4;
      const current = luminance(rectifiedPixels, offset);
      const laplacian =
        4 * current -
        luminance(rectifiedPixels, offset - rectWidthPx * 4) -
        luminance(rectifiedPixels, offset + rectWidthPx * 4) -
        luminance(rectifiedPixels, offset - 4) -
        luminance(rectifiedPixels, offset + 4);

      focusCount += 1;
      const delta = laplacian - focusMean;
      focusMean += delta / focusCount;
      focusM2 += delta * (laplacian - focusMean);
      luminances.push(current);

      if (current <= 20) darkCount += 1;
      const red = rectifiedPixels[offset];
      const green = rectifiedPixels[offset + 1];
      const blue = rectifiedPixels[offset + 2];
      if (current >= 245 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 18) {
        neutralHighlightCount += 1;
      }
    }
  }

  for (let tileY = 0; tileY < GRID_SIZE; tileY += 1) {
    for (let tileX = 0; tileX < GRID_SIZE; tileX += 1) {
      const startX = Math.floor((tileX * rectWidthPx) / GRID_SIZE);
      const endX = Math.max(startX + 1, Math.floor(((tileX + 1) * rectWidthPx) / GRID_SIZE));
      const startY = Math.floor((tileY * rectHeightPx) / GRID_SIZE);
      const endY = Math.max(startY + 1, Math.floor(((tileY + 1) * rectHeightPx) / GRID_SIZE));
      let sum = 0;
      let count = 0;
      for (let y = startY; y < Math.min(endY, rectHeightPx); y += 1) {
        for (let x = startX; x < Math.min(endX, rectWidthPx); x += 1) {
          sum += luminance(rectifiedPixels, (y * rectWidthPx + x) * 4);
          count += 1;
        }
      }
      if (count) tileMeans.push(sum / count);
    }
  }

  const illuminationRange = tileMeans.length
    ? quantile(tileMeans, 0.95) - quantile(tileMeans, 0.05)
    : 0;
  const focusVariance = focusCount > 1 ? focusM2 / (focusCount - 1) : 0;
  const sourceArea = Math.max(1, sourceWidthPx * sourceHeightPx);
  const occupancy = (polygonArea(corners, sourceWidthPx, sourceHeightPx) / sourceArea) * 100;

  return {
    cardOccupancyPercent: Number(Math.max(0, Math.min(100, occupancy)).toFixed(4)),
    focusLaplacianVariance: Number(Math.max(0, focusVariance).toFixed(6)),
    illuminationVariationPercent: Number(Math.max(0, Math.min(100, (illuminationRange / 255) * 100)).toFixed(4)),
    darkPixelPercent: Number((focusCount ? (darkCount / focusCount) * 100 : 0).toFixed(4)),
    highlightPixelPercent: Number((focusCount ? (neutralHighlightCount / focusCount) * 100 : 0).toFixed(4)),
    sampleCount: focusCount,
    version: 'capture-signals-v1',
    calibrationStatus: 'NAO_CALIBRADO',
  };
}
