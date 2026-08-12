import { QualityVerdict, ASABECategory } from '../types';

export type BinarizationMethod = 'chromatic' | 'gotas-legacy';

export interface Point {
  x: number; // percentage 0-100 or relative 0-1
  y: number; // percentage 0-100 or relative 0-1
}

export type CornerKey = 'tl' | 'tr' | 'br' | 'bl';

export type CropCorners = Record<CornerKey, Point>;

export interface AnalysisParams {
  method: BinarizationMethod;
  thresholdAdjustment: number; // -50 to +50
  minAreaPx: number;
  minDropletUm: number;
  discardBorder: boolean;
  roundnessMin?: number;
}

export interface SampleHistogramBin {
  pixelCount: number;
  quantity: number;
}

export interface DropletComponent {
  id: string;
  pixelCount: number;
  areaMm2: number;
  diameterUm: number;
  centerX: number; // percentage 0-100
  centerY: number; // percentage 0-100
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  touchesBorder: boolean;
  included: boolean;
}

export interface ProcessedAnalysisMetrics {
  totalDroplets: number;
  density: number; // gotas/cm²
  coveragePercent: number; // % (arredondado para exibição, 1 casa)
  /** Cobertura sem arredondamento. Invariante à dimensão física declarada do cartão. */
  coveragePercentExact: number;
  /** Pixels da máscara pertencentes a gotas incluídas. Base da cobertura. */
  includedDropletPixelCount: number;
  /** rectWidthPx * rectHeightPx do raster retificado. */
  totalCardPixels: number;
  /** Área física de um pixel, em mm². Sempre scaleX * scaleY, nunca ((scaleX+scaleY)/2)². */
  mm2PerPixel: number;
  dv01Um: number;
  dv05Um: number; // VMD (µm)
  dv09Um: number;
  span: number;
  estimatedVolumeLha: number;
  verdict: QualityVerdict;
  verdictScore: number;
  verdictMessage?: string;
  asabeCategory: ASABECategory;
}

export interface PersistedAnalysis {
  id: string;
  timestamp: number;
  title: string;
  fieldId?: string;
  fieldName?: string;
  date?: string;
  cardSizeMm: { width: number; height: number };
  /**
   * Raster dimensions of the rectified card. Persisted because the calibration is
   * (cardSizeMm, rect dimensions) — storing only a collapsed linear ratio is what made
   * results unreproducible.
   */
  rectWidthPx: number;
  rectHeightPx: number;
  /** Área física de um pixel, em mm². Derivável de cardSizeMm + rect*, persistido para auditoria. */
  mm2PerPixel: number;
  /** sqrt(mm2PerPixel). Exibição e CSV apenas. */
  mmPerPixel: number;
  params: AnalysisParams;
  histogram: SampleHistogramBin[];
  metrics: ProcessedAnalysisMetrics;
}

export interface ScaleValidationResult {
  isValid: boolean;
  widthMm: number;
  heightMm: number;
  rectWidthPx: number;
  rectHeightPx: number;
  /** Área física de um pixel, em mm². Grandeza de calibração canônica. */
  mm2PerPixel: number;
  /** sqrt(mm2PerPixel). Apenas para exibição e compatibilidade de CSV. */
  mmPerPixel: number;
  /** cardWidthMm / rectWidthPx */
  scaleX: number;
  /** cardHeightMm / rectHeightPx */
  scaleY: number;
  /** true quando scaleX !== scaleY, isto é, o pixel não é quadrado em espaço físico. */
  isAnisotropic: boolean;
  areaCm2: number;
  areaMm2: number;
  errorReason?: string;
}
