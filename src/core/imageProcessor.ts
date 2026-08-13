import {
  AnalysisParams,
  BinarizationMethod,
  CropCorners,
  DropletComponent,
  ProcessedAnalysisMetrics,
  SampleHistogramBin,
} from './types';
import { DropletItem } from '../types';

/**
 * Target physical resolution of the rectified raster: 0.0423 mm per pixel (600 dpi).
 *
 * 600 dpi is the resolution established for water-sensitive paper analysis (Marçal &
 * Cunha, 2008) and is what DepositScan-class tools target. It is chosen here over the
 * previous 0.1 mm/px (254 dpi) because the measurement error on a stain diameter only
 * falls below 5 % for stains larger than ~300 µm at 300 dpi, versus ~140 µm at 600 dpi —
 * and a fine spray puts most of its droplets below that first threshold.
 *
 * Raising it further (1200 dpi) keeps improving accuracy but quadruples the raster area,
 * which matters because the whole pipeline runs client-side, on phones.
 */
export const TARGET_MM_PER_PIXEL = 0.0423;

/** Smallest raster side we will ever produce, to keep degenerate inputs analysable. */
const MIN_RASTER_SIDE = 32;

export interface TargetRaster {
  targetWidth: number;
  targetHeight: number;
  /** true when the ideal resolution was reduced to avoid upscaling past the source. */
  limitedBySource: boolean;
  /** Uniform factor applied to the ideal resolution. 1 means no reduction. */
  appliedScale: number;
}

/**
 * Chooses the rectified raster so that pixels are SQUARE in physical space.
 *
 *   targetWidth  = cardWidthMm  / TARGET_MM_PER_PIXEL
 *   targetHeight = cardHeightMm / TARGET_MM_PER_PIXEL
 *
 * which at 600 dpi gives 76x26 -> 1797x615, 76x52 -> 1797x1229, 26x38 -> 615x898.
 *
 * Because the raster aspect ratio then equals the card aspect ratio, scaleX === scaleY
 * and the anisotropy is gone at the source rather than merely compensated for. This is
 * also what makes a future circularity/roundness filter meaningful: 4*pi*A/P^2 is only a
 * shape measure when pixels are square.
 *
 * Upscaling guard: we never invent resolution the photograph does not have. When the
 * ideal raster exceeds the measured size of the source quad, both sides are reduced by
 * the SAME factor. Clamping each axis independently would restore the aspect mismatch
 * and reintroduce non-square pixels — the very defect being removed.
 */
export function computeTargetRaster(
  cardWidthMm: number,
  cardHeightMm: number,
  sourceQuadWidthPx?: number,
  sourceQuadHeightPx?: number
): TargetRaster {
  if (
    !Number.isFinite(cardWidthMm) || cardWidthMm <= 0 ||
    !Number.isFinite(cardHeightMm) || cardHeightMm <= 0
  ) {
    return {
      targetWidth: MIN_RASTER_SIDE,
      targetHeight: MIN_RASTER_SIDE,
      limitedBySource: false,
      appliedScale: 1,
    };
  }

  const idealWidth = cardWidthMm / TARGET_MM_PER_PIXEL;
  const idealHeight = cardHeightMm / TARGET_MM_PER_PIXEL;

  // One uniform reduction factor across both axes preserves the aspect ratio.
  let appliedScale = 1;

  if (Number.isFinite(sourceQuadWidthPx) && (sourceQuadWidthPx as number) > 0) {
    appliedScale = Math.min(appliedScale, (sourceQuadWidthPx as number) / idealWidth);
  }
  if (Number.isFinite(sourceQuadHeightPx) && (sourceQuadHeightPx as number) > 0) {
    appliedScale = Math.min(appliedScale, (sourceQuadHeightPx as number) / idealHeight);
  }

  const limitedBySource = appliedScale < 1;
  if (!Number.isFinite(appliedScale) || appliedScale <= 0) appliedScale = 1;

  const targetWidth = Math.max(MIN_RASTER_SIDE, Math.round(idealWidth * appliedScale));
  const targetHeight = Math.max(MIN_RASTER_SIDE, Math.round(idealHeight * appliedScale));

  return { targetWidth, targetHeight, limitedBySource, appliedScale };
}

/**
 * Measures the crop quad in SOURCE pixels, so the raster planner knows how much real
 * resolution the photograph actually carries. Takes the longer of each opposing pair,
 * which is the side that would be undersampled first.
 */
export function measureQuadSizePx(
  corners: CropCorners,
  srcWidth: number,
  srcHeight: number
): { widthPx: number; heightPx: number } {
  const px = (p: { x: number; y: number }) => ({
    x: (p.x / 100) * srcWidth,
    y: (p.y / 100) * srcHeight,
  });

  const tl = px(corners.tl);
  const tr = px(corners.tr);
  const br = px(corners.br);
  const bl = px(corners.bl);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  return {
    widthPx: Math.max(dist(tl, tr), dist(bl, br)),
    heightPx: Math.max(dist(tl, bl), dist(tr, br)),
  };
}

export interface OrientedCrop {
  corners: CropCorners;
  orientationCorrected: boolean;
}

/**
 * Faz o lado horizontal do raster corresponder ao `cardWidthMm`.
 *
 * Quando um cartão 76 × 26 mm é fotografado em retrato, a aresta superior do quad é
 * a de 26 mm. Mapear esse quad diretamente para um raster 76 × 26 estica a aresta
 * curta e reduz a resolução efetiva. A rotação lógica dos cantos corrige a associação
 * sem alterar a foto original.
 */
export function orientCropCornersForCard(
  corners: CropCorners,
  srcWidth: number,
  srcHeight: number,
  cardWidthMm: number,
  cardHeightMm: number
): OrientedCrop {
  if (cardWidthMm <= 0 || cardHeightMm <= 0) {
    return { corners, orientationCorrected: false };
  }

  const quad = measureQuadSizePx(corners, srcWidth, srcHeight);
  if (quad.widthPx <= 0 || quad.heightPx <= 0) {
    return { corners, orientationCorrected: false };
  }

  const cardAspect = cardWidthMm / cardHeightMm;
  const directAspect = quad.widthPx / quad.heightPx;
  const directError = Math.abs(Math.log(directAspect / cardAspect));
  const rotatedError = Math.abs(Math.log((1 / directAspect) / cardAspect));

  if (rotatedError + 1e-9 >= directError) {
    return { corners, orientationCorrected: false };
  }

  return {
    // Rotação lógica de 90° anti-horária: a antiga aresta esquerda vira o topo.
    corners: {
      tl: corners.bl,
      tr: corners.tl,
      br: corners.tr,
      bl: corners.br,
    },
    orientationCorrected: true,
  };
}

/**
 * Physical AREA of a single raster pixel, in mm².
 *
 * This is the ONLY correct way to convert pixel counts into physical area when the
 * rectified raster and the physical card do not share the same aspect ratio.
 *
 *   scaleX = cardWidthMm  / rectWidthPx    (mm per pixel, horizontally)
 *   scaleY = cardHeightMm / rectHeightPx   (mm per pixel, vertically)
 *   mm2PerPixel = scaleX * scaleY
 *
 * Equivalent closed form: (cardWidthMm * cardHeightMm) / (rectWidthPx * rectHeightPx).
 *
 * NEVER use the arithmetic mean (scaleX + scaleY) / 2 as a stand-in for a linear scale
 * and then square it. That was the calibration defect: squaring the arithmetic mean
 * overestimates the pixel area whenever scaleX !== scaleY (AM-GM inequality), which made
 * coverage — a purely raster-level quantity — drift with the declared card size.
 */
export function computeMm2PerPixel(
  cardWidthMm: number,
  cardHeightMm: number,
  rectWidthPx: number,
  rectHeightPx: number
): number {
  if (
    !Number.isFinite(cardWidthMm) || cardWidthMm <= 0 ||
    !Number.isFinite(cardHeightMm) || cardHeightMm <= 0 ||
    !Number.isFinite(rectWidthPx) || rectWidthPx <= 0 ||
    !Number.isFinite(rectHeightPx) || rectHeightPx <= 0
  ) {
    return 0;
  }

  const scaleX = cardWidthMm / rectWidthPx;
  const scaleY = cardHeightMm / rectHeightPx;
  return scaleX * scaleY;
}

/**
 * Isotropic linear scale equivalent to a given pixel area, kept only for display and
 * CSV compatibility: mmPerPixelEquivalent = sqrt(mm2PerPixel).
 *
 * It is deliberately NOT used in any area, diameter, coverage or volume computation —
 * those all consume mm2PerPixel directly.
 */
export function mmPerPixelEquivalent(mm2PerPixel: number): number {
  if (!Number.isFinite(mm2PerPixel) || mm2PerPixel <= 0) return 0;
  return Math.sqrt(mm2PerPixel);
}

/**
 * Stain diameter (µm) of the area-equivalent circle for a component of `pixelCount` pixels.
 *   stainAreaMm2   = pixelCount * mm2PerPixel
 *   stainDiameterUm = 2 * sqrt(stainAreaMm2 / PI) * 1000
 */
export function computeStainDiameterUm(pixelCount: number, mm2PerPixel: number): number {
  if (pixelCount <= 0 || mm2PerPixel <= 0) return 0;
  const stainAreaMm2 = pixelCount * mm2PerPixel;
  return 2 * Math.sqrt(stainAreaMm2 / Math.PI) * 1000;
}

/**
 * Spreading factor formula (Fator de Espalhamento) for hydrosensitive paper:
 * DC = DL / (0.8419 + 0.000152 * DL + 0.1758 * ln(DL))
 * DL = stain diameter in micrometers (µm)
 * DC = corrected droplet diameter in micrometers (µm)
 */
export function calculateCorrectedDiameterUm(DL: number): number {
  if (DL <= 0 || !Number.isFinite(DL)) return 0;
  const denominator = 0.8419 + 0.000152 * DL + 0.1758 * Math.log(DL);
  if (denominator <= 0 || !Number.isFinite(denominator)) return DL;
  return DL / denominator;
}

export function computeOtsuThreshold(histogram256: number[], totalPixels: number): number {
  if (totalPixels <= 0) return 128;

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram256[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = -1;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram256[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram256[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varianceBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Calculates a 3x3 Homography matrix mapping unit square (u, v) in [0, 1]x[0, 1] to source quad coordinates.
 * Target rectangle pixel (x', y') maps to normalized (u = x'/(targetWidth-1), v = y'/(targetHeight-1)).
 */
export function computeHomographyFromNormalizedQuad(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
) {
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;

  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;

  let h20 = 0;
  let h21 = 0;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) > 1e-10) {
    h20 = (dx3 * dy2 - dy3 * dx2) / det;
    h21 = (dx1 * dy3 - dy1 * dx3) / det;
  }

  const h00 = x1 - x0 + h20 * x1;
  const h01 = x3 - x0 + h21 * x3;
  const h02 = x0;

  const h10 = y1 - y0 + h20 * y1;
  const h11 = y3 - y0 + h21 * y3;
  const h12 = y0;

  return [
    h00, h01, h02,
    h10, h11, h12,
    h20, h21, 1.0,
  ];
}

/**
 * True 3x3 Perspective Homography Rectification with Bilinear Interpolation.
 */
export function rectifyPixels(
  srcPixels: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  corners: CropCorners,
  targetWidth: number,
  targetHeight: number
): Uint8ClampedArray {
  const targetPixels = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  // Convert percentage corners to source image pixel coordinates
  const x0 = (corners.tl.x / 100) * srcWidth;
  const y0 = (corners.tl.y / 100) * srcHeight;
  const x1 = (corners.tr.x / 100) * srcWidth;
  const y1 = (corners.tr.y / 100) * srcHeight;
  const x2 = (corners.br.x / 100) * srcWidth;
  const y2 = (corners.br.y / 100) * srcHeight;
  const x3 = (corners.bl.x / 100) * srcWidth;
  const y3 = (corners.bl.y / 100) * srcHeight;

  // 3x3 Homography matrix mapping (u, v) in [0, 1]x[0, 1] to (x, y) in source
  const H = computeHomographyFromNormalizedQuad(x0, y0, x1, y1, x2, y2, x3, y3);

  const maxU = Math.max(1, targetWidth - 1);
  const maxV = Math.max(1, targetHeight - 1);

  for (let y = 0; y < targetHeight; y++) {
    const v = y / maxV;
    for (let x = 0; x < targetWidth; x++) {
      const u = x / maxU;

      // Project (u, v, 1) using 3x3 Homography
      const w = H[6] * u + H[7] * v + H[8];
      const invW = w !== 0 ? 1.0 / w : 1.0;

      const srcX = (H[0] * u + H[1] * v + H[2]) * invW;
      const srcY = (H[3] * u + H[4] * v + H[5]) * invW;

      // Clamp coordinates to valid source bounds
      const clampedX = Math.min(srcWidth - 1, Math.max(0, srcX));
      const clampedY = Math.min(srcHeight - 1, Math.max(0, srcY));

      // Bilinear Interpolation
      const xFloor = Math.floor(clampedX);
      const yFloor = Math.floor(clampedY);
      const xCeil = Math.min(srcWidth - 1, xFloor + 1);
      const yCeil = Math.min(srcHeight - 1, yFloor + 1);

      const dx = clampedX - xFloor;
      const dy = clampedY - yFloor;

      const idx00 = (yFloor * srcWidth + xFloor) * 4;
      const idx10 = (yFloor * srcWidth + xCeil) * 4;
      const idx01 = (yCeil * srcWidth + xFloor) * 4;
      const idx11 = (yCeil * srcWidth + xCeil) * 4;

      const tgtIdx = (y * targetWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = (1 - dx) * srcPixels[idx00 + c] + dx * srcPixels[idx10 + c];
        const bot = (1 - dx) * srcPixels[idx01 + c] + dx * srcPixels[idx11 + c];
        const val = (1 - dy) * top + dy * bot;
        targetPixels[tgtIdx + c] = Math.round(val);
      }
    }
  }

  return targetPixels;
}

export function binarizeImageBuffer(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  method: BinarizationMethod,
  thresholdAdjustment: number
): { binaryMask: Uint8Array; thresholdUsed: number; stainValues: Uint8Array } {
  const totalPixels = width * height;
  const stainValues = new Uint8Array(totalPixels);
  const binaryMask = new Uint8Array(totalPixels);

  if (method === 'gotas-legacy') {
    // Faithful GOTAS Compatibility:
    // media = (R + G + B) / 3
    // mediaTotal = sum(media) / totalPixels
    // limiar = (((mediaCorMax - mediaCorMin) + mediaTotal) / 3) + ajuste
    // gota = media <= limiar
    let sumMedia = 0;
    let mediaMax = 0;
    let mediaMin = 255;

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const media = Math.round((r + g + b) / 3);

      stainValues[i] = media;
      sumMedia += media;
      if (media > mediaMax) mediaMax = media;
      if (media < mediaMin) mediaMin = media;
    }

    const mediaTotal = totalPixels > 0 ? sumMedia / totalPixels : 128;
    const baseLimiar = ((mediaMax - mediaMin) + mediaTotal) / 3;
    const thresholdUsed = Math.max(0, Math.min(255, Math.round(baseLimiar + thresholdAdjustment)));

    for (let i = 0; i < totalPixels; i++) {
      binaryMask[i] = stainValues[i] <= thresholdUsed ? 1 : 0;
    }

    return { binaryMask, thresholdUsed, stainValues };
  } else {
    // Default Chromatic Method: B - max(R, G)
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const stain = Math.max(0, Math.min(255, b - Math.max(r, g)));

      stainValues[i] = stain;
      histogram[stain]++;
    }

    const otsuVal = computeOtsuThreshold(histogram, totalPixels);
    const thresholdUsed = Math.max(0, Math.min(255, otsuVal + thresholdAdjustment));

    // STRICT inequality: stain > thresholdUsed (prevents background with stain=0 from becoming a droplet when thresholdUsed=0)
    for (let i = 0; i < totalPixels; i++) {
      binaryMask[i] = stainValues[i] > thresholdUsed ? 1 : 0;
    }

    return { binaryMask, thresholdUsed, stainValues };
  }
}

/** Filtro caixa 3 × 3, não destrutivo, com no máximo três passagens. */
export function boxBlurRgba(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  passes = 1
): Uint8ClampedArray {
  const expectedLength = width * height * 4;
  if (width <= 0 || height <= 0 || pixels.length < expectedLength) {
    return new Uint8ClampedArray(pixels);
  }

  let current = new Uint8ClampedArray(pixels);
  const safePasses = Math.min(3, Math.max(0, Math.floor(passes)));

  for (let pass = 0; pass < safePasses; pass++) {
    const next = new Uint8ClampedArray(current);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const target = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += current[((y + dy) * width + (x + dx)) * 4 + channel];
            }
          }
          next[target + channel] = Math.round(sum / 9);
        }
        next[target + 3] = current[target + 3];
      }
    }
    current = next;
  }

  return current;
}

/**
 * Preenche regiões de fundo totalmente cercadas por primeiro plano.
 * O fundo conectado à borda é encontrado com vizinhança de oito pixels.
 */
export function fillBinaryHoles(binaryMask: Uint8Array, width: number, height: number): Uint8Array {
  const total = width * height;
  if (width <= 0 || height <= 0 || binaryMask.length < total) {
    return new Uint8Array(binaryMask);
  }

  const externalBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueueBackground = (index: number) => {
    if (binaryMask[index] === 0 && externalBackground[index] === 0) {
      externalBackground[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueBackground(x);
    enqueueBackground((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueBackground(y * width);
    enqueueBackground(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        enqueueBackground(ny * width + nx);
      }
    }
  }

  const output = new Uint8Array(binaryMask);
  for (let index = 0; index < total; index++) {
    if (binaryMask[index] === 0 && externalBackground[index] === 0) output[index] = 1;
  }
  return output;
}

export function findConnectedComponents(
  binaryMask: Uint8Array,
  width: number,
  height: number,
  params: { discardBorder: boolean; minAreaPx: number; minDropletUm: number; mm2PerPixel: number }
): DropletComponent[] {
  const visited = new Uint8Array(width * height);
  const rawComponents: Array<{
    id: number;
    pixelCount: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    sumX: number;
    sumY: number;
    touchesBorder: boolean;
  }> = [];

  let nextId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 1 && visited[idx] === 0) {
        let pixelCount = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let sumX = 0;
        let sumY = 0;
        let touchesBorder = false;

        const queue: number[] = [idx];
        visited[idx] = 1;

        let qHead = 0;
        while (qHead < queue.length) {
          const currIdx = queue[qHead++];
          const cy = Math.floor(currIdx / width);
          const cx = currIdx % width;

          pixelCount++;
          sumX += cx;
          sumY += cy;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
            touchesBorder = true;
          }

          // 8-neighbor connectivity
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (binaryMask[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        if (params.discardBorder && touchesBorder) {
          continue;
        }

        if (pixelCount >= params.minAreaPx) {
          rawComponents.push({
            id: nextId++,
            pixelCount,
            minX,
            maxX,
            minY,
            maxY,
            sumX,
            sumY,
            touchesBorder,
          });
        }
      }
    }
  }

  // Physical pixel AREA in mm². Never derived from a linear mm/px average.
  const mm2PerPixel = params.mm2PerPixel > 0 ? params.mm2PerPixel : 0.01;

  const result: DropletComponent[] = [];

  for (const c of rawComponents) {
    const areaMm2 = c.pixelCount * mm2PerPixel;
    const stainDiameterUm = computeStainDiameterUm(c.pixelCount, mm2PerPixel);
    const correctedDiameterUm = calculateCorrectedDiameterUm(stainDiameterUm);

    // Apply min droplet size filter in µm
    const included = correctedDiameterUm >= (params.minDropletUm || 0);

    result.push({
      id: `drop-${c.id}`,
      pixelCount: c.pixelCount,
      areaMm2: Number(areaMm2.toFixed(6)),
      diameterUm: Math.round(correctedDiameterUm),
      centerX: Number(((c.sumX / c.pixelCount / width) * 100).toFixed(2)),
      centerY: Number(((c.sumY / c.pixelCount / height) * 100).toFixed(2)),
      minX: c.minX,
      maxX: c.maxX,
      minY: c.minY,
      maxY: c.maxY,
      touchesBorder: c.touchesBorder,
      included,
    });
  }

  return result;
}

export function buildHistogramBins(components: Array<{ pixelCount: number; included?: boolean }>): SampleHistogramBin[] {
  const binMap = new Map<number, number>();

  for (const comp of components) {
    if (comp.included === false) continue;
    binMap.set(comp.pixelCount, (binMap.get(comp.pixelCount) || 0) + 1);
  }

  const result: SampleHistogramBin[] = [];
  const sortedKeys = Array.from(binMap.keys()).sort((a, b) => a - b);
  for (const px of sortedKeys) {
    result.push({ pixelCount: px, quantity: binMap.get(px)! });
  }

  return result;
}

/**
 * Percentil ponderado por volume com interpolação linear entre os diâmetros vizinhos.
 * A entrada deve estar ordenada por diâmetro crescente.
 */
export function interpolateVolumePercentile(
  sortedDroplets: Array<{ diameterUm: number; volumeL: number }>,
  percentile: number
): number {
  if (sortedDroplets.length === 0 || !Number.isFinite(percentile)) return 0;

  const p = Math.min(1, Math.max(0, percentile));
  const totalVolume = sortedDroplets.reduce(
    (sum, droplet) => sum + Math.max(0, droplet.volumeL),
    0
  );
  if (totalVolume <= 0) return 0;

  const targetVolume = totalVolume * p;
  let cumulativeVolume = 0;
  let previousCumulative = 0;
  let previousDiameter = sortedDroplets[0].diameterUm;

  for (const droplet of sortedDroplets) {
    const currentVolume = Math.max(0, droplet.volumeL);
    cumulativeVolume += currentVolume;

    if (cumulativeVolume >= targetVolume) {
      const intervalVolume = cumulativeVolume - previousCumulative;
      if (intervalVolume <= 0 || droplet.diameterUm === previousDiameter) {
        return droplet.diameterUm;
      }
      const fraction = Math.min(
        1,
        Math.max(0, (targetVolume - previousCumulative) / intervalVolume)
      );
      return previousDiameter + fraction * (droplet.diameterUm - previousDiameter);
    }

    previousCumulative = cumulativeVolume;
    previousDiameter = droplet.diameterUm;
  }

  return sortedDroplets[sortedDroplets.length - 1].diameterUm;
}

/**
 * Computes every published metric from a droplet histogram.
 *
 * Takes the RASTER dimensions (rectWidthPx / rectHeightPx) rather than a linear mm/px
 * ratio. This is deliberate: the raster size plus the physical card size fully determine
 * the calibration, and passing a pre-collapsed linear scale is exactly what allowed the
 * anisotropic-scale defect to appear.
 *
 * Invariants enforced here:
 *  - coveragePercent depends ONLY on the mask (droplet pixels / card pixels). It cannot
 *    move when the declared card size changes.
 *  - density scales as 1 / cardArea.
 *  - diameters and volume scale with the physical pixel area.
 */
export function computeMetricsFromHistogram(
  histogram: SampleHistogramBin[],
  cardWidthMm: number,
  cardHeightMm: number,
  rectWidthPx: number,
  rectHeightPx: number
): ProcessedAnalysisMetrics {
  const cardAreaMm2 = cardWidthMm * cardHeightMm;
  const cardAreaCm2 = cardAreaMm2 / 100;
  const cardAreaHa = cardAreaMm2 / 1e10;

  const totalCardPixels = rectWidthPx * rectHeightPx;
  const mm2PerPixel = computeMm2PerPixel(cardWidthMm, cardHeightMm, rectWidthPx, rectHeightPx);

  if (histogram.length === 0 || cardAreaMm2 <= 0 || totalCardPixels <= 0 || mm2PerPixel <= 0) {
    return {
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      coveragePercentExact: 0,
      includedDropletPixelCount: 0,
      totalCardPixels: Math.max(0, totalCardPixels),
      mm2PerPixel: Math.max(0, mm2PerPixel),
      dv01Um: 0,
      dv05Um: 0,
      dv09Um: 0,
      span: 0,
      estimatedVolumeLha: 0,
      verdict: 'NAO_AVALIADO',
      verdictScore: 0,
      verdictMessage: 'A adequação agronômica não é avaliada automaticamente.',
      asabeCategory: 'Não classificada',
    };
  }

  interface ExpandedDroplet {
    diameterUm: number;
    volumeL: number;
    areaMm2: number;
  }

  const allDroplets: ExpandedDroplet[] = [];
  let totalDroplets = 0;
  let totalVolumeL = 0;
  // Raster-level accumulator: the exact number of mask pixels belonging to included
  // droplets. Coverage is computed from this alone.
  let includedDropletPixelCount = 0;

  for (const bin of histogram) {
    if (bin.pixelCount <= 0 || bin.quantity <= 0) continue;

    const areaMm2 = bin.pixelCount * mm2PerPixel;
    const stainDiameterUm = computeStainDiameterUm(bin.pixelCount, mm2PerPixel);
    const correctedDiameterUm = calculateCorrectedDiameterUm(stainDiameterUm);

    // Volume in Liters: V = (pi/6) * d^3 (d in meters)
    const dMeters = correctedDiameterUm * 1e-6;
    const volumeL = (Math.PI / 6) * Math.pow(dMeters, 3) * 1000;

    totalDroplets += bin.quantity;
    totalVolumeL += volumeL * bin.quantity;
    includedDropletPixelCount += bin.pixelCount * bin.quantity;

    for (let q = 0; q < bin.quantity; q++) {
      allDroplets.push({ diameterUm: correctedDiameterUm, volumeL, areaMm2 });
    }
  }

  if (totalDroplets === 0 || totalVolumeL === 0) {
    return {
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      coveragePercentExact: 0,
      includedDropletPixelCount: 0,
      totalCardPixels,
      mm2PerPixel,
      dv01Um: 0,
      dv05Um: 0,
      dv09Um: 0,
      span: 0,
      estimatedVolumeLha: 0,
      verdict: 'NAO_AVALIADO',
      verdictScore: 0,
      verdictMessage: 'A adequação agronômica não é avaliada automaticamente.',
      asabeCategory: 'Não classificada',
    };
  }

  allDroplets.sort((a, b) => a.diameterUm - b.diameterUm);

  // Percentis volumétricos interpolados. Selecionar somente o primeiro degrau que
  // cruza o alvo cria saltos artificiais quando poucas classes de tamanho dominam.
  const dv01Um = interpolateVolumePercentile(allDroplets, 0.1);
  const dv05Um = interpolateVolumePercentile(allDroplets, 0.5);
  const dv09Um = interpolateVolumePercentile(allDroplets, 0.9);

  const span = dv05Um > 0 ? Number(((dv09Um - dv01Um) / dv05Um).toFixed(2)) : 0;
  const density = Number((totalDroplets / cardAreaCm2).toFixed(1));

  // Coverage is a RASTER ratio: droplet pixels over card pixels.
  // It must not reference mm, DPI or any linear scale, so that declaring a different
  // physical card size for the same mask cannot change it.
  const coveragePercentExact = Math.min(100, (includedDropletPixelCount / totalCardPixels) * 100);
  const coveragePercent = Number(coveragePercentExact.toFixed(1));

  const estimatedVolumeLha = cardAreaHa > 0 ? Number((totalVolumeL / cardAreaHa).toFixed(2)) : 0;

  const roundedVmd = Math.round(dv05Um);
  const roundedDv01 = Math.round(dv01Um);
  const roundedDv09 = Math.round(dv09Um);

  return {
    totalDroplets,
    density,
    coveragePercent,
    coveragePercentExact,
    includedDropletPixelCount,
    totalCardPixels,
    mm2PerPixel,
    dv01Um: roundedDv01,
    dv05Um: roundedVmd,
    dv09Um: roundedDv09,
    span,
    estimatedVolumeLha,
    verdict: 'NAO_AVALIADO',
    verdictScore: 0,
    verdictMessage: 'A adequação agronômica depende do alvo, cultura, produto e condições de aplicação.',
    asabeCategory: 'Não classificada',
  };
}

/**
 * Converts DropletComponent list to DropletItem list for Step 6 inspection,
 * preserving exact pixel counts and mm² area.
 */
export function convertComponentsToDropletItems(
  components: DropletComponent[],
  rectWidthPx: number,
  rectHeightPx: number
): DropletItem[] {
  return components.map((comp) => {
    const sizePx = Math.max(3, Math.round(Math.hypot(comp.maxX - comp.minX, comp.maxY - comp.minY)));
    return {
      id: comp.id,
      x: comp.centerX,
      y: comp.centerY,
      diameterUm: comp.diameterUm,
      sizePx,
      included: comp.included,
      pixelCount: comp.pixelCount,
      areaMm2: comp.areaMm2,
    };
  });
}
