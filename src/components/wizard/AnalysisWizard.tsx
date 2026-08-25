import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Header } from '../Header';
import { Step1Capture } from './Step1Capture';
import { Step2Crop } from './Step2Crop';
import { Step3Scale } from './Step3Scale';
import { Step4Sensitivity } from './Step4Sensitivity';
import { Step5Result } from './Step5Result';
import { Step6Inspection } from './Step6Inspection';
import { AnalysisData, DropletItem, EngineMode, FieldExperiment } from '../../types';
import { CropCorners, BinarizationMethod, AnalysisParams } from '../../core/types';
import { runImagePipeline, PipelineResult } from '../../core/workerPipeline';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';

interface AnalysisWizardProps {
  fieldExperiments: FieldExperiment[];
  initialAnalysis?: AnalysisData | null;
  preselectedFieldId?: string;
  recentAnalysesCount?: number;
  defaultEngineMode?: EngineMode;
  onCloseWizard: () => void;
  onSaveAnalysis: (analysis: AnalysisData) => Promise<void> | void;
}

const DEFAULT_CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

export const AnalysisWizard: React.FC<AnalysisWizardProps> = ({
  fieldExperiments,
  initialAnalysis,
  preselectedFieldId,
  recentAnalysesCount = 0,
  defaultEngineMode,
  onCloseWizard,
  onSaveAnalysis,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialAnalysis ? 5 : 1);
  const [pipelineDirty, setPipelineDirty] = useState<boolean>(!initialAnalysis);

  const [corners, setCorners] = useState<CropCorners>(DEFAULT_CORNERS);
  const [method, setMethod] = useState<BinarizationMethod>(() => {
    if (initialAnalysis?.analysisMethod) return initialAnalysis.analysisMethod;
    if (defaultEngineMode === 'monochrome') return 'gotas-legacy';
    if (defaultEngineMode === 'chromatic') return 'chromatic';
    return 'hybrid';
  });
  const [minDropletUm, setMinDropletUm] = useState<number>(10);
  const [discardBorder, setDiscardBorder] = useState<boolean>(true);
  const [meanFilterPasses, setMeanFilterPasses] = useState<number>(1);
  const [fillHoles, setFillHoles] = useState<boolean>(true);
  const [splitOverlappingDroplets, setSplitOverlappingDroplets] = useState<boolean>(true);
  const [filterArtifacts, setFilterArtifacts] = useState<boolean>(true);
  const [normalizeIllumination, setNormalizeIllumination] = useState<boolean>(true);

  const [binaryMaskDataUrl, setBinaryMaskDataUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineError, setPipelineError] = useState<string>('');
  // O raster que a análise REALMENTE usou. Pode ser menor que o ideal quando a foto não
  // tem resolução para ele, e nesse caso o passo 3 precisa dizer isso em vez de anunciar
  // uma resolução que não foi aplicada.
  const [rasterLimitedBySource, setRasterLimitedBySource] = useState<boolean>(false);

  const [analysisState, setAnalysisState] = useState<AnalysisData>(() => {
    if (initialAnalysis) return initialAnalysis;

    return {
      id: `ana-${Date.now()}`,
      title: 'Amostra de Pulverização',
      date: 'Hoje',
      timestamp: Date.now(),
      imageUrl: '',
      cardColor: 'Amarelo',
      cardSizeMm: { width: 76, height: 26 },
      dpi: 300,
      sensitivity: 0,
      totalDroplets: 0,
      density: 0,
      coveragePercent: 0,
      span: 0,
      vmdUm: 0,
      dv01Um: 0,
      dv09Um: 0,
      estimatedVolumeLha: 0,
      verdict: 'NAO_AVALIADO',
      verdictScore: 0,
      verdictMessage: 'Aguardando processamento de imagem...',
      asabeCategory: 'Não classificada',
      droplets: [],
    };
  });

  const executePipeline = useCallback(
    async (
      imgUrl: string,
      cropCorners: CropCorners,
      sizeMm: { width: number; height: number },
      sens: number,
      binMethod: BinarizationMethod,
      minUm: number,
      discardBrd: boolean,
      splitOverlap: boolean,
      filterArt: boolean,
      normIllum: boolean
    ) => {
      if (!imgUrl) return;
      setIsProcessing(true);
      setPipelineError('');

      try {
        const params: AnalysisParams = {
          method: binMethod,
          thresholdAdjustment: sens,
          minAreaPx: 1,
          minDropletUm: minUm,
          discardBorder: discardBrd,
          meanFilterPasses: binMethod === 'gotas-legacy' ? meanFilterPasses : 0,
          fillHoles: binMethod === 'gotas-legacy' ? fillHoles : false,
          splitOverlappingDroplets: splitOverlap,
          filterArtifacts: filterArt,
          normalizeIllumination: normIllum,
        };

        const result: PipelineResult = await runImagePipeline(
          imgUrl,
          cropCorners,
          sizeMm,
          params
        );

        setBinaryMaskDataUrl(result.binaryDataUrl);
        setRasterLimitedBySource(result.rasterLimitedBySource);

        setAnalysisState((prev) => ({
          ...prev,
          imageUrl: imgUrl,
          rectifiedImageUrl: result.rectifiedDataUrl,
          cardSizeMm: sizeMm,
          sensitivity: sens,
          analysisMethod: binMethod,
          meanFilterPasses: binMethod === 'gotas-legacy' ? meanFilterPasses : 0,
          fillHoles: binMethod === 'gotas-legacy' ? fillHoles : false,
          splitOverlappingDroplets: splitOverlap,
          filterArtifacts: filterArt,
          normalizeIllumination: normIllum,
          mm2PerPixel: result.mm2PerPixel,
          mmPerPixel: result.mmPerPixel,
          rectWidthPx: result.rectWidthPx,
          rectHeightPx: result.rectHeightPx,
          histogram: result.histogram,
          totalDroplets: result.metrics.totalDroplets,
          density: result.metrics.density,
          coveragePercent: result.metrics.coveragePercent,
          span: result.metrics.span,
          vmdUm: result.metrics.dv05Um,
          dv01Um: result.metrics.dv01Um,
          dv09Um: result.metrics.dv09Um,
          estimatedVolumeLha: result.metrics.estimatedVolumeLha,
          verdict: result.metrics.verdict,
          verdictScore: result.metrics.verdictScore,
          verdictMessage: result.metrics.verdictMessage,
          asabeCategory: result.metrics.asabeCategory,
          measurementQuality: result.measurementQuality,
          droplets: result.droplets,
        }));
      } catch (err) {
        // Sem isto a falha ficava só no console: a tela seguia mostrando métricas
        // zeradas, indistinguíveis de um cartão sem gotas.
        console.error('Pipeline execution error:', err);
        setPipelineError(
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível processar esta imagem.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [meanFilterPasses, fillHoles]
  );

  // Trigger processing when parameters or image change (somente para novas análises ou ajustes manuais)
  useEffect(() => {
    if (analysisState.imageUrl && pipelineDirty) {
      executePipeline(
        analysisState.imageUrl,
        corners,
        analysisState.cardSizeMm,
        analysisState.sensitivity,
        method,
        minDropletUm,
        discardBorder,
        splitOverlappingDroplets,
        filterArtifacts,
        normalizeIllumination
      );
    }
  }, [
    pipelineDirty,
    analysisState.imageUrl,
    corners,
    analysisState.cardSizeMm,
    analysisState.sensitivity,
    method,
    minDropletUm,
    discardBorder,
    meanFilterPasses,
    fillHoles,
    splitOverlappingDroplets,
    filterArtifacts,
    normalizeIllumination,
    executePipeline,
  ]);

  const isSavedView = Boolean(initialAnalysis);

  const handleBack = () => {
    // Se estiver visualizando uma análise salva existente:
    if (isSavedView) {
      if (currentStep === 6) {
        setCurrentStep(5);
      } else {
        onCloseWizard();
      }
      return;
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCloseWizard();
    }
  };

  const getStepTitle = () => {
    if (isSavedView) {
      if (currentStep === 6) return 'Inspeção de Gotas';
      return analysisState.title || 'Detalhes da Amostra';
    }
    switch (currentStep) {
      case 1:
        return 'Análise';
      case 2:
        return 'Escala';
      case 3:
        return 'Cartão';
      case 4:
        return 'Ajustes';
      case 5:
        return 'Resultado';
      case 6:
        return 'Gotas detectadas';
      default:
        return 'Análise';
    }
  };

  const getStepText = () => {
    if (isSavedView) {
      return currentStep === 6 ? 'Inspeção' : '';
    }
    return `${currentStep} de 6`;
  };

  // O wizard ocupa a tela inteira e não renderiza a barra lateral, então não pode
  // reservar a faixa dela (md:pl-[240px]): isso abria um vão vazio de 240px e jogava
  // todo o conteúdo para a direita no desktop.
  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-background">
      <Header
        title={getStepTitle()}
        stepText={getStepText()}
        showBack={true}
        onBack={handleBack}
      />

      {pipelineError && (
        <div className="mx-4 mt-3 bg-error-container text-on-error-container border border-error/40 rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-xs font-bold">Falha ao processar a imagem</span>
            <span className="text-[11px] leading-relaxed break-words">{pipelineError}</span>
            <span className="text-[11px] leading-relaxed opacity-80">
              Os valores exibidos não correspondem a esta imagem. Volte ao passo 1 e escolha outra foto.
            </span>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <Step1Capture
          onImageSelected={(img, gpsCoords, canopyPosition) => {
            setPipelineDirty(true);
            setBinaryMaskDataUrl('');
            setCorners(DEFAULT_CORNERS);
            setAnalysisState((prev) => ({
              ...prev,
              imageUrl: img,
              rectifiedImageUrl: undefined,
              latitude: gpsCoords?.latitude,
              longitude: gpsCoords?.longitude,
              canopyPosition: canopyPosition || 'livre',
              droplets: [],
              histogram: [],
              mm2PerPixel: undefined,
              mmPerPixel: undefined,
              rectWidthPx: undefined,
              rectHeightPx: undefined,
              measurementQuality: undefined,
              totalDroplets: 0,
              density: 0,
              coveragePercent: 0,
            }));
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <Step3Scale
          cardSizeMm={analysisState.cardSizeMm}
          onChangeCardSize={(size) => {
            setPipelineDirty(true);
            setAnalysisState((prev) => ({ ...prev, cardSizeMm: size }));
          }}
          imageUrl={analysisState.imageUrl}
          rectWidthPx={analysisState.rectWidthPx}
          rectHeightPx={analysisState.rectHeightPx}
          limitedBySource={rasterLimitedBySource}
          onNext={() => {
            setPipelineDirty(true);
            setCurrentStep(3);
          }}
        />
      )}

      {currentStep === 3 && (
        <Step2Crop
          imageUrl={analysisState.imageUrl}
          cardColor={analysisState.cardColor}
          onChangeCardColor={(color) => {
            setPipelineDirty(true);
            setAnalysisState((prev) => ({ ...prev, cardColor: color }));
          }}
          onNext={(selectedCorners) => {
            setPipelineDirty(true);
            setCorners(selectedCorners);
            setCurrentStep(4);
          }}
        />
      )}

      {currentStep === 4 && (
        <Step4Sensitivity
          sensitivity={analysisState.sensitivity}
          onChangeSensitivity={(sens) => {
            setPipelineDirty(true);
            setAnalysisState((prev) => ({ ...prev, sensitivity: sens }));
          }}
          method={method}
          onChangeMethod={(m) => {
            setPipelineDirty(true);
            setMethod(m);
          }}
          minDropletUm={minDropletUm}
          onChangeMinDropletUm={(val) => {
            setPipelineDirty(true);
            setMinDropletUm(val);
          }}
          discardBorder={discardBorder}
          onChangeDiscardBorder={(val) => {
            setPipelineDirty(true);
            setDiscardBorder(val);
          }}
          meanFilterPasses={meanFilterPasses}
          onChangeMeanFilterPasses={(val) => {
            setPipelineDirty(true);
            setMeanFilterPasses(val);
          }}
          fillHoles={fillHoles}
          onChangeFillHoles={(val) => {
            setPipelineDirty(true);
            setFillHoles(val);
          }}
          splitOverlappingDroplets={splitOverlappingDroplets}
          onChangeSplitOverlappingDroplets={(val) => {
            setPipelineDirty(true);
            setSplitOverlappingDroplets(val);
          }}
          filterArtifacts={filterArtifacts}
          onChangeFilterArtifacts={(val) => {
            setPipelineDirty(true);
            setFilterArtifacts(val);
          }}
          normalizeIllumination={normalizeIllumination}
          onChangeNormalizeIllumination={(val) => {
            setPipelineDirty(true);
            setNormalizeIllumination(val);
          }}
          binaryMaskDataUrl={binaryMaskDataUrl}
          isProcessing={isProcessing}
          detectedDroplets={analysisState.totalDroplets}
          hasError={Boolean(pipelineError)}
          onNext={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && (
        <Step5Result
          analysis={analysisState}
          fieldExperiments={fieldExperiments}
          preselectedFieldId={preselectedFieldId}
          recentAnalysesCount={recentAnalysesCount}
          isExistingAnalysis={isSavedView}
          onViewDroplets={() => setCurrentStep(6)}
          onAdjustCalibration={() => {
            setPipelineDirty(true);
            setCurrentStep(4);
          }}
          onClose={onCloseWizard}
          onSaveToSample={async (fieldId, sampleName) => {
            const selectedField = fieldExperiments.find((field) => field.id === fieldId);
            const final = { ...analysisState, fieldId: fieldId || undefined, fieldName: selectedField?.name, crop: selectedField?.crop, title: sampleName };
            await onSaveAnalysis(final);
            onCloseWizard();
          }}
        />
      )}

      {currentStep === 6 && (
        <Step6Inspection
          analysis={analysisState}
          onUpdateDroplets={(updated) => {
            setAnalysisState((prev) => recalculateAnalysisData({ ...prev, droplets: updated }));
          }}
          // Salvar direto daqui pulava o modal do passo 5 e a amostra perdia o talhão e o
          // nome. A inspeção termina voltando ao resultado, onde o salvamento é único.
          onFinish={() => setCurrentStep(5)}
        />
      )}
    </div>
  );
};
