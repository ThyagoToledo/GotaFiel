import { SampleHistogramBin } from './core/types';

export type CardColor = 'Amarelo' | 'Branco' | 'Outro';

export type QualityVerdict = 'NAO_AVALIADO' | 'GREET' | 'BOM' | 'REGULAR' | 'RUIM' | 'EXCESSO';

export type ASABECategory = 'Não classificada' | 'Muito Fina' | 'Fina' | 'Média' | 'Grossa' | 'Muito Grossa' | 'Extremamente Grossa';

export type EngineMode = 'hybrid' | 'chromatic' | 'monochrome';
export const DEFAULT_ENGINE_MODE: EngineMode = 'hybrid';

export type MeasurementQualityStatus = 'ADEQUADA' | 'LIMITADA' | 'INCONCLUSIVA';

/**
 * Sinais observáveis da captura. Eles ainda não são um veredito: os limites de
 * recaptura só poderão ser definidos depois de uma coleção rotulada.
 */
export interface CaptureQualitySignals {
  /** Percentual da área da foto ocupado pelo quadrilátero do cartão. */
  cardOccupancyPercent: number;
  /** Variância do Laplaciano na imagem retificada; maior tende a significar mais nitidez. */
  focusLaplacianVariance: number;
  /** Variação entre regiões do cartão, usada apenas como proxy de iluminação/sombra. */
  illuminationVariationPercent: number;
  /** Percentual de pixels muito escuros. */
  darkPixelPercent: number;
  /** Percentual de altas luzes neutras, usado como proxy de reflexo especular. */
  highlightPixelPercent: number;
  /** Número de amostras efetivamente usadas nos sinais de foco e exposição. */
  sampleCount: number;
  /** Identifica a versão e impede comparar números produzidos por fórmulas diferentes. */
  version: 'capture-signals-v1';
  /** Explicita que ainda não há limites calibrados para bloquear a captura. */
  calibrationStatus: 'NAO_CALIBRADO';
}

export interface MeasurementQuality {
  /** Qualidade técnica da leitura, não um veredito agronômico. */
  status: MeasurementQualityStatus;
  /** Menor resolução física entre os dois eixos do cartão recortado. */
  effectiveDpi: number;
  /** Identifica a correção automática de cartão fotografado em retrato. */
  orientationCorrected: boolean;
  coverageReliable: boolean;
  countDensityReliable: boolean;
  sizeVolumeReliable: boolean;
  warnings: string[];
  algorithmVersion: string;
  captureQuality?: CaptureQualitySignals;
}

export interface DropletItem {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  sizePx: number; // diameter in pixels
  diameterUm: number; // diameter in micrometers (µm)
  included: boolean;
  pixelCount?: number;
  areaMm2?: number;
  roundness?: number;
  isSplitCluster?: boolean;
}

export interface AnalysisData {
  id: string;
  title: string; // e.g. "Talhão 4 — Amostra 3"
  fieldId?: string; // linked Talhão id
  fieldName?: string;
  crop?: string;
  remoteOnly?: boolean;
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
  analysisMethod?: 'chromatic' | 'gotas-legacy' | 'hybrid';
  meanFilterPasses?: number;
  fillHoles?: boolean;
  splitOverlappingDroplets?: boolean;
  filterArtifacts?: boolean;
  normalizeIllumination?: boolean;

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

  /** Metadados de confiabilidade disponíveis nas análises da geração 3 ou posterior. */
  measurementQuality?: MeasurementQuality;

  // Inspection droplets array
  droplets: DropletItem[];
}

export interface SampleCardSummary {
  id: string;
  name: string; // "AMOSTRA 1"
  status: 'Adequada' | 'Limitada' | 'Inconclusiva';
  density: number;
  coverage: number;
  span: number;
  coverageReliable?: boolean;
  countDensityReliable?: boolean;
  sizeVolumeReliable?: boolean;
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

/**
 * Como o desvio de vazão de cada bico vira uma ação recomendada.
 *
 * 'absoluto'   — só o tamanho do desvio importa, não o sentido. É o critério que o
 *                app sempre usou e segue sendo o padrão.
 * 'direcional' — separa as duas causas físicas do desvio: bico acima da média está
 *                com o orifício desgastado (limpeza não recupera, tem de trocar);
 *                abaixo da média está obstruído (limpar resolve até certo ponto).
 */
export type NozzleCriteriaMode = 'absoluto' | 'direcional';

export interface NozzleCriteria {
  mode: NozzleCriteriaMode;
  /** Desvio (%) a partir do qual o bico sai do OK. */
  cleanThresholdPercent: number;
  /** Desvio (%) a partir do qual o bico deve ser substituído. */
  replaceThresholdPercent: number;
}

export const DEFAULT_NOZZLE_CRITERIA: NozzleCriteria = {
  mode: 'absoluto',
  cleanThresholdPercent: 6,
  replaceThresholdPercent: 10,
};

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
