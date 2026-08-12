import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../Header';
import { Step1Capture } from './Step1Capture';
import { Step2Crop } from './Step2Crop';
import { Step3Scale } from './Step3Scale';
import { Step4Sensitivity } from './Step4Sensitivity';
import { Step5Result } from './Step5Result';
import { Step6Inspection } from './Step6Inspection';
import { AnalysisData, DropletItem, FieldExperiment } from '../../types';
import { CropCorners, BinarizationMethod, AnalysisParams } from '../../core/types';
import { runImagePipeline, PipelineResult } from '../../core/workerPipeline';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';

interface AnalysisWizardProps {
  fieldExperiments: FieldExperiment[];
  initialAnalysis?: AnalysisData | null;
  onCloseWizard: () => void;
  onSaveAnalysis: (analysis: AnalysisData) => void;
}

const DEFAULT_CORNERS: CropCorners = {
  tl: { x: 5, y: 10 },
  tr: { x: 95, y: 10 },
  br: { x: 95, y: 90 },
  bl: { x: 5, y: 90 },
};

export const AnalysisWizard: React.FC<AnalysisWizardProps> = ({
  fieldExperiments,
  initialAnalysis,
  onCloseWizard,
  onSaveAnalysis,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialAnalysis ? 5 : 1);

  const [corners, setCorners] = useState<CropCorners>(DEFAULT_CORNERS);
  const [method, setMethod] = useState<BinarizationMethod>('chromatic');
  const [minDropletUm, setMinDropletUm] = useState<number>(50);
  const [discardBorder, setDiscardBorder] = useState<boolean>(true);

  const [binaryMaskDataUrl, setBinaryMaskDataUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
      verdict: 'RUIM',
      verdictScore: 0,
      verdictMessage: 'Aguardando processamento de imagem...',
      asabeCategory: 'Muito Fina',
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
      discardBrd: boolean
    ) => {
      if (!imgUrl) return;
      setIsProcessing(true);

      try {
        const params: AnalysisParams = {
          method: binMethod,
          thresholdAdjustment: sens,
          minAreaPx: 1,
          minDropletUm: minUm,
          discardBorder: discardBrd,
        };

        const result: PipelineResult = await runImagePipeline(
          imgUrl,
          cropCorners,
          sizeMm,
          params
        );

        setBinaryMaskDataUrl(result.binaryDataUrl);

        setAnalysisState((prev) => ({
          ...prev,
          imageUrl: imgUrl,
          cardSizeMm: sizeMm,
          sensitivity: sens,
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
          droplets: result.droplets,
        }));
      } catch (err) {
        console.error('Pipeline execution error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Trigger processing when parameters or image change
  useEffect(() => {
    if (analysisState.imageUrl) {
      executePipeline(
        analysisState.imageUrl,
        corners,
        analysisState.cardSizeMm,
        analysisState.sensitivity,
        method,
        minDropletUm,
        discardBorder
      );
    }
  }, [
    analysisState.imageUrl,
    corners,
    analysisState.cardSizeMm,
    analysisState.sensitivity,
    method,
    minDropletUm,
    discardBorder,
    executePipeline,
  ]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCloseWizard();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Análise';
      case 2:
        return 'Cartão';
      case 3:
        return 'Escala';
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

  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-background md:pl-[240px]">
      <Header
        title={getStepTitle()}
        stepText={`${currentStep} de 6`}
        showBack={true}
        onBack={handleBack}
      />

      {currentStep === 1 && (
        <Step1Capture
          onImageSelected={(img) => {
            setBinaryMaskDataUrl('');
            setAnalysisState((prev) => ({
              ...prev,
              imageUrl: img,
              droplets: [],
              histogram: [],
              mm2PerPixel: undefined,
              mmPerPixel: undefined,
              rectWidthPx: undefined,
              rectHeightPx: undefined,
              totalDroplets: 0,
              density: 0,
              coveragePercent: 0,
            }));
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <Step2Crop
          imageUrl={analysisState.imageUrl}
          cardColor={analysisState.cardColor}
          onChangeCardColor={(color) => setAnalysisState((prev) => ({ ...prev, cardColor: color }))}
          onNext={(selectedCorners) => {
            setCorners(selectedCorners);
            setCurrentStep(3);
          }}
        />
      )}

      {currentStep === 3 && (
        <Step3Scale
          cardSizeMm={analysisState.cardSizeMm}
          onChangeCardSize={(size) => setAnalysisState((prev) => ({ ...prev, cardSizeMm: size }))}
          dpi={analysisState.dpi}
          onNext={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <Step4Sensitivity
          sensitivity={analysisState.sensitivity}
          onChangeSensitivity={(sens) => setAnalysisState((prev) => ({ ...prev, sensitivity: sens }))}
          method={method}
          onChangeMethod={(m) => setMethod(m)}
          minDropletUm={minDropletUm}
          onChangeMinDropletUm={(val) => setMinDropletUm(val)}
          discardBorder={discardBorder}
          onChangeDiscardBorder={(val) => setDiscardBorder(val)}
          binaryMaskDataUrl={binaryMaskDataUrl}
          isProcessing={isProcessing}
          onNext={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && (
        <Step5Result
          analysis={analysisState}
          fieldExperiments={fieldExperiments}
          onViewDroplets={() => setCurrentStep(6)}
          onAdjustCalibration={() => setCurrentStep(4)}
          onSaveToSample={(fieldId, sampleName) => {
            const final = { ...analysisState, fieldId, title: sampleName };
            onSaveAnalysis(final);
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
          onFinish={() => {
            onSaveAnalysis(analysisState);
            onCloseWizard();
          }}
        />
      )}
    </div>
  );
};
