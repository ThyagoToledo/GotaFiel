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
  coveragePercent: number; // %
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
  mmPerPixel: number;
  areaCm2: number;
  areaMm2: number;
  errorReason?: string;
}
