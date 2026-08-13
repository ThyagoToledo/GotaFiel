/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { AnalysisWizard } from './components/wizard/AnalysisWizard';
import { TalhaoDetailView } from './components/TalhaoDetailView';
import { CalculatorsView } from './components/CalculatorsView';
import { MoreView } from './components/MoreView';
import {
  ActiveTab,
  AnalysisData,
  FieldExperiment,
  NozzleCalibrationSession,
} from './types';
import {
  INITIAL_RECENT_ANALYSES,
  INITIAL_FIELD_EXPERIMENTS,
  INITIAL_NOZZLE_SESSION,
} from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisData | null>(null);
  // Talhão de origem quando o wizard é aberto de dentro de um talhão, para que o passo
  // de salvamento já venha com ele selecionado.
  const [preselectedFieldId, setPreselectedFieldId] = useState<string | undefined>(undefined);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('spray_dark_mode') === 'true';
  });

  // Data persistence state
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisData[]>(() => {
    const saved = localStorage.getItem('spray_recent_analyses');
    return saved ? JSON.parse(saved) : INITIAL_RECENT_ANALYSES;
  });

  const [fieldExperiments, setFieldExperiments] = useState<FieldExperiment[]>(() => {
    const saved = localStorage.getItem('spray_field_experiments');
    return saved ? JSON.parse(saved) : INITIAL_FIELD_EXPERIMENTS;
  });

  const [nozzleSession, setNozzleSession] = useState<NozzleCalibrationSession>(() => {
    const saved = localStorage.getItem('spray_nozzle_session');
    return saved ? JSON.parse(saved) : INITIAL_NOZZLE_SESSION;
  });

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('spray_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('spray_recent_analyses', JSON.stringify(recentAnalyses));
  }, [recentAnalyses]);

  useEffect(() => {
    localStorage.setItem('spray_field_experiments', JSON.stringify(fieldExperiments));
  }, [fieldExperiments]);

  useEffect(() => {
    localStorage.setItem('spray_nozzle_session', JSON.stringify(nozzleSession));
  }, [nozzleSession]);

  // Handlers
  const handleStartNewAnalysis = (fieldId?: string) => {
    setSelectedAnalysis(null);
    setPreselectedFieldId(fieldId);
    setIsWizardOpen(true);
  };

  const handleSelectAnalysis = (analysis: AnalysisData) => {
    setSelectedAnalysis(analysis);
    setPreselectedFieldId(analysis.fieldId);
    setIsWizardOpen(true);
  };

  const handleDeleteAnalysis = (analysisId: string) => {
    setRecentAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
  };

  const handleSaveNewAnalysis = (newAnalysis: AnalysisData) => {
    // Add to recents
    setRecentAnalyses((prev) => [
      newAnalysis,
      ...prev.filter((a) => a.id !== newAnalysis.id),
    ]);

    // If attached to a field experiment, add sample to that field
    if (newAnalysis.fieldId) {
      setFieldExperiments((prev) =>
        prev.map((field) => {
          if (field.id === newAnalysis.fieldId) {
            const newSample = {
              id: `samp-${Date.now()}`,
              name: newAnalysis.title || `Amostra ${field.samples.length + 1}`,
              status:
                newAnalysis.verdict === 'BOM'
                  ? ('Ideal' as const)
                  : newAnalysis.verdict === 'REGULAR'
                  ? ('Razoável' as const)
                  : ('Ruim' as const),
              density: newAnalysis.density,
              coverage: newAnalysis.coveragePercent,
              span: newAnalysis.span,
            };
            return {
              ...field,
              samples: [newSample, ...field.samples],
            };
          }
          return field;
        })
      );
    }
  };

  const handleAddNewField = (name: string, crop: string) => {
    const newField: FieldExperiment = {
      id: `exp-${Date.now()}`,
      name,
      crop: crop || 'Soja',
      date: 'Hoje',
      samples: [],
    };
    setFieldExperiments((prev) => [newField, ...prev]);
  };

  const handleDeleteField = (fieldId: string) => {
    setFieldExperiments((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const handleDeleteSample = (fieldId: string, sampleId: string) => {
    setFieldExperiments((prev) =>
      prev.map((field) => {
        if (field.id === fieldId) {
          return {
            ...field,
            samples: field.samples.filter((s) => s.id !== sampleId),
          };
        }
        return field;
      })
    );
  };

  const handleClearData = () => {
    setRecentAnalyses(INITIAL_RECENT_ANALYSES);
    setFieldExperiments(INITIAL_FIELD_EXPERIMENTS);
    setNozzleSession(INITIAL_NOZZLE_SESSION);
    localStorage.clear();
    alert('Dados restaurados para os valores padrão!');
  };

  const getPageHeaderTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Spray Analysis';
      case 'analysis':
        return 'Spray Analysis';
      case 'experiments':
        return 'Experimentos & Talhões';
      case 'calculators':
        return 'Calculadoras Agrícolas';
      case 'more':
        return 'Ajustes & Mais';
      default:
        return 'Spray Analysis';
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-background text-on-surface antialiased flex flex-col font-corpo selection:bg-primary-container selection:text-on-primary-container">
      {/* If Analysis Wizard is Open, render Wizard full screen */}
      {isWizardOpen ? (
        <AnalysisWizard
          fieldExperiments={fieldExperiments}
          initialAnalysis={selectedAnalysis}
          preselectedFieldId={preselectedFieldId}
          onCloseWizard={() => {
            setIsWizardOpen(false);
            setSelectedAnalysis(null);
            setPreselectedFieldId(undefined);
          }}
          onSaveAnalysis={handleSaveNewAnalysis}
        />
      ) : (
        <>
          {/* Main App Header */}
          <Header
            title={getPageHeaderTitle()}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            showShare={activeTab === 'experiments'}
            onShare={() => alert('Relatório compartilhado com sucesso!')}
          />

          {/* Main Content Body */}
          {activeTab === 'home' && (
            <HomeView
              recentAnalyses={recentAnalyses}
              onStartNewAnalysis={handleStartNewAnalysis}
              onSelectAnalysis={handleSelectAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
            />
          )}

          {activeTab === 'analysis' && (
            <HomeView
              recentAnalyses={recentAnalyses}
              onStartNewAnalysis={handleStartNewAnalysis}
              onSelectAnalysis={handleSelectAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
            />
          )}

          {activeTab === 'experiments' && (
            <TalhaoDetailView
              experiments={fieldExperiments}
              onAddSampleToField={(fieldId) => {
                handleStartNewAnalysis(fieldId);
              }}
              onAddNewField={handleAddNewField}
              onDeleteField={handleDeleteField}
              onDeleteSample={handleDeleteSample}
            />
          )}

          {activeTab === 'calculators' && (
            <CalculatorsView
              nozzleSession={nozzleSession}
              onSaveNozzleSession={(updatedSession) => setNozzleSession(updatedSession)}
            />
          )}

          {activeTab === 'more' && (
            <MoreView
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              onClearData={handleClearData}
            />
          )}

          {/* Bottom Navigation for Mobile & Sidebar for Desktop */}
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              if (tab === 'analysis') {
                handleStartNewAnalysis();
              } else {
                setActiveTab(tab);
                setIsWizardOpen(false);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
