import jsPDF from 'jspdf';
import { AnalysisData } from '../types';

/**
 * Gera relatório técnico profissional em PDF para a análise de pulverização do cartão hidrossensível.
 *
 * Inclui controle milimétrico de quebra de linhas (splitTextToSize), caixas com altura dinâmica
 * e proteção total contra transbordamento de texto (overflow).
 */
export function generateAnalysisPdfReport(analysis: AnalysisData): void {
  // Validação estrita contra valores inválidos (NaN/Infinity)
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
  const contentWidth = pageWidth - margin * 2; // 186 mm
  let y = 10;

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

  // =========================================================================
  // 1. CABEÇALHO DO DOCUMENTO
  // =========================================================================
  doc.setFillColor(0, 100, 57); // Verde Primário Institucional (#006439)
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('GOTAFIEL — RELATÓRIO DE MEDIÇÃO & CALIBRAÇÃO AGRÍCOLA', margin + 5, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Processamento Digital de Imagens para Papel Hidrossensível · Metodologia Clean-Room', margin + 5, y + 14.5);

  y += 23;

  // =========================================================================
  // 2. QUADRO DE METADADOS DA AMOSTRA (2 COLUNAS COM QUEBRA AUTOMÁTICA)
  // =========================================================================
  const metaColWidth = (contentWidth - 6) / 2; // ~90 mm cada
  const dateFormatted = new Date(analysis.timestamp || Date.now()).toLocaleString('pt-BR');
  const cardDims = `${analysis.cardColor || 'Amarelo'} (${analysis.cardSizeMm.width} × ${analysis.cardSizeMm.height} mm)`;
  const mm2Text = analysis.mm2PerPixel ? `${analysis.mm2PerPixel.toFixed(5)} mm²/px` : 'Calibrado';
  const resolutionText = `${quality.effectiveDpi || analysis.dpi || 300} DPI (${mm2Text})`;

  doc.setFontSize(7.5);
  // Quebra de texto no título se for muito longo
  const rawTitle = analysis.title || 'Amostra de Cartão Hidrossensível';
  const titleLines: string[] = doc.splitTextToSize(rawTitle, metaColWidth - 36);

  const metaBoxHeight = Math.max(18, 11 + titleLines.length * 4);

  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, metaBoxHeight, 'F');
  doc.setDrawColor(200, 220, 205);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, metaBoxHeight, 'S');

  doc.setTextColor(60, 60, 60);

  // Coluna 1: Amostra e Data
  doc.setFont('helvetica', 'bold');
  doc.text('Amostra:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  titleLines.forEach((tLine: string, tIdx: number) => {
    doc.text(tLine, margin + 22, y + 5.5 + tIdx * 4);
  });

  const dateY = y + 5.5 + titleLines.length * 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Data do Teste:', margin + 4, dateY);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, margin + 26, dateY);

  // Coluna 2: Cartão e Resolução
  const col2X = margin + metaColWidth + 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Cartão / Dimensões:', col2X + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(cardDims, col2X + 35, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Resolução / Escala:', col2X + 4, dateY);
  doc.setFont('helvetica', 'normal');
  doc.text(resolutionText, col2X + 35, dateY);

  y += metaBoxHeight + 3;

  // =========================================================================
  // 3. MOTOR DE PROCESSAMENTO & PARÂMETROS TÉCNICOS
  // =========================================================================
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
    engineFeatures = `Suavização Caixa 3×3: ${passes} passagem(ns) · Preenchimento de Microfalhas: ${holes} · Ajuste Limiar: ${analysis.sensitivity > 0 ? '+' : ''}${analysis.sensitivity}`;
  }

  doc.setFontSize(7);
  const engineDescLines: string[] = doc.splitTextToSize(`Método: ${engineDesc}`, contentWidth - 8);
  const engineFeatLines: string[] = doc.splitTextToSize(`Parâmetros Técnicos: ${engineFeatures}`, contentWidth - 8);
  const engineBoxHeight = 8 + engineDescLines.length * 3.5 + engineFeatLines.length * 3.5;

  doc.setFillColor(240, 248, 242);
  doc.rect(margin, y, contentWidth, engineBoxHeight, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, engineBoxHeight, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`MOTOR DE ANÁLISE: ${engineTitle.toUpperCase()}`, margin + 4, y + 5);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let curEngineY = y + 9;
  engineDescLines.forEach((line: string) => {
    doc.text(line, margin + 4, curEngineY);
    curEngineY += 3.5;
  });
  engineFeatLines.forEach((line: string) => {
    doc.text(line, margin + 4, curEngineY);
    curEngineY += 3.5;
  });

  y += engineBoxHeight + 3;

  // =========================================================================
  // 4. ALERTA DE ESCORRIMENTO OU STATUS DE QUALIDADE TÉCNICA
  // =========================================================================
  if (analysis.coveragePercent >= 75) {
    const alertMsg = 'Cobertura acima do limite ideal (≥ 75%). Houve coalescência severa de gotas formando poças contínuas. Recomenda-se reduzir o volume de calda ou utilizar pontas de menor vazão para evitar escorrimento foliar.';
    doc.setFontSize(7);
    const alertLines: string[] = doc.splitTextToSize(alertMsg, contentWidth - 8);
    const alertBoxHeight = 7 + alertLines.length * 3.6;

    doc.setFillColor(254, 242, 242);
    doc.rect(margin, y, contentWidth, alertBoxHeight, 'F');
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, alertBoxHeight, 'S');

    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ALERTA CRÍTICO: RISCO DE ESCORRIMENTO FOLIAR & SATURAÇÃO (COBERTURA ≥ 75%)', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let aY = y + 8.8;
    alertLines.forEach((line: string) => {
      doc.text(line, margin + 4, aY);
      aY += 3.6;
    });

    y += alertBoxHeight + 3;
  } else {
    const verdictBgColor: [number, number, number] = quality.status === 'ADEQUADA'
      ? [0, 120, 65]
      : quality.status === 'LIMITADA'
        ? [200, 110, 0]
        : [180, 20, 20];

    doc.setFillColor(...verdictBgColor);
    doc.rect(margin, y, contentWidth, 11, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`QUALIDADE TÉCNICA DA IMAGEM: ${quality.status}`, margin + 4, y + 5);

    doc.setFontSize(7.5);
    doc.text(`DPI Efetivo: ${quality.effectiveDpi || 300} · Versão: ${quality.algorithmVersion || '2.5.0'}`, margin + 110, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Avaliação automatizada de nitidez, iluminação e enquadramento do cartão hidrossensível.', margin + 4, y + 8.8);

    y += 14;
  }

  // =========================================================================
  // 5. MEDIÇÕES PRINCIPAIS DE DEPOSIÇÃO (3 CARDS LADO A LADO)
  // =========================================================================
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. MEDIÇÕES PRINCIPAIS DE DEPOSIÇÃO', margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);

  y += 4.5;

  const cardWidth = (contentWidth - 6) / 3;

  // Card 1: Densidade
  doc.setFillColor(250, 252, 250);
  doc.rect(margin, y, cardWidth, 20, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, cardWidth, 20, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DENSIDADE DE GOTAS', margin + 3.5, y + 4.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(13);
  doc.text(`${analysis.density}`, margin + 3.5, y + 12.5);
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text('gotas/cm²', margin + 24, y + 12.5);

  const densityLabel = analysis.density < 25 ? 'Insuficiente (<25)' : analysis.density <= 50 ? 'Intermediária (25-50)' : 'Adequada (≥50)';
  doc.setFontSize(6);
  doc.setTextColor(0, 90, 45);
  doc.text(densityLabel, margin + 3.5, y + 17.5);

  // Card 2: Cobertura
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c2X, y, cardWidth, 20, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(c2X, y, cardWidth, 20, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('COBERTURA DA CALDA', c2X + 3.5, y + 4.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(13);
  doc.text(`${analysis.coveragePercent}%`, c2X + 3.5, y + 12.5);

  const covLabel = analysis.coveragePercent >= 75 ? 'Risco Escorrimento (≥75%)' : analysis.coveragePercent >= 15 ? 'Boa Cobertura (15-74%)' : 'Baixa Cobertura (<15%)';
  doc.setFontSize(6);
  doc.setTextColor(analysis.coveragePercent >= 75 ? 180 : 0, analysis.coveragePercent >= 75 ? 20 : 90, analysis.coveragePercent >= 75 ? 20 : 45);
  doc.text(covLabel, c2X + 3.5, y + 17.5);

  // Card 3: Homogeneidade (Span)
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c3X, y, cardWidth, 20, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(c3X, y, cardWidth, 20, 'S');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPERSÃO (SPAN)', c3X + 3.5, y + 4.5);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(13);
  doc.text(`${analysis.span.toFixed(2)}`, c3X + 3.5, y + 12.5);

  const spanLabel = analysis.span < 1.0 ? 'Muito Uniforme (<1.0)' : analysis.span <= 1.4 ? 'Uniforme (1.0-1.4)' : 'Espectro Amplo (>1.4)';
  doc.setFontSize(6);
  doc.setTextColor(0, 90, 45);
  doc.text(spanLabel, c3X + 3.5, y + 17.5);

  y += 24;

  // =========================================================================
  // 6. ESPECTRO VOLUMÉTRICO E DIMENSIONAMENTO (TABELA RIGOROSA)
  // =========================================================================
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. ESPECTRO VOLUMÉTRICO E DIMENSIONAMENTO', margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);

  y += 4;

  const tableRows = [
    { label: 'Diâmetro Mediano Volumétrico (DV0,5 / DMV)', val: `${analysis.vmdUm} µm`, desc: '50% do volume aplicado está contido em gotas menores' },
    { label: 'Classificação do Espectro (Norma ASABE S572.1)', val: `${analysis.asabeCategory}`, desc: 'Padrão internacional para especificação de pontas' },
    { label: 'DV0,1 (10% do volume acumulado)', val: `${analysis.dv01Um} µm`, desc: 'Potencial de risco de deriva por gotas finas' },
    { label: 'DV0,9 (90% do volume acumulado)', val: `${analysis.dv09Um} µm`, desc: 'Indicador de presença de gotas excessivamente grossas' },
    { label: 'Total de Gotas Mapeadas', val: `${analysis.totalDroplets} impactos`, desc: 'Contagem individual de manchas registradas no cartão' },
    { label: 'Volume Estimado Aplicado', val: `${analysis.estimatedVolumeLha} L/ha`, desc: 'Estimativa volumétrica por relação de espalhamento' },
    { label: 'Modelo de Espalhamento (Spread Factor)', val: 'Hoffmann & Hewitt (2005)', desc: 'Equação semi-empírica Syngenta para papel hidrossensível' },
  ];

  tableRows.forEach((row, idx) => {
    const rowY = y + idx * 5.8;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 248);
      doc.rect(margin, rowY, contentWidth, 5.8, 'F');
    }
    doc.setDrawColor(225, 235, 228);
    doc.setLineWidth(0.15);
    doc.rect(margin, rowY, contentWidth, 5.8, 'S');

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(row.label, margin + 3, rowY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 90, 45);
    doc.text(row.val, margin + 82, rowY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(110, 110, 110);
    doc.text(row.desc, margin + 122, rowY + 4);
  });

  y += tableRows.length * 5.8 + 5;

  // =========================================================================
  // 7. OBSERVAÇÕES TÉCNICAS E ORIENTAÇÕES DE CAMPO (QUEBRA DE LINHA DINÂMICA)
  // =========================================================================
  const warnings = quality.warnings.length > 0
    ? quality.warnings
    : ['Nenhuma inconsistência óptica detectada. Leitura considerada representativa do cartão analisado.'];

  // Agrupa os avisos e a recomendação padrão com quebra automática de linha
  const allBulletLines: string[] = [];
  warnings.slice(0, 3).forEach((w) => {
    const splitW: string[] = doc.splitTextToSize(`• ${w}`, contentWidth - 8);
    allBulletLines.push(...splitW);
  });

  const stdTip = '• Atenção: A eficácia biológica depende do alvo, clima (Delta T) e dosagem correta do produto.';
  const splitTip: string[] = doc.splitTextToSize(stdTip, contentWidth - 8);
  allBulletLines.push(...splitTip);

  const obsBoxHeight = 8 + allBulletLines.length * 3.6;

  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, obsBoxHeight, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, obsBoxHeight, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('3. OBSERVAÇÕES TÉCNICAS & ORIENTAÇÕES DE CAMPO', margin + 4, y + 5);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  let curBulletY = y + 9;
  allBulletLines.forEach((line: string) => {
    doc.text(line, margin + 4, curBulletY);
    curBulletY += 3.6;
  });

  y += obsBoxHeight + 3;

  // =========================================================================
  // 8. SINAIS DA CAPTURA (SE HOUVER)
  // =========================================================================
  if (quality.captureQuality) {
    const capture = quality.captureQuality;
    const captureLine1 = `Ocupação do Cartão: ${capture.cardOccupancyPercent}% · Foco Laplaciano: ${capture.focusLaplacianVariance}`;
    const captureLine2 = `Variação de Luz: ${capture.illuminationVariationPercent}% · Pixels Escuros: ${capture.darkPixelPercent}% · Amostras: ${capture.sampleCount}`;

    doc.setFillColor(252, 253, 252);
    doc.rect(margin, y, contentWidth, 11, 'F');
    doc.setDrawColor(210, 225, 215);
    doc.setLineWidth(0.15);
    doc.rect(margin, y, contentWidth, 11, 'S');

    doc.setTextColor(0, 100, 57);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('SINAIS TÉCNICOS DA CAPTURA (METADADOS INFORMATIVOS)', margin + 3.5, y + 4);

    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`${captureLine1} · ${captureLine2}`, margin + 3.5, y + 8);
  }

  // =========================================================================
  // 9. RODAPÉ INSTITUCIONAL
  // =========================================================================
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, 284, margin + contentWidth, 284);

  doc.setTextColor(110, 110, 110);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('GotaFiel — Plataforma de Análise de Pulverização e Calibração Agrícola · Metodologia Clean-Room', margin, 288);
  doc.text('Página 1 de 1', margin + contentWidth - 16, 288);

  // Salva o arquivo PDF
  const cleanTitle = (analysis.title || 'relatorio-amostra')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${cleanTitle}_gotafiel.pdf`);
}
