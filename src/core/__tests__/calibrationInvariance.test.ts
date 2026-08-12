import { describe, it, expect } from 'vitest';
import {
  computeMetricsFromHistogram,
  computeMm2PerPixel,
  computeTargetRaster,
  measureQuadSizePx,
  mmPerPixelEquivalent,
  TARGET_MM_PER_PIXEL,
} from '../imageProcessor';
import { runAnalysisCore } from '../analysisCore';
import { validateScale } from '../scaleValidation';
import { AnalysisParams, CropCorners, SampleHistogramBin } from '../types';

/**
 * Regression suite for the calibration defect.
 *
 * Defect: mmPerPixel was collapsed to the arithmetic mean of the two linear scales,
 *
 *     mmPerPixel = (cardWidthMm / rectWidthPx + cardHeightMm / rectHeightPx) / 2
 *
 * and then squared to obtain a pixel area. By AM-GM, ((a+b)/2)^2 >= a*b, with equality
 * only when a === b. Because the rectified raster is a fixed 760x260 while the declared
 * card can be 76x26, 76x52 or 26x38 mm, the two scales differ for most presets, and the
 * overestimate leaked into coverage — a quantity that is purely a property of the mask
 * and must not know the card's physical size at all.
 *
 * Observed on the published build, same image, same mask, 208 droplets:
 *     76x26 mm -> coverage 1,9 %
 *     76x52 mm -> coverage 2,2 %
 *     26x38 mm -> coverage 3,1 %
 *
 * Fix: mm2PerPixel = scaleX * scaleY, and coverage read straight off the mask.
 */

// The three presets from the audit report.
const CARD_PRESETS = [
  { label: '76 x 26 mm', widthMm: 76, heightMm: 26 },
  { label: '76 x 52 mm', widthMm: 76, heightMm: 52 },
  { label: '26 x 38 mm', widthMm: 26, heightMm: 38 },
] as const;

// Fixed rectified raster used by the wizard.
const RECT_W = 760;
const RECT_H = 260;

/**
 * A histogram standing in for the audited sample: 208 droplets spread over several
 * distinct pixel counts. It is defined once and reused for every card size, so any
 * variation in the results can only come from the calibration.
 */
const SHARED_HISTOGRAM: SampleHistogramBin[] = [
  { pixelCount: 4, quantity: 60 },
  { pixelCount: 9, quantity: 50 },
  { pixelCount: 16, quantity: 40 },
  { pixelCount: 25, quantity: 30 },
  { pixelCount: 49, quantity: 18 },
  { pixelCount: 100, quantity: 7 },
  { pixelCount: 225, quantity: 3 },
];

const TOTAL_DROPLETS = SHARED_HISTOGRAM.reduce((acc, b) => acc + b.quantity, 0); // 208
const TOTAL_DROPLET_PIXELS = SHARED_HISTOGRAM.reduce(
  (acc, b) => acc + b.pixelCount * b.quantity,
  0
);

describe('Invariância da calibração — cobertura não pode depender do tamanho físico do cartão', () => {
  it('a amostra compartilhada tem exatamente 208 gotas', () => {
    expect(TOTAL_DROPLETS).toBe(208);
  });

  it('mm2PerPixel é o PRODUTO scaleX * scaleY, nunca a média aritmética ao quadrado', () => {
    for (const preset of CARD_PRESETS) {
      const scaleX = preset.widthMm / RECT_W;
      const scaleY = preset.heightMm / RECT_H;

      const expected = scaleX * scaleY;
      const actual = computeMm2PerPixel(preset.widthMm, preset.heightMm, RECT_W, RECT_H);

      expect(actual).toBeCloseTo(expected, 15);

      // Closed form must agree with the product form.
      const closedForm =
        (preset.widthMm * preset.heightMm) / (RECT_W * RECT_H);
      expect(actual).toBeCloseTo(closedForm, 15);

      // And it must NOT be the squared arithmetic mean, except in the isotropic case
      // where the two coincide by definition.
      const buggy = Math.pow((scaleX + scaleY) / 2, 2);
      if (Math.abs(scaleX - scaleY) > 1e-12) {
        expect(actual).not.toBeCloseTo(buggy, 12);
        // AM-GM: the old formula always overestimated.
        expect(buggy).toBeGreaterThan(actual);
      } else {
        expect(actual).toBeCloseTo(buggy, 12);
      }
    }
  });

  it('cobertura é EXATAMENTE igual nos três tamanhos, antes do arredondamento', () => {
    const results = CARD_PRESETS.map((preset) =>
      computeMetricsFromHistogram(
        SHARED_HISTOGRAM,
        preset.widthMm,
        preset.heightMm,
        RECT_W,
        RECT_H
      )
    );

    const [a, b, c] = results;

    // Exact equality — not toBeCloseTo. Coverage is the same rational number.
    expect(a.coveragePercentExact).toBe(b.coveragePercentExact);
    expect(b.coveragePercentExact).toBe(c.coveragePercentExact);

    // And after rounding, for what the user actually sees.
    expect(a.coveragePercent).toBe(b.coveragePercent);
    expect(b.coveragePercent).toBe(c.coveragePercent);

    // Coverage equals the raw pixel ratio.
    const expectedCoverage = (TOTAL_DROPLET_PIXELS / (RECT_W * RECT_H)) * 100;
    expect(a.coveragePercentExact).toBeCloseTo(expectedCoverage, 12);

    // The mask-level accumulators are reported and consistent.
    for (const r of results) {
      expect(r.includedDropletPixelCount).toBe(TOTAL_DROPLET_PIXELS);
      expect(r.totalCardPixels).toBe(RECT_W * RECT_H);
    }
  });

  it('total de gotas é exatamente igual nos três tamanhos', () => {
    for (const preset of CARD_PRESETS) {
      const m = computeMetricsFromHistogram(
        SHARED_HISTOGRAM,
        preset.widthMm,
        preset.heightMm,
        RECT_W,
        RECT_H
      );
      expect(m.totalDroplets).toBe(TOTAL_DROPLETS);
    }
  });

  it('densidade é inversamente proporcional à área física do cartão', () => {
    for (const preset of CARD_PRESETS) {
      const m = computeMetricsFromHistogram(
        SHARED_HISTOGRAM,
        preset.widthMm,
        preset.heightMm,
        RECT_W,
        RECT_H
      );

      const areaCm2 = (preset.widthMm * preset.heightMm) / 100;
      const expectedDensity = TOTAL_DROPLETS / areaCm2;

      // density is rounded to 1 decimal for display
      expect(m.density).toBeCloseTo(expectedDensity, 1);
    }
  });

  it('densidade escala como 1/área entre pares de presets', () => {
    const metricsFor = (w: number, h: number) =>
      computeMetricsFromHistogram(SHARED_HISTOGRAM, w, h, RECT_W, RECT_H);

    const a = metricsFor(76, 26); // 1976 mm² -> 19,76 cm²
    const b = metricsFor(76, 52); // 3952 mm² -> 39,52 cm², exatamente o dobro

    // `density` é arredondada para 1 casa decimal na exibição (10,5 e 5,3), então a
    // razão entre os dois valores arredondados carrega até ~1 % de ruído de
    // arredondamento. A lei física é verificada sobre o invariante exato
    // densidade * área == número de gotas, e a razão é conferida com tolerância
    // compatível com a precisão exibida.
    expect(a.density * 19.76).toBeCloseTo(TOTAL_DROPLETS, -0.5);
    expect(b.density * 39.52).toBeCloseTo(TOTAL_DROPLETS, -0.5);

    // Dobrar a área reduz a densidade à metade, dentro do erro de arredondamento.
    expect(Math.abs(a.density / b.density - 2)).toBeLessThan(0.05);

    // Sem arredondamento, a proporcionalidade inversa é exata.
    const exactA = TOTAL_DROPLETS / 19.76;
    const exactB = TOTAL_DROPLETS / 39.52;
    expect(exactA / exactB).toBeCloseTo(2, 12);
  });

  it('diâmetros e volume acompanham a área física do pixel', () => {
    const small = computeMetricsFromHistogram(SHARED_HISTOGRAM, 26, 38, RECT_W, RECT_H);
    const large = computeMetricsFromHistogram(SHARED_HISTOGRAM, 76, 52, RECT_W, RECT_H);

    // 76x52 = 3952 mm² > 26x38 = 988 mm², logo cada pixel cobre mais área física,
    // logo as gotas medidas são maiores.
    expect(large.mm2PerPixel).toBeGreaterThan(small.mm2PerPixel);
    expect(large.dv05Um).toBeGreaterThan(small.dv05Um);
  });

  it('mmPerPixelEquivalent é a raiz de mm2PerPixel e não realimenta o cálculo', () => {
    for (const preset of CARD_PRESETS) {
      const mm2 = computeMm2PerPixel(preset.widthMm, preset.heightMm, RECT_W, RECT_H);
      const linear = mmPerPixelEquivalent(mm2);
      expect(linear * linear).toBeCloseTo(mm2, 15);
    }
  });

  it('validateScale expõe scaleX, scaleY e mm2PerPixel coerentes', () => {
    const r = validateScale(26, 38, RECT_W, RECT_H);
    expect(r.isValid).toBe(true);
    expect(r.scaleX).toBeCloseTo(26 / RECT_W, 9);
    expect(r.scaleY).toBeCloseTo(38 / RECT_H, 9);
    expect(r.mm2PerPixel).toBeCloseTo((26 / RECT_W) * (38 / RECT_H), 9);
    expect(r.isAnisotropic).toBe(true);

    // O preset 76x26 casa exatamente com o raster 760x260: pixel quadrado.
    const iso = validateScale(76, 26, RECT_W, RECT_H);
    expect(iso.isAnisotropic).toBe(false);
    expect(iso.scaleX).toBeCloseTo(iso.scaleY, 9);
  });

  it('reproduz o defeito relatado: a fórmula antiga MUDARIA a cobertura', () => {
    // Demonstra que a suíte falharia contra o código anterior.
    const coverageWithBuggyFormula = (widthMm: number, heightMm: number) => {
      const scaleX = widthMm / RECT_W;
      const scaleY = heightMm / RECT_H;
      const buggyMmPerPixel = (scaleX + scaleY) / 2;
      const totalAreaMm2 = TOTAL_DROPLET_PIXELS * buggyMmPerPixel * buggyMmPerPixel;
      return (totalAreaMm2 / (widthMm * heightMm)) * 100;
    };

    const buggyA = coverageWithBuggyFormula(76, 26);
    const buggyB = coverageWithBuggyFormula(76, 52);
    const buggyC = coverageWithBuggyFormula(26, 38);

    // A fórmula antiga produzia três coberturas distintas — o bug relatado.
    expect(buggyA).not.toBeCloseTo(buggyB, 6);
    expect(buggyA).not.toBeCloseTo(buggyC, 6);
    expect(buggyB).not.toBeCloseTo(buggyC, 6);

    // A fórmula corrigida produz uma só.
    const fixed = CARD_PRESETS.map(
      (p) =>
        computeMetricsFromHistogram(SHARED_HISTOGRAM, p.widthMm, p.heightMm, RECT_W, RECT_H)
          .coveragePercentExact
    );
    expect(new Set(fixed).size).toBe(1);
  });
});

describe('Invariância no pipeline real do Worker (runAnalysisCore)', () => {
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

  /**
   * Yellow card (high R, high G, low B) with a grid of blue squares standing in for
   * droplets. Uses the chromatic discriminator B - max(R, G) exactly as the app does.
   */
  function buildSyntheticCard(): Uint8ClampedArray {
    const pixels = new Uint8ClampedArray(SRC_W * SRC_H * 4);

    for (let i = 0; i < SRC_W * SRC_H; i++) {
      pixels[i * 4] = 245;      // R
      pixels[i * 4 + 1] = 216;  // G
      pixels[i * 4 + 2] = 0;    // B
      pixels[i * 4 + 3] = 255;
    }

    // 6x4 = 24 blue blobs, 6x6 px each, well separated.
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 6; bx++) {
        const originX = 12 + bx * 30;
        const originY = 12 + by * 26;
        for (let dy = 0; dy < 6; dy++) {
          for (let dx = 0; dx < 6; dx++) {
            const x = originX + dx;
            const y = originY + dy;
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

  it('raster FIXO: cobertura exatamente idêntica nos três tamanhos de cartão', () => {
    // Forçando o mesmo raster para os três, a máscara é literalmente a mesma e a
    // invariância tem de ser exata — nenhuma tolerância.
    const runs = CARD_PRESETS.map((preset) =>
      runAnalysisCore({
        // Fresh buffer per run: the pipeline must not depend on mutation order.
        pixels: buildSyntheticCard(),
        srcWidth: SRC_W,
        srcHeight: SRC_H,
        corners: CORNERS,
        targetWidth: RECT_W,
        targetHeight: RECT_H,
        cardSizeMm: { width: preset.widthMm, height: preset.heightMm },
        params: PARAMS,
      })
    );

    const [a, b, c] = runs;

    // The mask itself must be byte-identical: card size cannot influence binarization.
    expect(Array.from(a.binaryMask)).toEqual(Array.from(b.binaryMask));
    expect(Array.from(b.binaryMask)).toEqual(Array.from(c.binaryMask));

    // Same droplet count.
    expect(a.metrics.totalDroplets).toBe(b.metrics.totalDroplets);
    expect(b.metrics.totalDroplets).toBe(c.metrics.totalDroplets);
    expect(a.metrics.totalDroplets).toBeGreaterThan(0);

    // Same coverage, exactly, before rounding.
    expect(a.metrics.coveragePercentExact).toBe(b.metrics.coveragePercentExact);
    expect(b.metrics.coveragePercentExact).toBe(c.metrics.coveragePercentExact);

    // Density must move inversely with physical area.
    const densityTimesArea = runs.map(
      (r, i) => r.metrics.density * ((CARD_PRESETS[i].widthMm * CARD_PRESETS[i].heightMm) / 100)
    );
    for (const product of densityTimesArea) {
      expect(product).toBeCloseTo(a.metrics.totalDroplets, 0);
    }
  });

  it('raster DINÂMICO: pixels quadrados e cobertura estável dentro da tolerância de reamostragem', () => {
    // Sem override, o raster acompanha o cartão. A máscara passa a ser reamostrada em
    // resoluções diferentes, então a cobertura não é mais bit a bit idêntica — mas tem
    // de permanecer estável, porque continua sendo a mesma fração física molhada.
    const runs = CARD_PRESETS.map((preset) => {
      const planned = computeTargetRaster(
        preset.widthMm,
        preset.heightMm,
        // A foto sintética é grande o bastante para não limitar o raster ideal.
        10_000,
        10_000
      );

      const run = runAnalysisCore({
        pixels: buildSyntheticCard(),
        srcWidth: SRC_W,
        srcHeight: SRC_H,
        corners: CORNERS,
        targetWidth: planned.targetWidth,
        targetHeight: planned.targetHeight,
        cardSizeMm: { width: preset.widthMm, height: preset.heightMm },
        params: PARAMS,
      });

      return { preset, planned, run };
    });

    // 1. O raster segue exatamente card / 0,1 mm.
    expect(runs[0].planned.targetWidth).toBe(760);
    expect(runs[0].planned.targetHeight).toBe(260);
    expect(runs[1].planned.targetWidth).toBe(760);
    expect(runs[1].planned.targetHeight).toBe(520);
    expect(runs[2].planned.targetWidth).toBe(260);
    expect(runs[2].planned.targetHeight).toBe(380);

    // 2. Pixels quadrados: scaleX === scaleY, logo mm2PerPixel === 0,1².
    for (const { run } of runs) {
      expect(run.mm2PerPixel).toBeCloseTo(TARGET_MM_PER_PIXEL * TARGET_MM_PER_PIXEL, 12);
    }

    // 3. Cobertura estável entre os três, dentro da tolerância de reamostragem.
    const coverages = runs.map((r) => r.run.metrics.coveragePercentExact);
    const maxCoverage = Math.max(...coverages);
    const minCoverage = Math.min(...coverages);
    expect(maxCoverage - minCoverage).toBeLessThan(0.5); // pontos percentuais

    // 4. Contagem de gotas estável (a grade sintética tem 24 blocos).
    for (const { run } of runs) {
      expect(run.metrics.totalDroplets).toBe(24);
    }

    // 5. Área média da gota escala LINEARMENTE com a área física do cartão.
    //
    //    Isto não é um defeito: é a mesma fotografia sendo declarada como três objetos
    //    físicos diferentes. Uma mancha que ocupa 3 % da largura da imagem mede 2,3 mm
    //    num cartão de 76 mm e 0,8 mm num de 26 mm. Grandezas adimensionais (cobertura,
    //    contagem) não podem mudar; grandezas com unidade física (área, diâmetro,
    //    volume) têm de mudar, e na proporção certa.
    const meanDropletAreaMm2 = runs.map(
      ({ run }) =>
        (run.metrics.includedDropletPixelCount * run.metrics.mm2PerPixel) /
        run.metrics.totalDroplets
    );

    const cardAreas = CARD_PRESETS.map((p) => p.widthMm * p.heightMm);

    // Razão área-da-gota / área-do-cartão constante entre os presets.
    const ratios = meanDropletAreaMm2.map((a, i) => a / cardAreas[i]);
    const maxRatio = Math.max(...ratios);
    const minRatio = Math.min(...ratios);
    expect((maxRatio - minRatio) / minRatio).toBeLessThan(0.05); // < 5 %, ruído de reamostragem

    // E o DMV, por ser um comprimento, escala com a raiz da área do cartão.
    const vmds = runs.map((r) => r.run.metrics.dv05Um);
    const idx76x26 = 0;
    const idx26x38 = 2;
    const expectedVmdRatio = Math.sqrt(cardAreas[idx76x26] / cardAreas[idx26x38]);
    const actualVmdRatio = vmds[idx76x26] / vmds[idx26x38];
    // O fator de espalhamento é não linear, então a razão não é exatamente a raiz.
    expect(actualVmdRatio).toBeGreaterThan(expectedVmdRatio * 0.8);
    expect(actualVmdRatio).toBeLessThan(expectedVmdRatio * 1.2);
  });

  it('o raster nunca amplia além da resolução da fotografia', () => {
    // Um cartão 76x52 pediria 760x520, mas a foto só oferece um quad de 200x120.
    const planned = computeTargetRaster(76, 52, 200, 120);

    expect(planned.limitedBySource).toBe(true);
    expect(planned.targetWidth).toBeLessThanOrEqual(200);
    expect(planned.targetHeight).toBeLessThanOrEqual(120);

    // Redução uniforme: a proporção do cartão é preservada, então o pixel continua
    // quadrado. Limitar cada eixo isoladamente reintroduziria a anisotropia.
    const cardAspect = 76 / 52;
    const rasterAspect = planned.targetWidth / planned.targetHeight;
    expect(rasterAspect).toBeCloseTo(cardAspect, 1);

    // E a área por pixel continua isotrópica.
    const scaleX = 76 / planned.targetWidth;
    const scaleY = 52 / planned.targetHeight;
    expect(scaleX).toBeCloseTo(scaleY, 2);
  });

  it('sem limitação de fonte, o raster é exatamente card / 0,1 mm', () => {
    for (const preset of CARD_PRESETS) {
      const planned = computeTargetRaster(preset.widthMm, preset.heightMm);
      expect(planned.limitedBySource).toBe(false);
      expect(planned.targetWidth).toBe(Math.round(preset.widthMm / TARGET_MM_PER_PIXEL));
      expect(planned.targetHeight).toBe(Math.round(preset.heightMm / TARGET_MM_PER_PIXEL));
    }
  });

  it('measureQuadSizePx mede o quad em pixels da imagem original', () => {
    const size = measureQuadSizePx(CORNERS, SRC_W, SRC_H);
    expect(size.widthPx).toBeCloseTo(SRC_W, 6);
    expect(size.heightPx).toBeCloseTo(SRC_H, 6);
  });

  it('mm2PerPixel do pipeline é o produto das escalas', () => {
    const preset = CARD_PRESETS[2]; // 26 x 38 — o caso mais anisotrópico
    const run = runAnalysisCore({
      pixels: buildSyntheticCard(),
      srcWidth: SRC_W,
      srcHeight: SRC_H,
      corners: CORNERS,
      targetWidth: RECT_W,
      targetHeight: RECT_H,
      cardSizeMm: { width: preset.widthMm, height: preset.heightMm },
      params: PARAMS,
    });

    const expected = (preset.widthMm / RECT_W) * (preset.heightMm / RECT_H);
    expect(run.mm2PerPixel).toBeCloseTo(expected, 15);
    expect(run.metrics.mm2PerPixel).toBeCloseTo(expected, 15);
  });

  it('cobertura do pipeline bate com a razão de pixels da máscara', () => {
    const run = runAnalysisCore({
      pixels: buildSyntheticCard(),
      srcWidth: SRC_W,
      srcHeight: SRC_H,
      corners: CORNERS,
      targetWidth: RECT_W,
      targetHeight: RECT_H,
      cardSizeMm: { width: 76, height: 26 },
      params: PARAMS,
    });

    let maskOnes = 0;
    for (let i = 0; i < run.binaryMask.length; i++) {
      if (run.binaryMask[i] === 1) maskOnes++;
    }

    // Every component is included here (minAreaPx = 1, discardBorder = false),
    // so mask pixels and counted droplet pixels must agree.
    expect(run.metrics.includedDropletPixelCount).toBe(maskOnes);
    expect(run.metrics.coveragePercentExact).toBeCloseTo((maskOnes / (RECT_W * RECT_H)) * 100, 12);
  });
});
