import { describe, it, expect } from 'vitest';
import { generateAnalysisCsvString, generateAllAnalysesCsvString } from '../generateCsvReport';
import { AnalysisData } from '../../types';

function makeAnalysis(overrides: Partial<AnalysisData> = {}): AnalysisData {
  return {
    id: 'ana-1',
    title: 'Talhão 1 — Amostra 1',
    date: 'Hoje',
    timestamp: 1755100000000,
    imageUrl: '',
    cardColor: 'Amarelo',
    cardSizeMm: { width: 76, height: 26 },
    dpi: 300,
    sensitivity: 0,
    rectWidthPx: 461,
    rectHeightPx: 158,
    totalDroplets: 182,
    density: 9.2,
    coveragePercent: 2,
    span: 1.19,
    vmdUm: 570,
    dv01Um: 229,
    dv09Um: 905,
    estimatedVolumeLha: 11.51,
    verdict: 'RUIM',
    verdictScore: 28,
    asabeCategory: 'Extremamente Grossa',
    droplets: [],
    ...overrides,
  };
}

describe('generateAnalysisCsvString', () => {
  it('gera cabeçalho + uma linha com separador ;', () => {
    const csv = generateAnalysisCsvString(makeAnalysis());
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].startsWith('ID;Data;Titulo')).toBe(true);
    expect(lines[1]).toContain('ana-1');
    expect(lines[1]).toContain('"Talhão 1 — Amostra 1"');
    expect(lines[1]).toContain('RUIM');
  });

  it('rejeita métricas inválidas', () => {
    expect(() => generateAnalysisCsvString(makeAnalysis({ density: NaN }))).toThrow();
  });
});

describe('generateAllAnalysesCsvString', () => {
  it('gera uma linha por análise', () => {
    const csv = generateAllAnalysesCsvString([
      makeAnalysis(),
      makeAnalysis({ id: 'ana-2', title: 'Talhão 2 — Amostra 1' }),
      makeAnalysis({ id: 'ana-3', title: 'Talhão 3 — Amostra 1' }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('ana-1');
    expect(lines[2]).toContain('ana-2');
    expect(lines[3]).toContain('ana-3');
  });

  it('pula análises corrompidas sem derrubar a exportação', () => {
    const csv = generateAllAnalysesCsvString([
      makeAnalysis(),
      makeAnalysis({ id: 'ana-bad', density: NaN }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(csv).not.toContain('ana-bad');
  });

  it('lista vazia lança erro claro', () => {
    expect(() => generateAllAnalysesCsvString([])).toThrow(/Nenhuma análise/);
  });
});
