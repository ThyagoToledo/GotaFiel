import {
  binarizeImageBuffer,
  buildHistogramBins,
  computeMetricsFromHistogram,
  convertComponentsToDropletItems,
  findConnectedComponents,
  rectifyPixels,
} from './imageProcessor';
import { AnalysisParams, CropCorners } from './types';

export interface WorkerRequest {
  id: string;
  pixels: Uint8ClampedArray;
  srcWidth: number;
  srcHeight: number;
  corners: CropCorners;
  targetWidth: number;
  targetHeight: number;
  cardSizeMm: { width: number; height: number };
  params: AnalysisParams;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  rectifiedPixels: Uint8ClampedArray;
  binaryMask: Uint8Array;
  thresholdUsed: number;
  metrics: ReturnType<typeof computeMetricsFromHistogram>;
  droplets: ReturnType<typeof convertComponentsToDropletItems>;
  histogram: ReturnType<typeof buildHistogramBins>;
  mmPerPixel: number;
  error?: string;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    const {
      id,
      pixels,
      srcWidth,
      srcHeight,
      corners,
      targetWidth,
      targetHeight,
      cardSizeMm,
      params,
    } = req;

    // 1. Rectify Perspective
    const rectifiedPixels = rectifyPixels(
      pixels,
      srcWidth,
      srcHeight,
      corners,
      targetWidth,
      targetHeight
    );

    // 2. Compute mmPerPixel
    const mmPerPixelX = cardSizeMm.width / targetWidth;
    const mmPerPixelY = cardSizeMm.height / targetHeight;
    const mmPerPixel = (mmPerPixelX + mmPerPixelY) / 2;

    // 3. Binarize Image
    const { binaryMask, thresholdUsed } = binarizeImageBuffer(
      rectifiedPixels,
      targetWidth,
      targetHeight,
      params.method,
      params.thresholdAdjustment
    );

    // 4. Find Connected Components
    const components = findConnectedComponents(
      binaryMask,
      targetWidth,
      targetHeight,
      {
        discardBorder: params.discardBorder,
        minAreaPx: params.minAreaPx,
        minDropletUm: params.minDropletUm,
        mmPerPixel,
      }
    );

    // 5. Build Histogram & Compute Metrics
    const histogram = buildHistogramBins(components);
    const metrics = computeMetricsFromHistogram(
      histogram,
      cardSizeMm.width,
      cardSizeMm.height,
      mmPerPixel
    );

    // 6. Convert to Droplet Items
    const droplets = convertComponentsToDropletItems(components, targetWidth, targetHeight);

    const response: WorkerResponse = {
      id,
      success: true,
      rectifiedPixels,
      binaryMask,
      thresholdUsed,
      metrics,
      droplets,
      histogram,
      mmPerPixel,
    };

    // Use Transferable ArrayBuffers
    (self as unknown as Worker).postMessage(response, [rectifiedPixels.buffer, binaryMask.buffer]);
  } catch (err: any) {
    self.postMessage({
      id: req.id,
      success: false,
      error: err?.message || 'Worker error',
    });
  }
};
