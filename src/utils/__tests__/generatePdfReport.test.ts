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
  it('gera relatório PDF sem erros para o motor híbrido (hybrid)', () => {
    const analysis = createSampleAnalysis({ analysisMethod: 'hybrid' });
    expect(() => generateAnalysisPdfReport(analysis)).not.toThrow();
  });

  it('gera relatório PDF com sucesso para o motor cromático (chromatic)', () => {
    const analysis = createSampleAnalysis({ analysisMethod: 'chromatic' });
    expect(() => generateAnalysisPdfReport(analysis)).not.toThrow();
  });

  it('gera relatório PDF com sucesso para o motor monocromático (gotas-legacy)', () => {
    const analysis = createSampleAnalysis({
      analysisMethod: 'gotas-legacy',
      meanFilterPasses: 2,
      fillHoles: true,
      sensitivity: 5,
    });
    expect(() => generateAnalysisPdfReport(analysis)).not.toThrow();
  });

  it('gera relatório PDF com alerta para cartões com alta cobertura (>= 75%)', () => {
    const analysis = createSampleAnalysis({
      coveragePercent: 82.5,
      density: 180,
    });
    expect(() => generateAnalysisPdfReport(analysis)).not.toThrow();
  });

  it('rejeita geração de relatório com métricas inválidas (NaN ou Infinity)', () => {
    const invalidAnalysis = createSampleAnalysis({ density: NaN });
    expect(() => generateAnalysisPdfReport(invalidAnalysis)).toThrowError(
      'Não é possível gerar PDF com métricas inválidas (NaN/Infinity).'
    );
  });
});
