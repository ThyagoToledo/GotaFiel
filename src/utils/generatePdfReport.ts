import jsPDF from 'jspdf';
import { AnalysisData } from '../types';

export function generateAnalysisPdfReport(analysis: AnalysisData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // --- HEADER SECTION ---
  // Background header bar
  doc.setFillColor(0, 100, 57); // #006439 Primary Green
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Title text inside bar
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELATÓRIO TÉCNICO DE ANÁLISE DE PULVERIZAÇÃO', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('SprayCheck AI — Diagnóstico e Monitoramento Agrícola', margin + 6, y + 17);

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

  // --- VERDICT BANNER ---
  let verdictBgColor: [number, number, number] = [34, 139, 34]; // BOM (Green)
  if (analysis.verdict === 'EXCESSO') {
    verdictBgColor = [186, 26, 26]; // Red
  } else if (analysis.verdict === 'REGULAR') {
    verdictBgColor = [217, 119, 6]; // Amber
  } else if (analysis.verdict === 'RUIM') {
    verdictBgColor = [186, 26, 26]; // Red
  }

  doc.setFillColor(...verdictBgColor);
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`VEREDITO: ${analysis.verdict}`, margin + 6, y + 9);

  doc.setFontSize(10);
  doc.text(`Pontuação de Qualidade: ${analysis.verdictScore} / 100`, margin + 110, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const msg = analysis.verdictMessage || `Cobertura obtida de ${analysis.coveragePercent}%. Densidade de ${analysis.density} gotas/cm².`;
  doc.text(msg, margin + 6, y + 16);

  y += 26;

  // --- SECTION: QUALIDADE DA APLICAÇÃO ---
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. MÉTRICAS PRINCIPAIS DE QUALIDADE', margin, y);
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
  doc.text('HOMOGENEIDADE (SPAN)', c3X + 4, y + 6);

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
    ['Diâmetro Médio Volumétrico (DMV / DV0,5)', `${analysis.vmdUm} µm`],
    ['Classificação ASABE (Tamanho do Pingo)', analysis.asabeCategory],
    ['Volume Estimado da Aplicação', `${analysis.estimatedVolumeLha} L/ha`],
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

  // --- DIAGNOSTIC & RECOMMENDATION BOX ---
  doc.setFillColor(240, 247, 242);
  doc.rect(margin, y, contentWidth, 32, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.rect(margin, y, contentWidth, 32, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('DIAGNOSTICO TÉCNICO E RECOMENDAÇÕES:', margin + 5, y + 7);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  let recommendationText = '';
  if (analysis.verdict === 'EXCESSO') {
    recommendationText =
      '• Risco elevado de escorrimento foliar e desperdício de produto químico.\n' +
      '• Recomendado: Reduzir a taxa de aplicação (L/ha), trocar as pontas por vazão menor ou aumentar a velocidade de deslocamento.\n' +
      '• Ajustar a pressão de trabalho do pulverizador para obter gotas no espectro desejado sem sobreposição.';
  } else if (analysis.verdict === 'BOM') {
    recommendationText =
      '• A aplicação apresenta excelente uniformidade de cobertura e densidade adequada de gotas.\n' +
      '• O espectro de gotas está equilibrado para o alvo biológico com baixo risco de deriva e escorrimento.\n' +
      '• Recomendado: Manter a regulagem atual de velocidade, pressão e modelo de ponta de pulverização.';
  } else {
    recommendationText =
      '• A aplicação necessita de pequenos ajustes para otimizar o alvo biológico.\n' +
      '• Verifique a calibração individual dos bicos, pressão na barra e velocidade da máquina.\n' +
      '• Caso o vento esteja acima de 10 km/h, utilize pontas de indução de ar para mitigar perdas por deriva.';
  }

  const splitLines = doc.splitTextToSize(recommendationText, contentWidth - 10);
  doc.text(splitLines, margin + 5, y + 14);

  y += 40;

  // --- FOOTER SECTION ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 280, margin + contentWidth, 280);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('SprayCheck AI — Sistema de Calibração e Inspeção de Pulverização Agrícola', margin, 284);
  doc.text('Página 1 de 1', margin + contentWidth - 20, 284);

  // Save the generated PDF
  const cleanTitle = (analysis.title || 'relatorio-amostra')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${cleanTitle}_spraycheck.pdf`);
}
