import { ScaleValidationResult } from './types';

export function validateScale(
  widthMm: number,
  heightMm: number,
  rectWidthPx: number,
  rectHeightPx: number
): ScaleValidationResult {
  if (!Number.isFinite(widthMm) || widthMm <= 0) {
    return {
      isValid: false,
      widthMm: widthMm || 0,
      heightMm: heightMm || 0,
      rectWidthPx: rectWidthPx || 0,
      rectHeightPx: rectHeightPx || 0,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Largura física deve ser um número finito maior que zero.',
    };
  }

  if (!Number.isFinite(heightMm) || heightMm <= 0) {
    return {
      isValid: false,
      widthMm,
      heightMm: heightMm || 0,
      rectWidthPx: rectWidthPx || 0,
      rectHeightPx: rectHeightPx || 0,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Altura física deve ser um número finito maior que zero.',
    };
  }

  if (!Number.isFinite(rectWidthPx) || rectWidthPx <= 0) {
    return {
      isValid: false,
      widthMm,
      heightMm,
      rectWidthPx: rectWidthPx || 0,
      rectHeightPx: rectHeightPx || 0,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Largura em pixels da imagem deve ser maior que zero.',
    };
  }

  if (!Number.isFinite(rectHeightPx) || rectHeightPx <= 0) {
    return {
      isValid: false,
      widthMm,
      heightMm,
      rectWidthPx,
      rectHeightPx: rectHeightPx || 0,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Altura em pixels da imagem deve ser maior que zero.',
    };
  }

  const areaMm2 = widthMm * heightMm;
  if (!Number.isFinite(areaMm2) || areaMm2 <= 0) {
    return {
      isValid: false,
      widthMm,
      heightMm,
      rectWidthPx,
      rectHeightPx,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Área física calculada deve ser maior que zero.',
    };
  }

  const mmPerPixelX = widthMm / rectWidthPx;
  const mmPerPixelY = heightMm / rectHeightPx;
  const mmPerPixel = (mmPerPixelX + mmPerPixelY) / 2;

  if (!Number.isFinite(mmPerPixel) || mmPerPixel <= 0) {
    return {
      isValid: false,
      widthMm,
      heightMm,
      rectWidthPx,
      rectHeightPx,
      mmPerPixel: 0,
      areaCm2: 0,
      areaMm2: 0,
      errorReason: 'Razão mm/pixel deve ser um valor finito maior que zero.',
    };
  }

  const areaCm2 = areaMm2 / 100;

  return {
    isValid: true,
    widthMm,
    heightMm,
    rectWidthPx,
    rectHeightPx,
    mmPerPixel: Number(mmPerPixel.toFixed(6)),
    areaCm2: Number(areaCm2.toFixed(4)),
    areaMm2: Number(areaMm2.toFixed(2)),
  };
}
