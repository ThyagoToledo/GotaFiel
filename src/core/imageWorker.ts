import { runAnalysisCore } from './analysisCore';
import {
  buildHistogramBins,
  computeMetricsFromHistogram,
  convertComponentsToDropletItems,
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
  /** Área física de um pixel, em mm². Grandeza de calibração canônica. */
  mm2PerPixel: number;
  /** sqrt(mm2PerPixel). Exibição e CSV apenas. */
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

    // Single shared pipeline — identical to the in-thread fallback in workerPipeline.ts.
    const core = runAnalysisCore({
      pixels,
      srcWidth,
      srcHeight,
      corners,
      targetWidth,
      targetHeight,
      cardSizeMm,
      params,
    });

    const response: WorkerResponse = {
      id,
      success: true,
      rectifiedPixels: core.rectifiedPixels,
      binaryMask: core.binaryMask,
      thresholdUsed: core.thresholdUsed,
      metrics: core.metrics,
      droplets: core.droplets,
      histogram: core.histogram,
      mm2PerPixel: core.mm2PerPixel,
      mmPerPixel: core.mmPerPixel,
    };

    // Use Transferable ArrayBuffers
    (self as unknown as Worker).postMessage(response, [
      core.rectifiedPixels.buffer,
      core.binaryMask.buffer,
    ]);
  } catch (err: any) {
    self.postMessage({
      id: req.id,
      success: false,
      error: err?.message || 'Worker error',
    });
  }
};
