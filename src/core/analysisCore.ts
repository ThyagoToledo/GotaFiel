import {
  binarizeImageBuffer,
  boxBlurRgba,
  buildHistogramBins,
  computeMetricsFromHistogram,
  computeMm2PerPixel,
  convertComponentsToDropletItems,
  findConnectedComponents,
  fillBinaryHoles,
  mmPerPixelEquivalent,
  normalizeCardBackground,
  rectifyPixels,
} from './imageProcessor';
import {
  AnalysisParams,
  CropCorners,
  DropletComponent,
  ProcessedAnalysisMetrics,
  SampleHistogramBin,
} from './types';
import { DropletItem } from '../types';

export interface AnalysisCoreInput {
  pixels: Uint8ClampedArray | Uint8Array;
  srcWidth: number;
  srcHeight: number;
  corners: CropCorners;
  targetWidth: number;
  targetHeight: number;
  cardSizeMm: { width: number; height: number };
  params: AnalysisParams;
}

export interface AnalysisCoreResult {
  rectifiedPixels: Uint8ClampedArray;
  binaryMask: Uint8Array;
  thresholdUsed: number;
  components: DropletComponent[];
  histogram: SampleHistogramBin[];
  metrics: ProcessedAnalysisMetrics;
  droplets: DropletItem[];
  /** Área física de um pixel, em mm². Grandeza de calibração canônica. */
  mm2PerPixel: number;
  /** sqrt(mm2PerPixel). Exibição e CSV apenas — nunca usado em cálculo de área. */
  mmPerPixel: number;
  rectWidthPx: number;
  rectHeightPx: number;
}

/**
 * The single analysis pipeline.
 *
 * Both the Web Worker (`imageWorker.ts`) and the in-thread fallback
 * (`workerPipeline.ts`) call this exact function, so the two execution paths cannot
 * drift apart. Tests exercise it directly, which is what makes a passing test a
 * statement about the pipeline the UI actually runs.
 *
 * Calibration contract:
 *   mm2PerPixel = (cardWidthMm * cardHeightMm) / (rectWidthPx * rectHeightPx)
 * Areas, diameters and volume derive from mm2PerPixel; coverage derives from the mask
 * alone. No step consumes an averaged linear mm/px scale.
 */
export function runAnalysisCore(input: AnalysisCoreInput): AnalysisCoreResult {
  const {
    pixels,
    srcWidth,
    srcHeight,
    corners,
    targetWidth,
    targetHeight,
    cardSizeMm,
    params,
  } = input;

  // 1. Rectify perspective onto the target raster.
  const rectifiedPixels = rectifyPixels(
    pixels,
    srcWidth,
    srcHeight,
    corners,
    targetWidth,
    targetHeight
  );

  // 2. Physical area of one pixel.
  const mm2PerPixel = computeMm2PerPixel(
    cardSizeMm.width,
    cardSizeMm.height,
    targetWidth,
    targetHeight
  );
  const mmPerPixel = mmPerPixelEquivalent(mm2PerPixel);

  // 3. Normalização ou compatibilidade em cinza antes do limiar.
  let pixelsForBinarization = rectifiedPixels;
  if (params.normalizeIllumination ?? (params.method === 'hybrid')) {
    pixelsForBinarization = normalizeCardBackground(rectifiedPixels, targetWidth, targetHeight);
  } else if (params.method === 'gotas-legacy') {
    pixelsForBinarization = boxBlurRgba(rectifiedPixels, targetWidth, targetHeight, params.meanFilterPasses ?? 1);
  }

  // 4. Binarize.
  const binarized = binarizeImageBuffer(
    pixelsForBinarization,
    targetWidth,
    targetHeight,
    params.method,
    params.thresholdAdjustment
  );
  const binaryMask = params.method === 'gotas-legacy' && (params.fillHoles ?? true)
    ? fillBinaryHoles(binarized.binaryMask, targetWidth, targetHeight)
    : binarized.binaryMask;
  const { thresholdUsed } = binarized;

  // 5. Connected components.
  const components = findConnectedComponents(binaryMask, targetWidth, targetHeight, {
    discardBorder: params.discardBorder,
    minAreaPx: params.minAreaPx,
    minDropletUm: params.minDropletUm,
    mm2PerPixel,
    splitOverlappingDroplets: params.splitOverlappingDroplets ?? (params.method === 'hybrid'),
    filterArtifacts: params.filterArtifacts,
    roundnessMin: params.roundnessMin,
  });

  // 6. Máscara binária filtrada (apenas componentes incluídos no limiar de tamanho e filtros)
  const filteredBinaryMask = new Uint8Array(targetWidth * targetHeight);
  for (const c of components) {
    if (c.included !== false && c.pixels) {
      for (const p of c.pixels) {
        filteredBinaryMask[p] = 1;
      }
    }
  }

  // 7. Histogram + metrics.
  const histogram = buildHistogramBins(components);
  const metrics = computeMetricsFromHistogram(
    histogram,
    cardSizeMm.width,
    cardSizeMm.height,
    targetWidth,
    targetHeight
  );

  // 8. Droplet items for the inspection screen.
  const droplets = convertComponentsToDropletItems(components, targetWidth, targetHeight);

  return {
    rectifiedPixels,
    binaryMask: filteredBinaryMask,
    thresholdUsed,
    components,
    histogram,
    metrics,
    droplets,
    mm2PerPixel,
    mmPerPixel,
    rectWidthPx: targetWidth,
    rectHeightPx: targetHeight,
  };
}
