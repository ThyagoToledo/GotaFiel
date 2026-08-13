import { SampleHistogramBin } from './core/types';

export type CardColor = 'Amarelo' | 'Branco' | 'Outro';

export type QualityVerdict = 'GREET' | 'BOM' | 'REGULAR' | 'RUIM' | 'EXCESSO';

export type ASABECategory = 'Muito Fina' | 'Fina' | 'Média' | 'Grossa' | 'Muito Grossa' | 'Extremamente Grossa';

export interface DropletItem {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  sizePx: number; // diameter in pixels
  diameterUm: number; // diameter in micrometers (µm)
  included: boolean;
  pixelCount?: number;
  areaMm2?: number;
}

export interface AnalysisData {
  id: string;
  title: string; // e.g. "Talhão 4 — Amostra 3"
  fieldId?: string; // linked Talhão id
  date: string;
  timestamp: number;
  imageUrl: string;
  /**
   * Recorte retificado do cartão gerado pelo pipeline. É o espaço de coordenadas das
   * gotas (x/y em % do raster), então a inspeção manual desenha sobre ele — desenhar
   * sobre a foto original desalinha os marcadores.
   */
  rectifiedImageUrl?: string;
  cardColor: CardColor;
  cardSizeMm: { width: number; height: number };
  dpi: number;
  sensitivity: number; // -50 to +50

  // Calibration & Resolution persistence.
  // The calibration is (cardSizeMm, rectWidthPx, rectHeightPx). mm2PerPixel is derived
  // from those; mmPerPixel is only sqrt(mm2PerPixel), kept for display and CSV.
  mm2PerPixel?: number;
  mmPerPixel?: number;
  rectWidthPx?: number;
  rectHeightPx?: number;
  histogram?: SampleHistogramBin[];

  // Results
  totalDroplets: number;
  density: number; // gotas/cm²
  coveragePercent: number; // %
  span: number; // Homogeneidade (DV0.9 - DV0.1) / DV0.5
  vmdUm: number; // DV0.5 em µm
  dv01Um: number;
  dv09Um: number;
  estimatedVolumeLha: number;
  verdict: QualityVerdict;
  verdictScore: number; // 0 - 100
  verdictMessage?: string;
  asabeCategory: ASABECategory;

  // Inspection droplets array
  droplets: DropletItem[];
}

export interface SampleCardSummary {
  id: string;
  name: string; // "AMOSTRA 1"
  status: 'Ideal' | 'Razoável' | 'Ruim' | 'Excesso';
  density: number;
  coverage: number;
  span: number;
}

export interface FieldExperiment {
  id: string;
  name: string; // e.g. "Talhão 4 — Soja"
  crop: string; // "Soja"
  date: string;
  samples: SampleCardSummary[];
}

export interface NozzleMeasurement {
  id: number;
  label: string; // "Bico 1"
  volumeMl: number; // collected volume in mL (e.g. 812 mL)
  deviationPercent: number; // e.g. +2% or -14%
  actionRequired?: 'SUBSTITUIR' | 'LIMPAR' | 'OK';
}

export interface NozzleCalibrationSession {
  id: string;
  date: string;
  nozzleCount: number;
  collectionTimeSec: number; // e.g. 60
  overallAvgMl: number;
  flowAvgLmin: number;
  maxDevPercent: number;
  nozzles: NozzleMeasurement[];
}

export type ActiveTab = 'home' | 'analysis' | 'experiments' | 'calculators' | 'more';
