import React, { useState } from 'react';
import { Header } from '../Header';
import { Step1Capture } from './Step1Capture';
import { Step2Crop } from './Step2Crop';
import { Step3Scale } from './Step3Scale';
import { Step4Sensitivity } from './Step4Sensitivity';
import { Step5Result } from './Step5Result';
import { Step6Inspection } from './Step6Inspection';
import { AnalysisData, CardColor, DropletItem, FieldExperiment } from '../../types';
import { SAMPLE_CARD_IMAGES, generateMockDroplets } from '../../data/mockData';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';

interface AnalysisWizardProps {
  fieldExperiments: FieldExperiment[];
  initialAnalysis?: AnalysisData | null;
  onCloseWizard: () => void;
  onSaveAnalysis: (analysis: AnalysisData) => void;
}

export const AnalysisWizard: React.FC<AnalysisWizardProps> = ({
  fieldExperiments,
  initialAnalysis,
  onCloseWizard,
  onSaveAnalysis,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialAnalysis ? 5 : 1);

  const [analysisState, setAnalysisState] = useState<AnalysisData>(() => {
    if (initialAnalysis) return initialAnalysis;

    const baseAnalysis: AnalysisData = {
      id: `ana-${Date.now()}`,
      title: 'Talhão 4 — Amostra 3',
      date: 'Hoje',
      timestamp: Date.now(),
      imageUrl: SAMPLE_CARD_IMAGES.ideal,
      cardColor: 'Amarelo',
      cardSizeMm: { width: 76, height: 26 },
      dpi: 300,
      sensitivity: 0,
      totalDroplets: 1244,
      density: 62,
      coveragePercent: 18,
      span: 1.04,
      vmdUm: 346,
      dv01Um: 180,
      dv09Um: 540,
      estimatedVolumeLha: 2.26,
      verdict: 'BOM',
      verdictScore: 78,
      asabeCategory: 'Grossa',
      droplets: generateMockDroplets(28),
    };

    return recalculateAnalysisData(baseAnalysis);
  });

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
            setAnalysisState((prev) => recalculateAnalysisData({ ...prev, imageUrl: img }));
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <Step2Crop
          imageUrl={analysisState.imageUrl}
          cardColor={analysisState.cardColor}
          onChangeCardColor={(color) =>
            setAnalysisState((prev) => recalculateAnalysisData({ ...prev, cardColor: color }))
          }
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <Step3Scale
          cardSizeMm={analysisState.cardSizeMm}
          onChangeCardSize={(size) =>
            setAnalysisState((prev) => recalculateAnalysisData({ ...prev, cardSizeMm: size }))
          }
          dpi={analysisState.dpi}
          onNext={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <Step4Sensitivity
          sensitivity={analysisState.sensitivity}
          onChangeSensitivity={(sens) =>
            setAnalysisState((prev) => recalculateAnalysisData({ ...prev, sensitivity: sens }))
          }
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
