import {
  binarizeImageBuffer,
  buildHistogramBins,
  computeMetricsFromHistogram,
  computeMm2PerPixel,
  convertComponentsToDropletItems,
  findConnectedComponents,
  mmPerPixelEquivalent,
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

  // 3. Binarize.
  const { binaryMask, thresholdUsed } = binarizeImageBuffer(
    rectifiedPixels,
    targetWidth,
    targetHeight,
    params.method,
    params.thresholdAdjustment
  );

  // 4. Connected components.
  const components = findConnectedComponents(binaryMask, targetWidth, targetHeight, {
    discardBorder: params.discardBorder,
    minAreaPx: params.minAreaPx,
    minDropletUm: params.minDropletUm,
    mm2PerPixel,
  });

  // 5. Histogram + metrics.
  const histogram = buildHistogramBins(components);
  const metrics = computeMetricsFromHistogram(
    histogram,
    cardSizeMm.width,
    cardSizeMm.height,
    targetWidth,
    targetHeight
  );

  // 6. Droplet items for the inspection screen.
  const droplets = convertComponentsToDropletItems(components, targetWidth, targetHeight);

  return {
    rectifiedPixels,
    binaryMask,
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
