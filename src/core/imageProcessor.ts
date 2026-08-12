import {
  AnalysisParams,
  BinarizationMethod,
  CropCorners,
  DropletComponent,
  ProcessedAnalysisMetrics,
  SampleHistogramBin,
} from './types';
import { ASABECategory, QualityVerdict, DropletItem } from '../types';

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

export function calculateASABECategory(vmdUm: number): ASABECategory {
  if (vmdUm <= 0 || !Number.isFinite(vmdUm)) return 'Muito Fina';
  if (vmdUm < 100) return 'Muito Fina';
  if (vmdUm <= 175) return 'Fina';
  if (vmdUm <= 250) return 'Média';
  if (vmdUm <= 375) return 'Grossa';
  if (vmdUm <= 450) return 'Muito Grossa';
  return 'Extremamente Grossa';
}

export function calculateVerdict(coverage: number, density: number): { verdict: QualityVerdict; score: number; message?: string } {
  if (!Number.isFinite(coverage) || !Number.isFinite(density)) {
    return { verdict: 'RUIM', score: 0, message: 'Métricas de análise inválidas.' };
  }

  if (coverage >= 80) {
    return {
      verdict: 'EXCESSO',
      score: 45,
      message: `Cobertura de ${coverage.toFixed(1)}%. Indica excesso de volume ou gotas muito grandes. Risco de perda e escorrimento.`,
    };
  }
  if (density >= 60 && coverage >= 10 && coverage <= 50) {
    return {
      verdict: 'BOM',
      score: Math.min(100, Math.max(70, Math.round(78 + Math.min(22, (density - 60) * 0.4)))),
      message: 'Densidade e cobertura adequadas para aplicação eficiente.',
    };
  }
  if (density >= 30 && coverage >= 5) {
    return {
      verdict: 'REGULAR',
      score: 62,
      message: 'Aplicações aceitáveis, mas recomenda-se atenção ao espaçamento dos bicos.',
    };
  }
  return {
    verdict: 'RUIM',
    score: density === 0 && coverage === 0 ? 0 : 28,
    message: 'Pouca densidade de gotas ou cobertura insuficiente para controle eficaz.',
  };
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
 * Perspective homography / bilinear quad transformation to rectify quadrilateral selection.
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

  const tlX = (corners.tl.x / 100) * srcWidth;
  const tlY = (corners.tl.y / 100) * srcHeight;
  const trX = (corners.tr.x / 100) * srcWidth;
  const trY = (corners.tr.y / 100) * srcHeight;
  const brX = (corners.br.x / 100) * srcWidth;
  const brY = (corners.br.y / 100) * srcHeight;
  const blX = (corners.bl.x / 100) * srcWidth;
  const blY = (corners.bl.y / 100) * srcHeight;

  for (let y = 0; y < targetHeight; y++) {
    const v = y / Math.max(1, targetHeight - 1);
    for (let x = 0; x < targetWidth; x++) {
      const u = x / Math.max(1, targetWidth - 1);

      // Bilinear quad mapping
      const topX = (1 - u) * tlX + u * trX;
      const topY = (1 - u) * tlY + u * trY;
      const botX = (1 - u) * blX + u * brX;
      const botY = (1 - u) * blY + u * brY;

      const srcX = Math.min(srcWidth - 1, Math.max(0, Math.round((1 - v) * topX + v * botX)));
      const srcY = Math.min(srcHeight - 1, Math.max(0, Math.round((1 - v) * topY + v * botY)));

      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const tgtIdx = (y * targetWidth + x) * 4;

      targetPixels[tgtIdx] = srcPixels[srcIdx];
      targetPixels[tgtIdx + 1] = srcPixels[srcIdx + 1];
      targetPixels[tgtIdx + 2] = srcPixels[srcIdx + 2];
      targetPixels[tgtIdx + 3] = srcPixels[srcIdx + 3];
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
  const histogram = new Array(256).fill(0);

  for (let i = 0; i < totalPixels; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];

    let val = 0;
    if (method === 'chromatic') {
      // Chromatic stain formula: B - max(R, G)
      val = Math.max(0, Math.min(255, b - Math.max(r, g)));
    } else {
      // GOTAS legacy formula: luminance (0.299R + 0.587G + 0.114B)
      val = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
    }

    stainValues[i] = val;
    histogram[val]++;
  }

  const otsuVal = computeOtsuThreshold(histogram, totalPixels);
  const thresholdUsed = Math.max(0, Math.min(255, otsuVal + thresholdAdjustment));

  const binaryMask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (method === 'chromatic') {
      binaryMask[i] = stainValues[i] >= thresholdUsed ? 1 : 0;
    } else {
      // Legacy GOTAS: dark stain droplets on lighter paper
      binaryMask[i] = stainValues[i] <= thresholdUsed ? 1 : 0;
    }
  }

  return { binaryMask, thresholdUsed, stainValues };
}

export function findConnectedComponents(
  binaryMask: Uint8Array,
  width: number,
  height: number,
  params: { discardBorder: boolean; minAreaPx: number; minDropletUm: number; mmPerPixel: number }
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

  const mmPerPx = params.mmPerPixel || 0.1;

  const result: DropletComponent[] = [];

  for (const c of rawComponents) {
    const areaMm2 = c.pixelCount * mmPerPx * mmPerPx;
    const stainDiameterUm = 2000 * Math.sqrt(areaMm2 / Math.PI);
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

export function computeMetricsFromHistogram(
  histogram: SampleHistogramBin[],
  cardWidthMm: number,
  cardHeightMm: number,
  mmPerPixel: number
): ProcessedAnalysisMetrics {
  const cardAreaMm2 = cardWidthMm * cardHeightMm;
  const cardAreaCm2 = cardAreaMm2 / 100;
  const cardAreaHa = cardAreaMm2 / 1e10;

  if (histogram.length === 0 || cardAreaMm2 <= 0 || mmPerPixel <= 0) {
    return {
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      dv01Um: 0,
      dv05Um: 0,
      dv09Um: 0,
      span: 0,
      estimatedVolumeLha: 0,
      verdict: 'RUIM',
      verdictScore: 0,
      verdictMessage: 'Nenhuma gota detectada na amostra.',
      asabeCategory: 'Muito Fina',
    };
  }

  interface ExpandedDroplet {
    diameterUm: number;
    volumeL: number;
    areaMm2: number;
  }

  const allDroplets: ExpandedDroplet[] = [];
  let totalDroplets = 0;
  let totalAreaMm2 = 0;
  let totalVolumeL = 0;

  for (const bin of histogram) {
    if (bin.pixelCount <= 0 || bin.quantity <= 0) continue;

    const areaMm2 = bin.pixelCount * mmPerPixel * mmPerPixel;
    const stainDiameterUm = 2000 * Math.sqrt(areaMm2 / Math.PI);
    const correctedDiameterUm = calculateCorrectedDiameterUm(stainDiameterUm);

    // Volume in Liters: V = (pi/6) * d^3 (d in meters)
    const dMeters = correctedDiameterUm * 1e-6;
    const volumeL = (Math.PI / 6) * Math.pow(dMeters, 3) * 1000;

    totalDroplets += bin.quantity;
    totalAreaMm2 += areaMm2 * bin.quantity;
    totalVolumeL += volumeL * bin.quantity;

    for (let q = 0; q < bin.quantity; q++) {
      allDroplets.push({ diameterUm: correctedDiameterUm, volumeL, areaMm2 });
    }
  }

  if (totalDroplets === 0 || totalVolumeL === 0) {
    return {
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      dv01Um: 0,
      dv05Um: 0,
      dv09Um: 0,
      span: 0,
      estimatedVolumeLha: 0,
      verdict: 'RUIM',
      verdictScore: 0,
      verdictMessage: 'Nenhuma gota válida detectada.',
      asabeCategory: 'Muito Fina',
    };
  }

  allDroplets.sort((a, b) => a.diameterUm - b.diameterUm);

  // Calculate volumetric percentiles DV0.1, DV0.5, DV0.9
  let cumVol = 0;
  let dv01Um = 0;
  let dv05Um = 0;
  let dv09Um = 0;

  for (const d of allDroplets) {
    cumVol += d.volumeL;
    const frac = cumVol / totalVolumeL;

    if (dv01Um === 0 && frac >= 0.1) {
      dv01Um = d.diameterUm;
    }
    if (dv05Um === 0 && frac >= 0.5) {
      dv05Um = d.diameterUm;
    }
    if (dv09Um === 0 && frac >= 0.9) {
      dv09Um = d.diameterUm;
    }
  }

  if (dv01Um === 0) dv01Um = allDroplets[0].diameterUm;
  if (dv05Um === 0) dv05Um = allDroplets[Math.floor(allDroplets.length / 2)].diameterUm;
  if (dv09Um === 0) dv09Um = allDroplets[allDroplets.length - 1].diameterUm;

  const span = dv05Um > 0 ? Number(((dv09Um - dv01Um) / dv05Um).toFixed(2)) : 0;
  const density = Number((totalDroplets / cardAreaCm2).toFixed(1));
  const coveragePercent = Number(Math.min(100, (totalAreaMm2 / cardAreaMm2) * 100).toFixed(1));
  const estimatedVolumeLha = cardAreaHa > 0 ? Number((totalVolumeL / cardAreaHa).toFixed(2)) : 0;

  const roundedVmd = Math.round(dv05Um);
  const roundedDv01 = Math.round(dv01Um);
  const roundedDv09 = Math.round(dv09Um);

  const { verdict, score, message } = calculateVerdict(coveragePercent, density);
  const asabeCategory = calculateASABECategory(roundedVmd);

  return {
    totalDroplets,
    density,
    coveragePercent,
    dv01Um: roundedDv01,
    dv05Um: roundedVmd,
    dv09Um: roundedDv09,
    span,
    estimatedVolumeLha,
    verdict,
    verdictScore: score,
    verdictMessage: message,
    asabeCategory,
  };
}

/**
 * Converts DropletComponent list to DropletItem list for Step 6 inspection.
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
    };
  });
}
