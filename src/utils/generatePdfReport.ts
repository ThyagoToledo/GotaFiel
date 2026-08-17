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
    ...(analysis.measurementQuality?.captureQuality
      ? [
          analysis.measurementQuality.captureQuality.cardOccupancyPercent,
          analysis.measurementQuality.captureQuality.focusLaplacianVariance,
          analysis.measurementQuality.captureQuality.illuminationVariationPercent,
          analysis.measurementQuality.captureQuality.darkPixelPercent,
          analysis.measurementQuality.captureQuality.highlightPixelPercent,
          analysis.measurementQuality.captureQuality.sampleCount,
        ]
      : []),
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
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const quality = analysis.measurementQuality ?? {
    status: 'INCONCLUSIVA' as const,
    effectiveDpi: 0,
    orientationCorrected: false,
    coverageReliable: false,
    countDensityReliable: false,
    sizeVolumeReliable: false,
    warnings: ['Análise sem metadados suficientes para avaliar a qualidade da imagem.'],
    algorithmVersion: '2.5.0',
  };

  const method = analysis.analysisMethod || 'hybrid';

  // --- HEADER SECTION ---
  doc.setFillColor(0, 100, 57); // #006439 Primary Green
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GOTAFIEL — RELATÓRIO DE MEDIÇÃO & CALIBRAÇÃO AGRÍCOLA', margin + 6, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Processamento de Imagem de Alta Precisão para Cartões Hidrossensíveis (Clean-Room)', margin + 6, y + 16);

  y += 26;

  // --- METADATA ROW ---
  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(200, 220, 205);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);

  const dateFormatted = new Date(analysis.timestamp || Date.now()).toLocaleString('pt-BR');

  doc.setFont('helvetica', 'bold');
  doc.text('Amostra / Identificação:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.title || 'Amostra de Cartão Hidrossensível', margin + 40, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Data do Teste:', margin + 4, y + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, margin + 26, y + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Cartão / Dimensões:', margin + 105, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.cardColor || 'Amarelo'} (${analysis.cardSizeMm.width} × ${analysis.cardSizeMm.height} mm)`, margin + 136, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Resolução / Escala:', margin + 105, y + 12.5);
  doc.setFont('helvetica', 'normal');
  const mm2Text = analysis.mm2PerPixel ? `${analysis.mm2PerPixel.toFixed(5)} mm²/px` : 'Calibrado';
  doc.text(`${quality.effectiveDpi || analysis.dpi || 300} DPI (${mm2Text})`, margin + 136, y + 12.5);

  y += 22;

  // --- ENGINE DETAILS SECTION (CUSTOMIZADA PARA CADA MOTOR) ---
  let engineTitle = 'Motor Híbrido Adaptativo (Padrão Recomendado)';
  let engineDesc = 'Fusão espectral azul-amarelo + contraste de luminância contínua com binarização ótima de Otsu.';
  let engineFeatures = 'Normalização de Iluminação: Ativa · Separação de Aglomerados: Ativa (Watershed 2-Pass) · Filtro de Fibras: Ativo (Circularidade ≥ 0.20)';

  if (method === 'chromatic') {
    engineTitle = 'Motor Cromático Espectral (B - max(R, G))';
    engineDesc = 'Isolamento espectral puro do canal azul no espaço RGB com limiar ótimo de Otsu.';
    engineFeatures = 'Normalização: Direta · Separação de Aglomerados: Desativada · Foco: Contraste de cor direto no papel amarelo';
  } else if (method === 'gotas-legacy') {
    const passes = analysis.meanFilterPasses ?? 1;
    const holes = analysis.fillHoles ? 'Ativo' : 'Desativado';
    engineTitle = 'Motor Monocromático em Escala de Cinza';
    engineDesc = 'Binarização por intensidade luminosa média (R+G+B)/3 com algoritmo de contraste de densidade óptica.';
    engineFeatures = `Suavização Espacial Caixa 3×3: ${passes} passagem(ns) · Preenchimento de Microfalhas: ${holes} · Ajuste Limiar: ${analysis.sensitivity > 0 ? '+' : ''}${analysis.sensitivity}`;
  }

  doc.setFillColor(240, 248, 242);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`MOTOR DE ANÁLISE: ${engineTitle.toUpperCase()}`, margin + 4, y + 6);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Método: ${engineDesc}`, margin + 4, y + 11.5);
  doc.text(`Parâmetros Técnicos: ${engineFeatures}`, margin + 4, y + 16.5);

  y += 24;

  // --- ALERTA DE ESCORRIMENTO (SE COBERTURA >= 75%) OU STATUS DE QUALIDADE ---
  if (analysis.coveragePercent >= 75) {
    doc.setFillColor(254, 242, 242); // Red tinted
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setDrawColor(220, 38, 38);
    doc.rect(margin, y, contentWidth, 16, 'S');

    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ALERTA CRÍTICO: RISCO DE ESCORRIMENTO FOLIAR & SATURAÇÃO (COBERTURA ≥ 75%)', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Cobertura acima do limite ideal. Houve coalescência severa de gotas formando poças contínuas. Recomenda-se reduzir o volume de calda ou trocar as pontas.', margin + 4, y + 11.5);
    y += 20;
  } else {
    const verdictBgColor: [number, number, number] = quality.status === 'ADEQUADA'
      ? [0, 120, 65]
      : quality.status === 'LIMITADA'
        ? [200, 110, 0]
        : [180, 20, 20];

    doc.setFillColor(...verdictBgColor);
    doc.rect(margin, y, contentWidth, 13, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`QUALIDADE TÉCNICA DA IMAGEM: ${quality.status}`, margin + 5, y + 6);

    doc.setFontSize(8);
    doc.text(`Resolução efetiva: ${quality.effectiveDpi || 300} DPI · Versão do Pipeline: ${quality.algorithmVersion || '2.5.0'}`, margin + 105, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Avalia a nitidez, iluminação e enquadramento do cartão para leitura confiável.', margin + 5, y + 10.5);
    y += 17;
  }

  // --- SECTION: 1. MEDIÇÕES PRINCIPAIS DO CARTÃO (3 CARDS) ---
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. MEDIÇÕES PRINCIPAIS DE DEPOSIÇÃO', margin, y);
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 6;

  const cardWidth = (contentWidth - 6) / 3;

  // Card 1: Densidade
  doc.setFillColor(250, 252, 250);
  doc.rect(margin, y, cardWidth, 24, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.rect(margin, y, cardWidth, 24, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DENSIDADE DE GOTAS', margin + 3.5, y + 5.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(14);
  doc.text(`${analysis.density}`, margin + 3.5, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text('gotas/cm²', margin + 24, y + 15);

  const densityLabel = analysis.density < 25 ? 'Insuficiente (<25)' : analysis.density <= 50 ? 'Intermediária (25-50)' : 'Adequada (≥50)';
  doc.setFontSize(6.5);
  doc.setTextColor(0, 90, 45);
  doc.text(densityLabel, margin + 3.5, y + 20.5);

  // Card 2: Cobertura
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c2X, y, cardWidth, 24, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.rect(c2X, y, cardWidth, 24, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('COBERTURA DA CALDA', c2X + 3.5, y + 5.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(14);
  doc.text(`${analysis.coveragePercent}%`, c2X + 3.5, y + 15);

  const covLabel = analysis.coveragePercent >= 75 ? 'Risco Escorrimento (≥75%)' : analysis.coveragePercent >= 15 ? 'Boa Cobertura (15-74%)' : 'Baixa Cobertura (<15%)';
  doc.setFontSize(6.5);
  doc.setTextColor(analysis.coveragePercent >= 75 ? 180 : 0, analysis.coveragePercent >= 75 ? 20 : 90, analysis.coveragePercent >= 75 ? 20 : 45);
  doc.text(covLabel, c2X + 3.5, y + 20.5);

  // Card 3: Homogeneidade (Span)
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c3X, y, cardWidth, 24, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.rect(c3X, y, cardWidth, 24, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPERSÃO (SPAN)', c3X + 3.5, y + 5.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(14);
  doc.text(`${analysis.span.toFixed(2)}`, c3X + 3.5, y + 15);

  const spanLabel = analysis.span < 1.0 ? 'Muito Uniforme (<1.0)' : analysis.span <= 1.4 ? 'Uniforme (1.0-1.4)' : 'Espectro Amplo (>1.4)';
  doc.setFontSize(6.5);
  doc.setTextColor(0, 90, 45);
  doc.text(spanLabel, c3X + 3.5, y + 20.5);

  y += 29;

  // --- SECTION: 2. ESPECTRO DE GOTAS & METROLOGIA ---
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. ESPECTRO VOLUMÉTRICO E DIMENSIONAMENTO', margin, y);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  y += 5.5;

  // Table structure
  const tableData = [
    ['Diâmetro Mediano Volumétrico (DV0,5 / DMV)', `${analysis.vmdUm} µm`, 'Metade do volume da calda está em gotas menores'],
    ['Classificação do Espectro (Norma ASABE S572.1)', `${analysis.asabeCategory}`, 'Padrão internacional de classificação de pontas'],
    ['DV0,1 (10% do volume acumulado)', `${analysis.dv01Um} µm`, 'Potencial de risco de deriva por gotas finas'],
    ['DV0,9 (90% do volume acumulado)', `${analysis.dv09Um} µm`, 'Indicador de gotas excessivamente grossas'],
    ['Total de Gotas Mapeadas', `${analysis.totalDroplets} impactos`, 'Contagem individual de manchas registradas'],
    ['Volume Estimado Aplicado', `${analysis.estimatedVolumeLha} L/ha`, 'Estimativa volumétrica por relação de espalhamento'],
    ['Modelo de Espalhamento (Spread Factor)', 'Hoffmann & Hewitt (2005)', 'Equação semi-empírica Syngenta para papel hidrossensível'],
  ];

  tableData.forEach((row, idx) => {
    const rowY = y + idx * 6.8;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 248);
      doc.rect(margin, rowY, contentWidth, 6.8, 'F');
    }
    doc.setDrawColor(225, 235, 228);
    doc.setLineWidth(0.2);
    doc.rect(margin, rowY, contentWidth, 6.8, 'S');

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(row[0], margin + 3, rowY + 4.6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 90, 45);
    doc.text(row[1], margin + 88, rowY + 4.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(row[2], margin + 130, rowY + 4.6);
  });

  y += tableData.length * 6.8 + 8;

  // --- SECTION: 3. OBSERVAÇÕES TÉCNICAS E RECOMENDAÇÕES AGRONÔMICAS ---
  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, 26, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 26, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. OBSERVAÇÕES TÉCNICAS & ORIENTAÇÕES DE CAMPO', margin + 4, y + 5.5);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const warnings = quality.warnings.length > 0
    ? quality.warnings
    : ['Nenhuma inconsistência óptica grave detectada. Medição considerada representativa do cartão analisado.'];

  let warnLineY = y + 10.5;
  warnings.slice(0, 3).forEach((w) => {
    doc.text(`• ${w}`, margin + 4, warnLineY);
    warnLineY += 4.5;
  });

  doc.text('• Atenção: A eficácia biológica depende da deposição no alvo, condições meteorológicas (Delta T) e dosagem correta do produto.', margin + 4, warnLineY);

  y += 31;

  // --- SINAIS DA CAPTURA (INFORMATIVOS) ---
  if (quality.captureQuality) {
    doc.setFillColor(252, 253, 252);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(210, 225, 215);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, 12, 'S');

    doc.setTextColor(0, 100, 57);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('SINAIS TÉCNICOS DA CAPTURA (METADADOS INFORMATIVOS)', margin + 3.5, y + 4.5);

    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const capture = quality.captureQuality;
    doc.text(
      `Ocupação no Quadro: ${capture.cardOccupancyPercent}% · Foco Laplaciano: ${capture.focusLaplacianVariance} · Variação de Luz: ${capture.illuminationVariationPercent}% · Pixels Escuros: ${capture.darkPixelPercent}%`,
      margin + 3.5,
      y + 8.5
    );
    y += 16;
  }

  // --- FOOTER SECTION ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 282, margin + contentWidth, 282);

  doc.setTextColor(110, 110, 110);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('GotaFiel — Plataforma de Análise de Pulverização e Calibração Agrícola · Desenvolvido sob metodologia Clean-Room', margin, 286);
  doc.text('Página 1 de 1', margin + contentWidth - 18, 286);

  // Save the generated PDF
  const cleanTitle = (analysis.title || 'relatorio-amostra')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${cleanTitle}_gotafiel.pdf`);
}
