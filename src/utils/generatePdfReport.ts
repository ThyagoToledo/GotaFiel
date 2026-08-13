import jsPDF from 'jspdf';
import { AnalysisData } from '../types';

export function generateAnalysisPdfReport(analysis: AnalysisData): void {
  const metrics = [
    analysis.density,
    analysis.coveragePercent,
    analysis.span,
    analysis.vmdUm,
    analysis.dv01Um,
    analysis.dv09Um,
    analysis.estimatedVolumeLha,
    analysis.measurementQuality?.effectiveDpi ?? 0,
  ];

  for (const m of metrics) {
    if (!Number.isFinite(m)) {
      throw new Error('Não é possível gerar PDF com métricas inválidas (NaN/Infinity).');
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;
  const quality = analysis.measurementQuality ?? {
    status: 'INCONCLUSIVA' as const,
    effectiveDpi: 0,
    orientationCorrected: false,
    coverageReliable: false,
    countDensityReliable: false,
    sizeVolumeReliable: false,
    warnings: ['Análise anterior sem metadados suficientes para avaliar a confiabilidade.'],
    algorithmVersion: 'legacy',
  };

  // --- HEADER SECTION ---
  // Background header bar
  doc.setFillColor(0, 100, 57); // #006439 Primary Green
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Title text inside bar
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELATÓRIO DE MEDIÇÃO DE CARTÃO HIDROSSENSÍVEL', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gotas2 — processamento experimental e rastreável', margin + 6, y + 17);

  y += 30;

  // --- METADATA ROW ---
  doc.setFillColor(245, 247, 245);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(210, 220, 210);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);

  const dateFormatted = new Date(analysis.timestamp || Date.now()).toLocaleString('pt-BR');

  doc.setFont('helvetica', 'bold');
  doc.text('Amostra / Identificação:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.title || 'Amostra de Cartão Hidrossensível', margin + 42, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Data do Teste:', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, margin + 28, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Papel / Cor:', margin + 110, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.cardColor} (${analysis.cardSizeMm.width}x${analysis.cardSizeMm.height} mm)`, margin + 132, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Sensibilidade:', margin + 110, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.sensitivity > 0 ? '+' : ''}${analysis.sensitivity}`, margin + 132, y + 13);

  y += 24;

  // --- QUALIDADE TÉCNICA DA LEITURA ---
  const verdictBgColor: [number, number, number] = quality.status === 'ADEQUADA'
    ? [34, 139, 34]
    : quality.status === 'LIMITADA'
      ? [217, 119, 6]
      : [186, 26, 26];

  doc.setFillColor(...verdictBgColor);
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`QUALIDADE TÉCNICA: ${quality.status}`, margin + 6, y + 9);

  doc.setFontSize(10);
  doc.text(`Resolução efetiva: ${quality.effectiveDpi || 'não registrada'} dpi`, margin + 110, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const msg = `Algoritmo ${quality.algorithmVersion}. Este status avalia a leitura da imagem, não a eficácia agronômica.`;
  doc.text(msg, margin + 6, y + 16);

  y += 26;

  // --- SECTION: MEDIÇÕES ---
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. MEDIÇÕES PRINCIPAIS DO CARTÃO', margin, y);
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 7;

  // 3 Cards Layout
  const cardWidth = (contentWidth - 8) / 3;

  // Card 1: Densidade
  doc.setFillColor(250, 252, 250);
  doc.rect(margin, y, cardWidth, 26, 'F');
  doc.setDrawColor(220, 230, 220);
  doc.rect(margin, y, cardWidth, 26, 'S');

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DENSIDADE DE GOTAS', margin + 4, y + 6);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(16);
  doc.text(`${analysis.density}`, margin + 4, y + 17);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('gotas/cm²', margin + 28, y + 17);

  // Card 2: Cobertura
  const c2X = margin + cardWidth + 4;
  doc.setFillColor(250, 252, 250);
  doc.rect(c2X, y, cardWidth, 26, 'F');
  doc.setDrawColor(220, 230, 220);
  doc.rect(c2X, y, cardWidth, 26, 'S');

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COBERTURA DO PAPEL', c2X + 4, y + 6);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(16);
  doc.text(`${analysis.coveragePercent}%`, c2X + 4, y + 17);

  // Card 3: Homogeneidade (Span)
  const c3X = c2X + cardWidth + 4;
  doc.setFillColor(250, 252, 250);
  doc.rect(c3X, y, cardWidth, 26, 'F');
  doc.setDrawColor(220, 230, 220);
  doc.rect(c3X, y, cardWidth, 26, 'S');

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPERSÃO (SPAN)', c3X + 4, y + 6);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(16);
  doc.text(`${analysis.span}`, c3X + 4, y + 17);

  y += 33;

  // --- SECTION: ESPECTRO DE GOTAS ---
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ESPECTRO DE GOTAS E DIMENSIONAMENTO', margin, y);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 7;

  // Table structure
  const tableData = [
    ['Diâmetro volumétrico estimado (DV0,5)', `${analysis.vmdUm} µm`],
    ['Volume estimado pela relação de espalhamento', `${analysis.estimatedVolumeLha} L/ha`],
    ['DV0,1 (10% do volume acumulado)', `${analysis.dv01Um} µm`],
    ['DV0,9 (90% do volume acumulado)', `${analysis.dv09Um} µm`],
    ['Total de Gotas Mapeadas', `${analysis.totalDroplets} gotas`],
  ];

  tableData.forEach((row, idx) => {
    const rowY = y + idx * 8;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 248);
      doc.rect(margin, rowY, contentWidth, 8, 'F');
    }
    doc.setDrawColor(230, 235, 230);
    doc.rect(margin, rowY, contentWidth, 8, 'S');

    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(row[0], margin + 4, rowY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 45);
    doc.text(row[1], margin + 120, rowY + 5.5);
  });

  y += tableData.length * 8 + 12;

  // --- LIMITAÇÕES E AVISOS ---
  doc.setFillColor(240, 247, 242);
  doc.rect(margin, y, contentWidth, 32, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.rect(margin, y, contentWidth, 32, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('LIMITAÇÕES DESTA MEDIÇÃO:', margin + 5, y + 7);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const recommendationText = quality.warnings.map((warning) => `• ${warning}`).join('\n');

  const splitLines = doc.splitTextToSize(recommendationText, contentWidth - 10);
  doc.text(splitLines, margin + 5, y + 14);

  y += 40;

  // --- FOOTER SECTION ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 280, margin + contentWidth, 280);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Gotas2 — relatório de medição; não substitui avaliação agronômica profissional', margin, 284);
  doc.text('Página 1 de 1', margin + contentWidth - 20, 284);

  // Save the generated PDF
  const cleanTitle = (analysis.title || 'relatorio-amostra')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${cleanTitle}_spraycheck.pdf`);
}
