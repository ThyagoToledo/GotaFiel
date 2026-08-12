import { runAnalysisCore } from './analysisCore';
import { AnalysisParams, CropCorners, ProcessedAnalysisMetrics, SampleHistogramBin } from './types';
import { DropletItem } from '../types';
import { WorkerRequest, WorkerResponse } from './imageWorker';

export interface PipelineResult {
  rectifiedPixels: Uint8ClampedArray;
  binaryMask: Uint8Array;
  thresholdUsed: number;
  metrics: ProcessedAnalysisMetrics;
  droplets: DropletItem[];
  histogram: SampleHistogramBin[];
  /** Área física de um pixel, em mm². Grandeza de calibração canônica. */
  mm2PerPixel: number;
  /** sqrt(mm2PerPixel). Exibição e CSV apenas. */
  mmPerPixel: number;
  rectWidthPx: number;
  rectHeightPx: number;
  binaryDataUrl: string;
  rectifiedDataUrl: string;
}

/**
 * Loads an image URL into HTMLImageElement and extracts its raw RGBA pixels.
 */
export function loadImagePixels(
  imageUrl: string
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number; imgElement: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);
      resolve({ pixels: imgData.data, width, height, imgElement: img });
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para processamento.'));
    img.src = imageUrl;
  });
}

/**
 * Renders binary mask Uint8Array to a high-contrast data URL (black droplets on white background)
 */
export function createBinaryMaskDataUrl(binaryMask: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let i = 0; i < binaryMask.length; i++) {
    const val = binaryMask[i] === 1 ? 0 : 255; // 1 = droplet (black), 0 = paper (white)
    const idx = i * 4;
    data[idx] = val; // R
    data[idx + 1] = val; // G
    data[idx + 2] = val; // B
    data[idx + 3] = 255; // Alpha
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Renders RGBA pixel buffer to data URL
 */
export function createRgbaDataUrl(pixels: Uint8ClampedArray, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  imgData.data.set(pixels);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Executes the full image processing pipeline off-thread using a Web Worker.
 */
export async function runImagePipeline(
  imageUrl: string,
  corners: CropCorners,
  cardSizeMm: { width: number; height: number },
  params: AnalysisParams,
  targetWidth = 760,
  targetHeight = 260
): Promise<PipelineResult> {
  const { pixels, width, height } = await loadImagePixels(imageUrl);

  const reqId = `pipeline-${Date.now()}-${Math.random()}`;

  // Execute in Web Worker when available
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(
        new URL('./imageWorker.ts', import.meta.url),
        { type: 'module' }
      );

      const workerResult = await new Promise<WorkerResponse>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id === reqId) {
            if (e.data.success) {
              resolve(e.data);
            } else {
              reject(new Error(e.data.error || 'Erro no Web Worker.'));
            }
          }
        };

        worker.onerror = (err) => {
          reject(new Error(`Worker error: ${err.message}`));
        };

        const requestPayload: WorkerRequest = {
          id: reqId,
          pixels,
          srcWidth: width,
          srcHeight: height,
          corners,
          targetWidth,
          targetHeight,
          cardSizeMm,
          params,
        };

        // Post message transferring buffer
        worker.postMessage(requestPayload, [pixels.buffer]);
      });

      worker.terminate();

      const binaryDataUrl = createBinaryMaskDataUrl(workerResult.binaryMask, targetWidth, targetHeight);
      const rectifiedDataUrl = createRgbaDataUrl(workerResult.rectifiedPixels, targetWidth, targetHeight);

      return {
        rectifiedPixels: workerResult.rectifiedPixels,
        binaryMask: workerResult.binaryMask,
        thresholdUsed: workerResult.thresholdUsed,
        metrics: workerResult.metrics,
        droplets: workerResult.droplets,
        histogram: workerResult.histogram,
        mm2PerPixel: workerResult.mm2PerPixel,
        mmPerPixel: workerResult.mmPerPixel,
        rectWidthPx: targetWidth,
        rectHeightPx: targetHeight,
        binaryDataUrl,
        rectifiedDataUrl,
      };
    } catch (e) {
      console.warn('Fallback to in-thread processing:', e);
    }
  }

  // Fallback for environments without a Worker constructor (e.g. Node test environments).
  // Runs the exact same runAnalysisCore() the Worker runs, so results cannot diverge.
  const core = runAnalysisCore({
    pixels,
    srcWidth: width,
    srcHeight: height,
    corners,
    targetWidth,
    targetHeight,
    cardSizeMm,
    params,
  });

  const binaryDataUrl = createBinaryMaskDataUrl(core.binaryMask, targetWidth, targetHeight);
  const rectifiedDataUrl = createRgbaDataUrl(core.rectifiedPixels, targetWidth, targetHeight);

  return {
    rectifiedPixels: core.rectifiedPixels,
    binaryMask: core.binaryMask,
    thresholdUsed: core.thresholdUsed,
    metrics: core.metrics,
    droplets: core.droplets,
    histogram: core.histogram,
    mm2PerPixel: core.mm2PerPixel,
    mmPerPixel: core.mmPerPixel,
    rectWidthPx: targetWidth,
    rectHeightPx: targetHeight,
    binaryDataUrl,
    rectifiedDataUrl,
  };
}
