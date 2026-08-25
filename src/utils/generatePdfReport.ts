import jsPDF from 'jspdf';
import { AnalysisData, DropletItem } from '../types';

/**
 * Gera imagem de overlay com os marcadores de gotas sobre o cartão usando um canvas em memória.
 */
export async function getCardImagesForPdf(analysis: AnalysisData): Promise<{
  originalDataUrl: string | null;
  overlayDataUrl: string | null;
}> {
  const baseSrc = analysis.rectifiedImageUrl || analysis.imageUrl;
  if (!baseSrc || typeof document === 'undefined') {
    return { originalDataUrl: baseSrc || null, overlayDataUrl: null };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 400;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ originalDataUrl: baseSrc, overlayDataUrl: null });
          return;
        }

        // 1. Imagem Original / Retificada
        ctx.drawImage(img, 0, 0, width, height);
        const originalDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // 2. Imagem com Sobreposição das Gotas Detectadas
        const droplets = analysis.droplets || [];
        droplets.forEach((d) => {
          if (d.included === false) return;
          const cx = (d.x / 100) * width;
          const cy = (d.y / 100) * height;
          const r = Math.max(1.8, (d.sizePx || 3) / 2);

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 210, 255, 0.45)';
          ctx.fill();
          ctx.lineWidth = Math.max(1, width / 600);
          ctx.strokeStyle = '#00e5ff';
          ctx.stroke();
        });

        const overlayDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ originalDataUrl, overlayDataUrl });
      } catch {
        resolve({ originalDataUrl: baseSrc, overlayDataUrl: null });
      }
    };
    img.onerror = () => {
      resolve({ originalDataUrl: baseSrc, overlayDataUrl: null });
    };
    img.src = baseSrc;
  });
}

/**
 * Gera relatório técnico profissional em PDF para a análise de pulverização do cartão hidrossensível.
 *
 * Inclui:
 * - Imagens lado a lado: Cartão Original vs. Cartão com Gotas Detectadas
 * - Controle milimétrico de quebra de linhas (splitTextToSize)
 * - Proteção total contra transbordamento de texto (zero overflow nas células)
 * - Créditos para os consultores agrônomos (Carlos Alberto e Marco Antônio Moreira de Freitas)
 */
export async function generateAnalysisPdfReport(analysis: AnalysisData): Promise<void> {
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
  let y = 8;

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
  doc.rect(margin, y, contentWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GOTAFIEL — LAUDO TÉCNICO DE PULVERIZAÇÃO & METROLOGIA AGRÍCOLA', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Tecnologia de Aplicação · Análise Computacional de Cartão Hidrossensível · Padrão ASABE S572.1', margin + 4, y + 13.5);

  y += 21;

  // =========================================================================
  // 2. QUADRO DE METADADOS DA AMOSTRA (2 COLUNAS FORMATADAS)
  // =========================================================================
  const metaColWidth = (contentWidth - 4) / 2; // 91 mm cada
  const dateFormatted = new Date(analysis.timestamp || Date.now()).toLocaleString('pt-BR');
  const cardDims = `${analysis.cardColor || 'Amarelo'} (${analysis.cardSizeMm.width} × ${analysis.cardSizeMm.height} mm)`;
  const mm2Text = analysis.mm2PerPixel ? `${analysis.mm2PerPixel.toFixed(5)} mm²/px` : 'Calibrado';
  const resolutionText = `${quality.effectiveDpi || analysis.dpi || 300} DPI (${mm2Text})`;

  doc.setFontSize(7.5);
  const rawTitle = analysis.title || 'Amostra de Cartão Hidrossensível';
  const titleLines: string[] = doc.splitTextToSize(rawTitle, metaColWidth - 28);
  const metaBoxHeight = Math.max(16, 8 + titleLines.length * 4);

  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, metaBoxHeight, 'F');
  doc.setDrawColor(200, 220, 205);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, metaBoxHeight, 'S');

  doc.setTextColor(60, 60, 60);

  // Coluna 1: Amostra e Data
  doc.setFont('helvetica', 'bold');
  doc.text('Amostra:', margin + 3.5, y + 4.8);
  doc.setFont('helvetica', 'normal');
  titleLines.forEach((tLine: string, tIdx: number) => {
    doc.text(tLine, margin + 20, y + 4.8 + tIdx * 4);
  });

  const dateY = y + 4.8 + titleLines.length * 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Data do Teste:', margin + 3.5, dateY);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, margin + 24, dateY);

  // Coluna 2: Cartão e Resolução
  const col2X = margin + metaColWidth + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Cartão / Dimensões:', col2X + 3.5, y + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.text(cardDims, col2X + 34, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.text('Escala / Resolução:', col2X + 3.5, dateY);
  doc.setFont('helvetica', 'normal');
  doc.text(resolutionText, col2X + 34, dateY);

  y += metaBoxHeight + 3.5;

  // =========================================================================
  // 3. IMAGENS DO CARTÃO LADO A LADO (ORIGINAL VS. GOTAS DETECTADAS)
  // =========================================================================
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1. IMAGENS DA ANÁLISE (CARTÃO ORIGINAL & DETECÇÃO DE GOTAS)', margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 1.2, margin + contentWidth, y + 1.2);

  y += 3.5;

  const cardImgColWidth = (contentWidth - 4) / 2; // 91 mm
  const cardAspect = analysis.cardSizeMm.width / analysis.cardSizeMm.height || 2.92;
  const imgDisplayWidth = 85;
  const imgDisplayHeight = Math.min(30, Math.max(18, imgDisplayWidth / cardAspect));
  const cardBoxHeight = imgDisplayHeight + 11;

  // Carrega as imagens para inserção
  let imgOriginal: string | null = null;
  let imgOverlay: string | null = null;

  try {
    const loadedImages = await getCardImagesForPdf(analysis);
    imgOriginal = loadedImages.originalDataUrl;
    imgOverlay = loadedImages.overlayDataUrl;
  } catch {
    imgOriginal = analysis.rectifiedImageUrl || analysis.imageUrl || null;
  }

  // Box 1: Cartão Original / Retificado
  doc.setFillColor(252, 253, 252);
  doc.rect(margin, y, cardImgColWidth, cardBoxHeight, 'F');
  doc.setDrawColor(200, 220, 205);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, cardImgColWidth, cardBoxHeight, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 100, 57);
  doc.text('Cartão Hidrossensível (Original)', margin + 3, y + 4);

  if (imgOriginal && typeof doc.addImage === 'function') {
    try {
      const format = imgOriginal.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(imgOriginal, format, margin + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight);
    } catch {
      doc.setFillColor(235, 235, 235);
      doc.rect(margin + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Imagem do cartão registrada', margin + 25, y + 5.5 + imgDisplayHeight / 2);
    }
  } else {
    doc.setFillColor(235, 235, 235);
    doc.rect(margin + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Imagem do cartão registrada', margin + 25, y + 5.5 + imgDisplayHeight / 2);
  }

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Área útil recortada: ${analysis.cardSizeMm.width} × ${analysis.cardSizeMm.height} mm`, margin + 3, y + cardBoxHeight - 1.8);

  // Box 2: Cartão com Gotas Mapeadas
  const col2ImgX = margin + cardImgColWidth + 4;
  doc.setFillColor(252, 253, 252);
  doc.rect(col2ImgX, y, cardImgColWidth, cardBoxHeight, 'F');
  doc.setDrawColor(200, 220, 205);
  doc.setLineWidth(0.2);
  doc.rect(col2ImgX, y, cardImgColWidth, cardBoxHeight, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 100, 57);
  doc.text(`Gotas Detectadas (${analysis.totalDroplets} impactos)`, col2ImgX + 3, y + 4);

  const displayOverlay = imgOverlay || imgOriginal;
  if (displayOverlay && typeof doc.addImage === 'function') {
    try {
      const format = displayOverlay.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(displayOverlay, format, col2ImgX + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight);
    } catch {
      doc.setFillColor(235, 235, 235);
      doc.rect(col2ImgX + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Mapeamento de gotas registrado', col2ImgX + 25, y + 5.5 + imgDisplayHeight / 2);
    }
  } else {
    doc.setFillColor(235, 235, 235);
    doc.rect(col2ImgX + 3, y + 5.5, imgDisplayWidth, imgDisplayHeight, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Mapeamento de gotas registrado', col2ImgX + 25, y + 5.5 + imgDisplayHeight / 2);
  }

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${analysis.totalDroplets} gotas · ${analysis.density} gotas/cm² · ${analysis.coveragePercent}% cobertura`, col2ImgX + 3, y + cardBoxHeight - 1.8);

  y += cardBoxHeight + 3.5;

  // =========================================================================
  // 4. MEDIÇÕES PRINCIPAIS DE DEPOSIÇÃO (3 CARDS LADO A LADO)
  // =========================================================================
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. MEDIÇÕES PRINCIPAIS DE DEPOSIÇÃO', margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 1.2, margin + contentWidth, y + 1.2);

  y += 3.5;

  const cardMetricWidth = (contentWidth - 6) / 3;

  // Card 1: Densidade
  doc.setFillColor(250, 252, 250);
  doc.rect(margin, y, cardMetricWidth, 18, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, cardMetricWidth, 18, 'S');

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DENSIDADE DE GOTAS', margin + 3.5, y + 4);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(11);
  doc.text(`${analysis.density}`, margin + 3.5, y + 11);
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('gotas/cm²', margin + 3.5 + doc.getTextWidth(`${analysis.density}`) + 2, y + 11);

  const densityLabel = analysis.density < 25 ? 'Insuficiente (<25)' : analysis.density <= 50 ? 'Intermediária (25-50)' : 'Adequada (≥50)';
  doc.setFontSize(5.8);
  doc.setTextColor(0, 90, 45);
  doc.text(densityLabel, margin + 3.5, y + 15.5);

  // Card 2: Cobertura
  const c2X = margin + cardMetricWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c2X, y, cardMetricWidth, 18, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(c2X, y, cardMetricWidth, 18, 'S');

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('COBERTURA DA CALDA', c2X + 3.5, y + 4);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(11);
  doc.text(`${analysis.coveragePercent}%`, c2X + 3.5, y + 11);

  const covLabel = analysis.coveragePercent >= 75 ? 'Risco Escorrimento (≥75%)' : analysis.coveragePercent >= 15 ? 'Boa Cobertura (15-74%)' : 'Baixa Cobertura (<15%)';
  doc.setFontSize(5.8);
  doc.setTextColor(analysis.coveragePercent >= 75 ? 180 : 0, analysis.coveragePercent >= 75 ? 20 : 90, analysis.coveragePercent >= 75 ? 20 : 45);
  doc.text(covLabel, c2X + 3.5, y + 15.5);

  // Card 3: Homogeneidade (Span)
  const c3X = c2X + cardMetricWidth + 3;
  doc.setFillColor(250, 252, 250);
  doc.rect(c3X, y, cardMetricWidth, 18, 'F');
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.2);
  doc.rect(c3X, y, cardMetricWidth, 18, 'S');

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPERSÃO (SPAN)', c3X + 3.5, y + 4);

  doc.setTextColor(0, 100, 57);
  doc.setFontSize(11);
  doc.text(`${analysis.span.toFixed(2)}`, c3X + 3.5, y + 11);

  const spanLabel = analysis.span < 1.0 ? 'Muito Uniforme (<1.0)' : analysis.span <= 1.4 ? 'Uniforme (1.0-1.4)' : 'Espectro Amplo (>1.4)';
  doc.setFontSize(5.8);
  doc.setTextColor(0, 90, 45);
  doc.text(spanLabel, c3X + 3.5, y + 15.5);

  y += 21.5;

  // =========================================================================
  // 5. ESPECTRO VOLUMÉTRICO E DIMENSIONAMENTO (TABELA RIGOROSA SEM OVERFLOW)
  // =========================================================================
  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. ESPECTRO VOLUMÉTRICO E DIMENSIONAMENTO (NORMA ASABE S572.1)', margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 100, 57);
  doc.line(margin, y + 1.2, margin + contentWidth, y + 1.2);

  y += 3.5;

  const tableRows = [
    { label: 'Diâmetro Mediano Volumétrico (DMV / DV0,5)', val: `${analysis.vmdUm} µm`, desc: '50% do volume aplicado contido em gotas menores' },
    { label: 'Classificação ASABE (Norma S572.1)', val: `${analysis.asabeCategory}`, desc: 'Padrão internacional de classificação de pontas' },
    { label: 'DV0,1 (10% do volume acumulado)', val: `${analysis.dv01Um} µm`, desc: 'Potencial de risco de deriva por gotas finas' },
    { label: 'DV0,9 (90% do volume acumulado)', val: `${analysis.dv09Um} µm`, desc: 'Indicador de presença de gotas excessivamente grossas' },
    { label: 'Total de Gotas Mapeadas', val: `${analysis.totalDroplets} impactos`, desc: 'Contagem individual de manchas registradas no cartão' },
    { label: 'Volume Estimado Aplicado', val: `${analysis.estimatedVolumeLha} L/ha`, desc: 'Estimativa volumétrica por relação de espalhamento' },
    { label: 'Modelo de Espalhamento (Spread Factor)', val: 'Hoffmann & Hewitt', desc: 'Equação semi-empírica Syngenta para papel hidrossensível' },
  ];

  const col1W = 68;
  const col2W = 38;
  const col3W = contentWidth - col1W - col2W; // 80 mm

  tableRows.forEach((row, idx) => {
    const rowY = y + idx * 5.2;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 248);
      doc.rect(margin, rowY, contentWidth, 5.2, 'F');
    }
    doc.setDrawColor(225, 235, 228);
    doc.setLineWidth(0.15);
    doc.rect(margin, rowY, contentWidth, 5.2, 'S');

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(row.label, margin + 2.5, rowY + 3.6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 90, 45);
    const valText = doc.splitTextToSize(row.val, col2W - 2)[0] || row.val;
    doc.text(valText, margin + col1W + 2, rowY + 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(110, 110, 110);
    const descText = doc.splitTextToSize(row.desc, col3W - 3)[0] || row.desc;
    doc.text(descText, margin + col1W + col2W + 2, rowY + 3.6);
  });

  y += tableRows.length * 5.2 + 4;

  // =========================================================================
  // 6. MOTOR DE PROCESSAMENTO & PARÂMETROS TÉCNICOS
  // =========================================================================
  let engineTitle = 'Motor Híbrido Adaptativo (Padrão Recomendado)';
  let engineDesc = 'Fusão espectral azul-amarelo + contraste de luminância contínua com binarização ótima de Otsu.';
  let engineFeatures = 'Normalização de Luz: Ativa · Separação de Aglomerados: Ativa (Watershed) · Filtro de Fibras: Ativo (Circ. ≥ 0.20)';

  if (method === 'chromatic') {
    engineTitle = 'Motor Cromático Espectral (B - max(R, G))';
    engineDesc = 'Isolamento espectral puro do canal azul no espaço RGB com limiar ótimo de Otsu.';
    engineFeatures = 'Normalização: Direta · Separação de Aglomerados: Desativada · Foco: Contraste de cor direto no papel amarelo';
  } else if (method === 'gotas-legacy') {
    const passes = analysis.meanFilterPasses ?? 1;
    const holes = analysis.fillHoles ? 'Ativo' : 'Desativado';
    engineTitle = 'Motor Monocromático em Escala de Cinza';
    engineDesc = 'Binarização por intensidade luminosa média (R+G+B)/3 com algoritmo de contraste de densidade óptica.';
    engineFeatures = `Suavização 3×3: ${passes} passagem(ns) · Preenchimento de Falhas: ${holes} · Ajuste Limiar: ${analysis.sensitivity > 0 ? '+' : ''}${analysis.sensitivity}`;
  }

  doc.setFontSize(6.2);
  const engineDescLines: string[] = doc.splitTextToSize(`Método: ${engineDesc}`, contentWidth - 6);
  const engineFeatLines: string[] = doc.splitTextToSize(`Parâmetros: ${engineFeatures}`, contentWidth - 6);
  const engineBoxHeight = 6 + engineDescLines.length * 3.2 + engineFeatLines.length * 3.2;

  doc.setFillColor(240, 248, 242);
  doc.rect(margin, y, contentWidth, engineBoxHeight, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, engineBoxHeight, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(`4. MOTOR DE ANÁLISE: ${engineTitle.toUpperCase()}`, margin + 3, y + 4.2);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  let curEngineY = y + 7.8;
  engineDescLines.forEach((line: string) => {
    doc.text(line, margin + 3, curEngineY);
    curEngineY += 3.2;
  });
  engineFeatLines.forEach((line: string) => {
    doc.text(line, margin + 3, curEngineY);
    curEngineY += 3.2;
  });

  y += engineBoxHeight + 3.5;

  // =========================================================================
  // 7. OBSERVAÇÕES TÉCNICAS E ORIENTAÇÕES DE CAMPO (ZERO OVERFLOW)
  // =========================================================================
  const warnings = quality.warnings.length > 0
    ? quality.warnings
    : ['Nenhuma inconsistência óptica detectada. Leitura representativa do cartão analisado.'];

  const allBulletLines: string[] = [];
  warnings.slice(0, 2).forEach((w) => {
    const splitW: string[] = doc.splitTextToSize(`• ${w}`, contentWidth - 6);
    allBulletLines.push(...splitW);
  });

  const stdTip = '• Eficácia biológica depende de alvo, condições climáticas (Delta T 2 a 8°C) e vazão correta.';
  const splitTip: string[] = doc.splitTextToSize(stdTip, contentWidth - 6);
  allBulletLines.push(...splitTip);

  const obsBoxHeight = 6 + allBulletLines.length * 3.2;

  doc.setFillColor(246, 250, 247);
  doc.rect(margin, y, contentWidth, obsBoxHeight, 'F');
  doc.setDrawColor(0, 100, 57);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, obsBoxHeight, 'S');

  doc.setTextColor(0, 100, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(`5. OBSERVAÇÕES TÉCNICAS (QUALIDADE DA LEITURA: ${quality.status})`, margin + 3, y + 4.2);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);

  let curBulletY = y + 7.8;
  allBulletLines.forEach((line: string) => {
    doc.text(line, margin + 3, curBulletY);
    curBulletY += 3.2;
  });

  // =========================================================================
  // 8. CRÉDITOS AOS AGRÔNOMOS & RODAPÉ INSTITUCIONAL
  // =========================================================================
  doc.setDrawColor(180, 200, 185);
  doc.setLineWidth(0.2);
  doc.line(margin, 281, margin + contentWidth, 281);

  doc.setTextColor(70, 90, 75);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.text('Consultoria Técnica Agronômica: Carlos Alberto · Marco Antônio Moreira de Freitas', margin, 284.5);

  doc.setTextColor(110, 110, 110);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.text('GotaFiel v2.5.0 — Metrologia de Pulverização Agrícola · Tecnologia e Processamento de Imagens', margin, 288);
  doc.text('Página 1 de 1', margin + contentWidth - 16, 288);

  // Salva o arquivo PDF
  const cleanTitle = (analysis.title || 'relatorio-amostra')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${cleanTitle}_gotafiel.pdf`);
}
