import { describe, expect, it, vi } from 'vitest';
import { generateAnalysisPdfReport } from '../generatePdfReport';
import { AnalysisData } from '../../types';

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

function createSampleAnalysis(override: Partial<AnalysisData> = {}): AnalysisData {
  return {
    id: 'test-1',
    title: 'Talhão Soja Norte - Amostra 1',
    date: '2026-08-17',
    timestamp: 1786975000000,
    imageUrl: 'data:image/png;base64,sample',
    cardColor: 'Amarelo',
    cardSizeMm: { width: 76, height: 26 },
    dpi: 600,
    sensitivity: 0,
    analysisMethod: 'hybrid',
    normalizeIllumination: true,
    splitOverlappingDroplets: true,
    filterArtifacts: true,
    mm2PerPixel: 0.0001,
    totalDroplets: 45,
    density: 52,
    coveragePercent: 12.4,
    span: 0.85,
    vmdUm: 240,
    dv01Um: 140,
    dv09Um: 344,
    estimatedVolumeLha: 15.2,
    verdict: 'BOM',
    verdictScore: 92,
    asabeCategory: 'Média',
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
    droplets: [],
    ...override,
  };
}

describe('generateAnalysisPdfReport', () => {
  it('gera relatório PDF sem erros para o motor híbrido (hybrid)', async () => {
    const analysis = createSampleAnalysis({ analysisMethod: 'hybrid' });
    await expect(generateAnalysisPdfReport(analysis)).resolves.not.toThrow();
  });

  it('gera relatório PDF com sucesso para o motor cromático (chromatic)', async () => {
    const analysis = createSampleAnalysis({ analysisMethod: 'chromatic' });
    await expect(generateAnalysisPdfReport(analysis)).resolves.not.toThrow();
  });

  it('gera relatório PDF com sucesso para o motor monocromático (gotas-legacy)', async () => {
    const analysis = createSampleAnalysis({
      analysisMethod: 'gotas-legacy',
      meanFilterPasses: 2,
      fillHoles: true,
      sensitivity: 5,
    });
    await expect(generateAnalysisPdfReport(analysis)).resolves.not.toThrow();
  });

  it('gera relatório PDF com alerta para cartões com alta cobertura (>= 75%)', async () => {
    const analysis = createSampleAnalysis({
      coveragePercent: 82.5,
      density: 180,
    });
    await expect(generateAnalysisPdfReport(analysis)).resolves.not.toThrow();
  });

  it('rejeita geração de relatório com métricas inválidas (NaN ou Infinity)', async () => {
    const invalidAnalysis = createSampleAnalysis({ density: NaN });
    await expect(generateAnalysisPdfReport(invalidAnalysis)).rejects.toThrowError(
      'Não é possível gerar PDF com métricas inválidas (NaN/Infinity).'
    );
  });

  it('gera relatório PDF com textos longos e múltiplos avisos sem erros', async () => {
    const analysis = createSampleAnalysis({
      title: 'Talhão Fazenda Santa Maria - Setor Pivô Central 04 - Pulverização de Fungicida Sistêmico com Adjuvante Siliconado',
      measurementQuality: {
        status: 'LIMITADA',
        effectiveDpi: 450,
        orientationCorrected: true,
        coverageReliable: true,
        countDensityReliable: false,
        sizeVolumeReliable: false,
        warnings: [
          'A resolução efetiva da imagem está no limite mínimo aceitável (450 DPI). Recomenda-se aproximar a câmera.',
          'Iluminação heterogênea detectada com presença de sombras parciais no canto inferior esquerdo.',
          'Identificada coalescência moderada de gotas com separação morfológica estimada.',
        ],
        algorithmVersion: '2.5.0',
        captureQuality: {
          version: 'capture-signals-v1',
          calibrationStatus: 'NAO_CALIBRADO',
          cardOccupancyPercent: 82.5,
          focusLaplacianVariance: 340.2,
          illuminationVariationPercent: 14.8,
          darkPixelPercent: 0.2,
          highlightPixelPercent: 1.1,
          sampleCount: 1800,
        },
      },
    });

    await expect(generateAnalysisPdfReport(analysis)).resolves.not.toThrow();
  });
});
