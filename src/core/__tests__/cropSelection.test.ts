import { describe, it, expect } from 'vitest';
import { DEFAULT_FULL_CORNERS } from '../../components/wizard/Step2Crop';
import { measureQuadSizePx, orientCropCornersForCard } from '../imageProcessor';
import { CropCorners } from '../types';

describe('Validação do Dimensionamento e Seleção de Imagem (Passo 2)', () => {
  it('1. Selecionar tudo: abrange exatamente 100% da largura e 100% da altura da imagem', () => {
    const corners = DEFAULT_FULL_CORNERS;
    expect(corners.tl).toEqual({ x: 0, y: 0 });
    expect(corners.tr).toEqual({ x: 100, y: 0 });
    expect(corners.br).toEqual({ x: 100, y: 100 });
    expect(corners.bl).toEqual({ x: 0, y: 100 });

    const srcWidth = 1920;
    const srcHeight = 1080;
    const quad = measureQuadSizePx(corners, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(1920);
    expect(quad.heightPx).toBe(1080);
  });

  it('2. Imagem Horizontal (Paisagem): preserva dimensões reais sem cortes', () => {
    const srcWidth = 1600;
    const srcHeight = 600;
    const quad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(1600);
    expect(quad.heightPx).toBe(600);
  });

  it('3. Imagem Vertical (Retrato - ex: 1080 × 1920 ou 300 × 500 px): preserva proporções exatas', () => {
    const srcWidth = 300;
    const srcHeight = 500;
    const quad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(300);
    expect(quad.heightPx).toBe(500);

    // Rotação lógica se associada a cartão horizontal de 76x26mm
    const oriented = orientCropCornersForCard(DEFAULT_FULL_CORNERS, srcWidth, srcHeight, 76, 26);
    expect(oriented.orientationCorrected).toBe(true);
  });

  it('4. Imagem Quadrada (1000 × 1000 px): seleção integral corresponde à área total', () => {
    const srcWidth = 1000;
    const srcHeight = 1000;
    const quad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(1000);
    expect(quad.heightPx).toBe(1000);
  });

  it('5. Imagem Menor que o cartão padrão (ex: 200 × 80 px): seleção total não perde resolução', () => {
    const srcWidth = 200;
    const srcHeight = 80;
    const quad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(200);
    expect(quad.heightPx).toBe(80);
  });

  it('6. Imagem Maior de altíssima resolução (ex: 4032 × 3024 px de câmera móvel): mapeamento 100% fiel', () => {
    const srcWidth = 4032;
    const srcHeight = 3024;
    const quad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);

    expect(quad.widthPx).toBe(4032);
    expect(quad.heightPx).toBe(3024);
  });

  it('7. Seleção Parcial Personalizada: redimensionamento manual e retorno a Selecionar Tudo', () => {
    const customCorners: CropCorners = {
      tl: { x: 10, y: 15 },
      tr: { x: 90, y: 15 },
      br: { x: 90, y: 85 },
      bl: { x: 10, y: 85 },
    };

    const srcWidth = 1000;
    const srcHeight = 1000;
    const partialQuad = measureQuadSizePx(customCorners, srcWidth, srcHeight);

    expect(partialQuad.widthPx).toBe(800);
    expect(partialQuad.heightPx).toBe(700);

    // Ao redefinir para 'Selecionar Tudo'
    const fullQuad = measureQuadSizePx(DEFAULT_FULL_CORNERS, srcWidth, srcHeight);
    expect(fullQuad.widthPx).toBe(1000);
    expect(fullQuad.heightPx).toBe(1000);
  });
});
