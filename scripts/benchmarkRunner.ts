/**
 * Script de Execução e Auditoria do Benchmark de Validação Científica do Gotas2.
 *
 *   npm run test:benchmark
 *
 * Compara a saída do pipeline com máscaras e contagens de verdade-terreno (ground truth),
 * avaliando Precisão, Recall, F1, IoU, erro de contagem e acurácia de cobertura.
 */
import { runAnalysisCore } from '../src/core/analysisCore';
import {
  aggregateValidationBatch,
  compareBinaryMasks,
  compareCounts,
  compareCoverage,
  meetsFullValidationCriteria,
  TARGET_SEGMENTATION_ACCURACY,
} from '../src/core/validationMetrics';
import { AnalysisParams, CropCorners } from '../src/core/types';

const CARD_W_MM = 76;
const CARD_H_MM = 26;
const RASTER_W = 760;
const RASTER_H = 260;

const CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

interface BenchmarkCaseDef {
  name: string;
  droplets: Array<{ cx: number; cy: number; radius: number }>;
  options?: {
    shadowGradient?: boolean;
    noiseLevel?: number;
    splitOverlapping?: boolean;
    filterArtifacts?: boolean;
  };
}

function buildGroundTruthCard(
  width: number,
  height: number,
  droplets: Array<{ cx: number; cy: number; radius: number }>,
  options: { shadowGradient?: boolean; noiseLevel?: number } = {}
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const groundTruthMask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let illumination = 1.0;
      if (options.shadowGradient) {
        illumination = 1.0 - 0.55 * (x / width);
      }
      const noise = options.noiseLevel ? (Math.random() - 0.5) * options.noiseLevel : 0;
      pixels[idx] = Math.max(0, Math.min(255, Math.round((240 + noise) * illumination)));
      pixels[idx + 1] = Math.max(0, Math.min(255, Math.round((220 + noise) * illumination)));
      pixels[idx + 2] = Math.max(0, Math.min(255, Math.round((45 + noise) * illumination)));
      pixels[idx + 3] = 255;
    }
  }

  for (const drop of droplets) {
    const minX = Math.max(0, Math.floor(drop.cx - drop.radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(drop.cx + drop.radius + 1));
    const minY = Math.max(0, Math.floor(drop.cy - drop.radius - 1));
    const maxY = Math.min(height - 1, Math.ceil(drop.cy + drop.radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (Math.hypot(x - drop.cx, y - drop.cy) <= drop.radius) {
          const idx = (y * width + x) * 4;
          groundTruthMask[y * width + x] = 1;
          let illumination = 1.0;
          if (options.shadowGradient) illumination = 1.0 - 0.55 * (x / width);
          pixels[idx] = Math.max(0, Math.min(255, Math.round(35 * illumination)));
          pixels[idx + 1] = Math.max(0, Math.min(255, Math.round(40 * illumination)));
          pixels[idx + 2] = Math.max(0, Math.min(255, Math.round(180 * illumination)));
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  return { pixels, groundTruthMask, dropletCount: droplets.length };
}

const BENCHMARK_SUITE: BenchmarkCaseDef[] = [
  {
    name: '1. Padrão Geométrico de Calibração (25 gotas)',
    droplets: Array.from({ length: 25 }, (_, i) => ({
      cx: 60 + (i % 5) * 150,
      cy: 35 + Math.floor(i / 5) * 48,
      radius: 6 + (i % 4) * 2,
    })),
  },
  {
    name: '2. Gotas Finas Esparsas (Baixa Cobertura)',
    droplets: [
      { cx: 80, cy: 60, radius: 5 },
      { cx: 200, cy: 120, radius: 6 },
      { cx: 350, cy: 80, radius: 5 },
      { cx: 500, cy: 140, radius: 7 },
      { cx: 650, cy: 90, radius: 6 },
    ],
  },
  {
    name: '3. Gradiente Severo de Sombra (100% a 45% luz)',
    droplets: Array.from({ length: 16 }, (_, i) => ({
      cx: 45 + i * 44,
      cy: 60 + (i % 4) * 45,
      radius: 8,
    })),
    options: { shadowGradient: true, noiseLevel: 10 },
  },
  {
    name: '4. Gotas Aglomeradas com Constrição (Split)',
    droplets: [
      { cx: 120, cy: 100, radius: 14 },
      { cx: 142, cy: 100, radius: 14 },
      { cx: 300, cy: 120, radius: 16 },
      { cx: 326, cy: 120, radius: 16 },
      { cx: 500, cy: 100, radius: 12 },
    ],
    options: { splitOverlapping: true },
  },
  {
    name: '5. Ruído de Granulação de Papel Real',
    droplets: [
      { cx: 100, cy: 70, radius: 10 },
      { cx: 250, cy: 150, radius: 14 },
      { cx: 420, cy: 60, radius: 11 },
      { cx: 600, cy: 130, radius: 13 },
    ],
    options: { noiseLevel: 12 },
  },
];

const fmtPct = (val: number | null) => (val === null ? 'N/A' : `${(val * 100).toFixed(2).replace('.', ',')} %`);
const fmtNum = (val: number, dec = 2) => val.toFixed(dec).replace('.', ',');

console.log('\n========================================================================');
console.log('       GOTAFIEL — RELATÓRIO DE BENCHMARK E VALIDAÇÃO CIENTÍFICA        ');
console.log('       Meta de Aceitação: Precisão, Recall e F1 >= 95,00 %             ');
console.log('========================================================================\n');

const segMetricsList = [];
let allPassed = true;

for (const tc of BENCHMARK_SUITE) {
  const { pixels, groundTruthMask, dropletCount } = buildGroundTruthCard(
    RASTER_W,
    RASTER_H,
    tc.droplets,
    tc.options
  );

  const params: AnalysisParams = {
    method: 'hybrid',
    thresholdAdjustment: 0,
    minAreaPx: 4,
    minDropletUm: 0,
    discardBorder: false,
    normalizeIllumination: true,
    splitOverlappingDroplets: tc.options?.splitOverlapping ?? true,
    filterArtifacts: tc.options?.filterArtifacts ?? true,
  };

  const result = runAnalysisCore({
    pixels,
    srcWidth: RASTER_W,
    srcHeight: RASTER_H,
    corners: CORNERS,
    targetWidth: RASTER_W,
    targetHeight: RASTER_H,
    cardSizeMm: { width: CARD_W_MM, height: CARD_H_MM },
    params,
  });

  const seg = compareBinaryMasks(result.binaryMask, groundTruthMask);
  const count = compareCounts(result.metrics.totalDroplets, dropletCount);
  const refCoverage = (Array.from(groundTruthMask).filter((v) => v === 1).length / (RASTER_W * RASTER_H)) * 100;
  const cov = compareCoverage(result.metrics.coveragePercentExact, refCoverage);
  const passed = meetsFullValidationCriteria(seg, cov);

  if (!passed) allPassed = false;
  segMetricsList.push(seg);

  console.log(`Cenário: ${tc.name}`);
  console.log(`  Precisão: ........... ${fmtPct(seg.precision)} ${seg.precision! >= TARGET_SEGMENTATION_ACCURACY ? '✓' : '✗'}`);
  console.log(`  Recall: ............. ${fmtPct(seg.recall)} ${seg.recall! >= TARGET_SEGMENTATION_ACCURACY ? '✓' : '✗'}`);
  console.log(`  F1-Score: ........... ${fmtPct(seg.f1)} ${seg.f1! >= TARGET_SEGMENTATION_ACCURACY ? '✓' : '✗'}`);
  console.log(`  IoU (Jaccard): ...... ${fmtPct(seg.iou)}`);
  console.log(`  Contagem: ........... ${result.metrics.totalDroplets} detectadas / ${dropletCount} reais (Erro rel: ${fmtPct(count.relativeErrorPercent ? count.relativeErrorPercent / 100 : 0)})`);
  console.log(`  Cobertura: .......... ${fmtNum(result.metrics.coveragePercentExact)}% (Ref: ${fmtNum(refCoverage)}% | Erro: ${fmtNum(cov.absoluteErrorPoints, 3)} p.p.)`);
  console.log(`  Status: ............. ${passed ? 'APROVADO (META 95% ATINGIDA)' : 'REPROVADO'}`);
  console.log('------------------------------------------------------------------------');
}

const batch = aggregateValidationBatch(segMetricsList);

console.log('\n========================================================================');
console.log('                    MÉTRICAS AGREGADAS DO CONJUNTO                     ');
console.log('========================================================================');
console.log(`  Micro-Precisão: ..... ${fmtPct(batch.microPrecision)}`);
console.log(`  Micro-Recall: ....... ${fmtPct(batch.microRecall)}`);
console.log(`  Micro-F1: ........... ${fmtPct(batch.microF1)}`);
console.log(`  Micro-IoU: .......... ${fmtPct(batch.microIou)}`);
console.log(`  Macro-Precisão: ..... ${fmtPct(batch.macroPrecision)}`);
console.log(`  Macro-Recall: ....... ${fmtPct(batch.macroRecall)}`);
console.log(`  Macro-F1: ........... ${fmtPct(batch.macroF1)}`);
console.log(`  Amostras testadas: .. ${batch.sampleCount}`);
console.log(`  Resultado Geral: .... ${allPassed ? '✓ APROVADO — TODAS AS METAS >= 95% ATINGIDAS' : '✗ REPROVADO'}`);
console.log('========================================================================\n');

if (!allPassed) {
  process.exit(1);
}
