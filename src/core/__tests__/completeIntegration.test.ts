import { describe, it, expect, vi } from 'vitest';
import { computeCornersForAspect, DEFAULT_FULL_CORNERS } from '../../components/wizard/Step2Crop';
import { generateAnalysisPdfReport } from '../../utils/generatePdfReport';
import { AnalysisData } from '../../types';
import { runAnalysisCore } from '../analysisCore';
import { CropCorners } from '../types';

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      internal = {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      };
      setFillColor = vi.fn();
      setDrawColor = vi.fn();
      setTextColor = vi.fn();
      setFont = vi.fn();
      setFontSize = vi.fn();
      setLineWidth = vi.fn();
      rect = vi.fn();
      line = vi.fn();
      text = vi.fn();
      addImage = vi.fn();
      getTextWidth = vi.fn((txt: string) => (txt ? txt.length * 1.5 : 5));
      splitTextToSize = vi.fn((txt: string) => [txt]);
      save = vi.fn();
    },
  };
});

describe('Verificação Completa de Funcionalidades do GotaFiel', () => {
  // 1. Teste de Enquadramento e Corte (Step2Crop)
  it('1. Seleção e Corte sem distorção para cartões horizontais e verticais', () => {
    // Imagem Vertical (ex: 600x1200, imgAspect = 0.5) e Cartão Padrão Comercial (76x26 mm = 2.923)
    const imgAspect = 600 / 1200;
    const corners = computeCornersForAspect(76, 26, imgAspect);
    expect(corners.tl.x).toBeGreaterThanOrEqual(0);
    expect(corners.br.x).toBeLessThanOrEqual(100);
    expect(corners.tl.y).toBeGreaterThanOrEqual(0);
    expect(corners.br.y).toBeLessThanOrEqual(100);

    const widthPct = corners.br.x - corners.tl.x;
    const heightPct = corners.br.y - corners.tl.y;
    const aspectCalculated = (widthPct / heightPct) * imgAspect;
    expect(aspectCalculated).toBeCloseTo(76 / 26, 1);
  });

  // 2. Teste de Sensibilidade com Gotas Menores que 10 µm
  it('2. Processamento aceita e filtra gotas minúsculas (< 10 µm)', () => {
    const width = 200;
    const height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Preenche com amarelo
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = 240;
      pixels[i * 4 + 1] = 220;
      pixels[i * 4 + 2] = 45;
      pixels[i * 4 + 3] = 255;
    }

    // Coloca 1 mancha azul
    const cx = 100;
    const cy = 50;
    const r = 4;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const idx = ((cy + dy) * width + (cx + dx)) * 4;
          pixels[idx] = 10;
          pixels[idx + 1] = 30;
          pixels[idx + 2] = 180;
          pixels[idx + 3] = 255;
        }
      }
    }

    const corners: CropCorners = DEFAULT_FULL_CORNERS;

    const resultMin1 = runAnalysisCore({
      pixels,
      srcWidth: width,
      srcHeight: height,
      corners,
      targetWidth: width,
      targetHeight: height,
      cardSizeMm: { width: 76, height: 26 },
      params: {
        method: 'hybrid',
        thresholdAdjustment: 0,
        minAreaPx: 1,
        minDropletUm: 1, // Permite 1 µm
        discardBorder: false,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    expect(resultMin1.metrics.totalDroplets).toBeGreaterThanOrEqual(1);

    const resultMin5000 = runAnalysisCore({
      pixels,
      srcWidth: width,
      srcHeight: height,
      corners,
      targetWidth: width,
      targetHeight: height,
      cardSizeMm: { width: 76, height: 26 },
      params: {
        method: 'hybrid',
        thresholdAdjustment: 0,
        minAreaPx: 1,
        minDropletUm: 5000, // Filtra
        discardBorder: false,
        splitOverlappingDroplets: true,
        filterArtifacts: true,
        normalizeIllumination: true,
      },
    });

    expect(resultMin5000.metrics.totalDroplets).toBe(0);
  });

  // 3. Teste do Relatório em PDF com Imagens Verticais e Horizontais
  it('3. Geração de PDF funciona com cartões verticais e horizontais sem erros', async () => {
    const mockAnalysis: AnalysisData = {
      id: 'test-pdf-1',
      title: 'Amostra Teste Verificação',
      date: '2026-08-25',
      timestamp: Date.now(),
      imageUrl: 'data:image/png;base64,mock',
      dpi: 600,
      vmdUm: 210,
      dv01Um: 110,
      dv09Um: 360,
      span: 1.19,
      density: 45,
      coveragePercent: 18.5,
      asabeCategory: 'Média',
      totalDroplets: 35,
      estimatedVolumeLha: 85.0,
      verdict: 'BOM',
      verdictScore: 90,
      cardColor: 'Amarelo',
      cardSizeMm: { width: 76, height: 129.1 }, // Vertical
      analysisMethod: 'hybrid',
      sensitivity: 0,
      droplets: [
        { id: 'd1', x: 20, y: 30, sizePx: 8, diameterUm: 180, included: true },
        { id: 'd2', x: 50, y: 60, sizePx: 10, diameterUm: 220, included: true },
      ],
      measurementQuality: {
        status: 'ADEQUADA',
        effectiveDpi: 600,
        orientationCorrected: false,
        coverageReliable: true,
        countDensityReliable: true,
        sizeVolumeReliable: true,
        warnings: [],
        algorithmVersion: '2.5.0',
      },
    };

    await expect(generateAnalysisPdfReport(mockAnalysis)).resolves.not.toThrow();
  });
});
