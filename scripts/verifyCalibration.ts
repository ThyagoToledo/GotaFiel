/**
 * Reproducible demonstration of the calibration fix.
 *
 *   npm run verify:calibration
 *
 * Runs the SAME pipeline the UI runs (runAnalysisCore, shared by the Web Worker and the
 * in-thread fallback) over one synthetic card image, for the three card presets from the
 * audit report, and prints old-formula vs new-formula results side by side.
 */
import { runAnalysisCore } from '../src/core/analysisCore';
import { computeMetricsFromHistogram } from '../src/core/imageProcessor';
import { AnalysisParams, CropCorners } from '../src/core/types';

const RECT_W = 760;
const RECT_H = 260;

const PRESETS = [
  { label: '76 x 26 mm', widthMm: 76, heightMm: 26 },
  { label: '76 x 52 mm', widthMm: 76, heightMm: 52 },
  { label: '26 x 38 mm', widthMm: 26, heightMm: 38 },
];

const SRC_W = 200;
const SRC_H = 120;

const CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

const PARAMS: AnalysisParams = {
  method: 'chromatic',
  thresholdAdjustment: 0,
  minAreaPx: 1,
  minDropletUm: 0,
  discardBorder: false,
};

/** Yellow card with blue blobs — the chromatic discriminator B - max(R,G) separates them. */
function buildSyntheticCard(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SRC_W * SRC_H * 4);
  for (let i = 0; i < SRC_W * SRC_H; i++) {
    pixels[i * 4] = 245;
    pixels[i * 4 + 1] = 216;
    pixels[i * 4 + 2] = 0;
    pixels[i * 4 + 3] = 255;
  }
  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 6; bx++) {
      const ox = 12 + bx * 30;
      const oy = 12 + by * 26;
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          const x = ox + dx;
          const y = oy + dy;
          if (x >= SRC_W || y >= SRC_H) continue;
          const idx = (y * SRC_W + x) * 4;
          pixels[idx] = 61;
          pixels[idx + 1] = 47;
          pixels[idx + 2] = 214;
          pixels[idx + 3] = 255;
        }
      }
    }
  }
  return pixels;
}

/** The defective calculation, kept only to show the delta. */
function buggyCoverage(dropletPixels: number, widthMm: number, heightMm: number): number {
  const scaleX = widthMm / RECT_W;
  const scaleY = heightMm / RECT_H;
  const buggyMmPerPixel = (scaleX + scaleY) / 2;
  const totalAreaMm2 = dropletPixels * buggyMmPerPixel * buggyMmPerPixel;
  return (totalAreaMm2 / (widthMm * heightMm)) * 100;
}

const br = (n: number, d = 4) => n.toFixed(d).replace('.', ',');

console.log('\n=== Pipeline real (runAnalysisCore) — mesma imagem, mesma máscara ===\n');

let sharedMaskSignature = '';
let dropletPixels = 0;

for (const p of PRESETS) {
  const run = runAnalysisCore({
    pixels: buildSyntheticCard(),
    srcWidth: SRC_W,
    srcHeight: SRC_H,
    corners: CORNERS,
    targetWidth: RECT_W,
    targetHeight: RECT_H,
    cardSizeMm: { width: p.widthMm, height: p.heightMm },
    params: PARAMS,
  });

  let ones = 0;
  for (let i = 0; i < run.binaryMask.length; i++) if (run.binaryMask[i] === 1) ones++;
  const signature = `${ones}`;
  if (!sharedMaskSignature) {
    sharedMaskSignature = signature;
    dropletPixels = run.metrics.includedDropletPixelCount;
  } else if (signature !== sharedMaskSignature) {
    throw new Error('A máscara mudou entre tamanhos de cartão — isso nunca deve acontecer.');
  }

  const m = run.metrics;
  console.log(`${p.label}`);
  console.log(`  gotas .................. ${m.totalDroplets}`);
  console.log(`  px de gota ............. ${m.includedDropletPixelCount} de ${m.totalCardPixels}`);
  console.log(`  mm2/pixel .............. ${br(m.mm2PerPixel, 9)}`);
  console.log(`  cobertura (exata) ...... ${br(m.coveragePercentExact, 10)} %`);
  console.log(`  cobertura (exibida) .... ${br(m.coveragePercent, 1)} %`);
  console.log(`  densidade .............. ${br(m.density, 1)} gotas/cm²`);
  console.log(`  DMV (DV0,5) ............ ${m.dv05Um} µm`);
  console.log(`  span ................... ${br(m.span, 2)}`);
  console.log(`  volume ................. ${br(m.estimatedVolumeLha, 2)} L/ha`);
  console.log(`  --- fórmula ANTIGA daria: cobertura ${br(buggyCoverage(dropletPixels, p.widthMm, p.heightMm), 4)} %`);
  console.log('');
}

console.log('=== Verificação por histograma fixo (208 gotas) ===\n');

const HISTOGRAM = [
  { pixelCount: 4, quantity: 60 },
  { pixelCount: 9, quantity: 50 },
  { pixelCount: 16, quantity: 40 },
  { pixelCount: 25, quantity: 30 },
  { pixelCount: 49, quantity: 18 },
  { pixelCount: 100, quantity: 7 },
  { pixelCount: 225, quantity: 3 },
];

const totalPx = HISTOGRAM.reduce((a, b) => a + b.pixelCount * b.quantity, 0);

console.log('tamanho      gotas  cobertura(exata)   densidade   DMV     antiga(cobertura)');
for (const p of PRESETS) {
  const m = computeMetricsFromHistogram(HISTOGRAM, p.widthMm, p.heightMm, RECT_W, RECT_H);
  console.log(
    `${p.label.padEnd(12)} ${String(m.totalDroplets).padStart(4)}   ` +
      `${br(m.coveragePercentExact, 10).padStart(14)} %  ` +
      `${br(m.density, 1).padStart(7)}   ` +
      `${String(m.dv05Um).padStart(4)}µm  ` +
      `${br(buggyCoverage(totalPx, p.widthMm, p.heightMm), 4).padStart(10)} %`
  );
}

console.log('');
