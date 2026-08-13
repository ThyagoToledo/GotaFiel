import { ScaleValidationResult } from './types';
import { computeMm2PerPixel, mmPerPixelEquivalent } from './imageProcessor';

function invalid(
  errorReason: string,
  widthMm: number,
  heightMm: number,
  rectWidthPx: number,
  rectHeightPx: number
): ScaleValidationResult {
  return {
    isValid: false,
    widthMm: Number.isFinite(widthMm) ? widthMm : 0,
    heightMm: Number.isFinite(heightMm) ? heightMm : 0,
    rectWidthPx: Number.isFinite(rectWidthPx) ? rectWidthPx : 0,
    rectHeightPx: Number.isFinite(rectHeightPx) ? rectHeightPx : 0,
    mm2PerPixel: 0,
    mmPerPixel: 0,
    scaleX: 0,
    scaleY: 0,
    isAnisotropic: false,
    areaCm2: 0,
    areaMm2: 0,
    errorReason,
  };
}

/**
 * Validates the physical calibration of a rectified card raster.
 *
 * The canonical calibration quantity is the physical AREA of one pixel:
 *
 *   scaleX      = widthMm  / rectWidthPx
 *   scaleY      = heightMm / rectHeightPx
 *   mm2PerPixel = scaleX * scaleY
 *
 * `mmPerPixel` is reported only as sqrt(mm2PerPixel), for display and CSV compatibility.
 * The arithmetic mean (scaleX + scaleY) / 2 is never used: squaring it overestimates the
 * pixel area whenever scaleX !== scaleY, which is what let coverage drift with the
 * declared card size.
 */
export function validateScale(
  widthMm: number,
  heightMm: number,
  rectWidthPx: number,
  rectHeightPx: number
): ScaleValidationResult {
  if (!Number.isFinite(widthMm) || widthMm <= 0) {
    return invalid('Largura física deve ser um número finito maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  if (!Number.isFinite(heightMm) || heightMm <= 0) {
    return invalid('Altura física deve ser um número finito maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  if (!Number.isFinite(rectWidthPx) || rectWidthPx <= 0) {
    return invalid('Largura em pixels da imagem deve ser maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  if (!Number.isFinite(rectHeightPx) || rectHeightPx <= 0) {
    return invalid('Altura em pixels da imagem deve ser maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  const areaMm2 = widthMm * heightMm;
  if (!Number.isFinite(areaMm2) || areaMm2 <= 0) {
    return invalid('Área física calculada deve ser maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  const scaleX = widthMm / rectWidthPx;
  const scaleY = heightMm / rectHeightPx;
  const mm2PerPixel = computeMm2PerPixel(widthMm, heightMm, rectWidthPx, rectHeightPx);

  if (!Number.isFinite(mm2PerPixel) || mm2PerPixel <= 0) {
    return invalid('Área física por pixel deve ser um valor finito maior que zero.', widthMm, heightMm, rectWidthPx, rectHeightPx);
  }

  // Pixels are non-square in physical space when the raster aspect ratio does not match
  // the card aspect ratio. Area-based metrics stay exact, but the rendered shape of a
  // droplet is stretched, so the UI can warn about it.
  //
  // The comparison must be relative and must absorb rounding: the raster is rounded to
  // whole pixels, so a card that IS square by construction still lands on scales that
  // differ in the 5th decimal (76/1797 vs 26/615). An exact test flags those as
  // stretched and shows the user a warning about a 0.04 % difference. The tolerance
  // therefore tracks the raster itself — half a pixel on each axis, plus margin.
  const roundingTolerance = 1.5 / Math.min(rectWidthPx, rectHeightPx);
  const relativeDifference = Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY);
  const isAnisotropic = relativeDifference > roundingTolerance;

  const areaCm2 = areaMm2 / 100;

  return {
    isValid: true,
    widthMm,
    heightMm,
    rectWidthPx,
    rectHeightPx,
    mm2PerPixel: Number(mm2PerPixel.toFixed(9)),
    mmPerPixel: Number(mmPerPixelEquivalent(mm2PerPixel).toFixed(6)),
    scaleX: Number(scaleX.toFixed(9)),
    scaleY: Number(scaleY.toFixed(9)),
    isAnisotropic,
    areaCm2: Number(areaCm2.toFixed(4)),
    areaMm2: Number(areaMm2.toFixed(2)),
  };
}
