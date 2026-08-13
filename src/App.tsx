import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api, ApiAnalysis, AuthUser } from './api/client';
import { AuthView } from './components/AuthView';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { AnalysisWizard } from './components/wizard/AnalysisWizard';
import { TalhaoDetailView } from './components/TalhaoDetailView';
import { CalculatorsView } from './components/CalculatorsView';
import { MoreView } from './components/MoreView';
import { ActiveTab, AnalysisData, DEFAULT_NOZZLE_CRITERIA, FieldExperiment, NozzleCalibrationSession, NozzleCriteria } from './types';
import { sanitizeNozzleCriteria } from './utils/sprayAnalytics';

const EMPTY_NOZZLE_SESSION: NozzleCalibrationSession = {
  id: '', date: '', nozzleCount: 0, collectionTimeSec: 60, overallAvgMl: 0, flowAvgLmin: 0, maxDevPercent: 0, nozzles: [],
};

function experimentsFromAnalyses(analyses: ApiAnalysis[]): FieldExperiment[] {
  const grouped = new Map<string, FieldExperiment>();
  for (const analysis of analyses) {
    if (!analysis.fieldId) continue;
    const field = grouped.get(analysis.fieldId) ?? { id: analysis.fieldId, name: analysis.fieldName || 'Talhão sem nome', crop: analysis.crop || 'Não informado', date: analysis.date || '', samples: [] };
    field.samples.push({
      id: analysis.id,
      name: analysis.title,
      status: analysis.verdict === 'BOM' || analysis.verdict === 'GREET' ? 'Ideal' : analysis.verdict === 'REGULAR' ? 'Razoável' : analysis.verdict === 'EXCESSO' ? 'Excesso' : 'Ruim',
      density: analysis.density, coverage: analysis.coveragePercent, span: analysis.span,
    });
    grouped.set(field.id, field);
  }
  return Array.from(grouped.values());
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisData | null>(null);
  const [preselectedFieldId, setPreselectedFieldId] = useState<string | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('spray_dark_mode') === 'true');
  const [storageError, setStorageError] = useState('');
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisData[]>([]);
  const [fieldExperiments, setFieldExperiments] = useState<FieldExperiment[]>([]);
  const [nozzleSession, setNozzleSession] = useState<NozzleCalibrationSession>(EMPTY_NOZZLE_SESSION);
  const [nozzleCriteria, setNozzleCriteria] = useState<NozzleCriteria>(() => {
    const saved = localStorage.getItem('spray_nozzle_criteria');
    return sanitizeNozzleCriteria(saved ? JSON.parse(saved) : null);
  });

  useEffect(() => {
    api.getMe().then(async ({ user }) => {
      if (user) {
        const { analyses } = await api.listAnalyses();
        setRecentAnalyses(analyses);
        setFieldExperiments(experimentsFromAnalyses(analyses));
      }
      setAuthUser(user);
    }).catch((error: unknown) => {
      setAuthError(error instanceof Error && error.message === 'BANCO_INDISPONIVEL' ? 'O banco Neon ainda não está configurado neste ambiente.' : 'Não foi possível validar a sessão.');
    }).finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('spray_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    try { localStorage.setItem('spray_nozzle_criteria', JSON.stringify(nozzleCriteria)); }
    catch { setStorageError('Não foi possível salvar as preferências locais.'); }
  }, [nozzleCriteria]);

  const toggleDarkMode = () => {
    document.documentElement.classList.add('theme-switching');
    setIsDarkMode((previous) => !previous);
    window.setTimeout(() => document.documentElement.classList.remove('theme-switching'), 120);
  };

  const handleStartNewAnalysis = (fieldId?: string) => { setSelectedAnalysis(null); setPreselectedFieldId(fieldId); setIsWizardOpen(true); };
  const handleSelectAnalysis = (analysis: AnalysisData) => { setSelectedAnalysis(analysis); setPreselectedFieldId(analysis.fieldId); setIsWizardOpen(true); };

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      await api.deleteAnalysis(analysisId);
      setRecentAnalyses((previous) => previous.filter((analysis) => analysis.id !== analysisId));
      setFieldExperiments((previous) => previous.map((field) => ({ ...field, samples: field.samples.filter((sample) => sample.id !== analysisId) })).filter((field) => field.samples.length > 0));
    } catch { alert('Não foi possível excluir a análise.'); }
  };

  const handleSaveNewAnalysis = async (newAnalysis: AnalysisData) => {
    const { analysis } = await api.createAnalysis(newAnalysis);
    setRecentAnalyses((previous) => [analysis, ...previous.filter((item) => item.id !== analysis.id)]);
    setFieldExperiments((previous) => {
      if (!newAnalysis.fieldId) return previous;
      const source = previous.find((field) => field.id === newAnalysis.fieldId);
      if (!source) return previous;
      const sample = { id: analysis.id, name: analysis.title, status: analysis.verdict === 'BOM' ? 'Ideal' as const : analysis.verdict === 'REGULAR' ? 'Razoável' as const : analysis.verdict === 'EXCESSO' ? 'Excesso' as const : 'Ruim' as const, density: analysis.density, coverage: analysis.coveragePercent, span: analysis.span };
      return previous.map((field) => field.id === source.id ? { ...field, samples: [sample, ...field.samples] } : field);
    });
  };

  const handleAddNewField = (name: string, crop: string) => setFieldExperiments((previous) => [{ id: `exp-${Date.now()}`, name, crop: crop || 'Não informado', date: new Date().toLocaleDateString('pt-BR'), samples: [] }, ...previous]);
  const handleDeleteField = (fieldId: string) => setFieldExperiments((previous) => previous.filter((field) => field.id !== fieldId));
  const handleDeleteSample = (fieldId: string, sampleId: string) => setFieldExperiments((previous) => previous.map((field) => field.id === fieldId ? { ...field, samples: field.samples.filter((sample) => sample.id !== sampleId) } : field));

  const handleClearData = () => {
    setNozzleSession(EMPTY_NOZZLE_SESSION);
    setNozzleCriteria(DEFAULT_NOZZLE_CRITERIA);
    localStorage.removeItem('spray_nozzle_session');
    alert('Preferências locais limpas. As análises da sua conta permanecem no Neon.');
  };

  const handleAuthenticated = async (user: AuthUser) => {
    const { analyses } = await api.listAnalyses();
    setRecentAnalyses(analyses);
    setFieldExperiments(experimentsFromAnalyses(analyses));
    setAuthError('');
    setAuthUser(user);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setAuthUser(null); setRecentAnalyses([]); setFieldExperiments([]); setIsWizardOpen(false);
  };

  const handleShareReport = async () => {
    const text = fieldExperiments.map((field) => `${field.name} (${field.crop}) — ${field.samples.length} amostra(s)`).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Relatório de Talhões', text });
      else { await navigator.clipboard.writeText(text); alert('Relatório copiado para a área de transferência!'); }
    } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) alert('Não foi possível compartilhar o relatório.'); }
  };

  const getPageHeaderTitle = () => ({ home: 'Gotas 2', analysis: 'Gotas 2', experiments: 'Experimentos & Talhões', calculators: 'Calculadoras Agrícolas', more: 'Ajustes & Mais' }[activeTab]);

  if (authLoading) return <div className="min-h-screen bg-surface dark:bg-background flex items-center justify-center text-primary font-semibold">Validando sua conta…</div>;
  if (!authUser) return <AuthView onAuthenticated={handleAuthenticated} initialError={authError} />;

  return <div className="min-h-screen bg-surface dark:bg-background text-on-surface antialiased flex flex-col font-corpo selection:bg-primary-container selection:text-on-primary-container">
    {storageError && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,26rem)] bg-error-container text-on-error-container border border-error/40 rounded-xl p-3 shadow-lg flex items-start gap-2.5"><AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" /><span className="text-[11px] leading-relaxed flex-1">{storageError}</span><button onClick={() => setStorageError('')} aria-label="Fechar aviso">×</button></div>}
    {isWizardOpen ? <AnalysisWizard fieldExperiments={fieldExperiments} initialAnalysis={selectedAnalysis} preselectedFieldId={preselectedFieldId} onCloseWizard={() => { setIsWizardOpen(false); setSelectedAnalysis(null); setPreselectedFieldId(undefined); }} onSaveAnalysis={handleSaveNewAnalysis} /> : <>
      <Header title={getPageHeaderTitle()} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} showShare={activeTab === 'experiments'} onShare={handleShareReport} />
      {activeTab === 'home' && <HomeView recentAnalyses={recentAnalyses} onStartNewAnalysis={() => handleStartNewAnalysis()} onSelectAnalysis={handleSelectAnalysis} onDeleteAnalysis={handleDeleteAnalysis} />}
      {activeTab === 'analysis' && <HomeView recentAnalyses={recentAnalyses} onStartNewAnalysis={() => handleStartNewAnalysis()} onSelectAnalysis={handleSelectAnalysis} onDeleteAnalysis={handleDeleteAnalysis} />}
      {activeTab === 'experiments' && <TalhaoDetailView experiments={fieldExperiments} onAddSampleToField={(fieldId) => handleStartNewAnalysis(fieldId)} onAddNewField={handleAddNewField} onDeleteField={handleDeleteField} onDeleteSample={handleDeleteSample} />}
      {activeTab === 'calculators' && <CalculatorsView nozzleSession={nozzleSession} onSaveNozzleSession={setNozzleSession} nozzleCriteria={nozzleCriteria} />}
      {activeTab === 'more' && <MoreView isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} onClearData={handleClearData} recentAnalyses={recentAnalyses} nozzleCriteria={nozzleCriteria} onChangeNozzleCriteria={(criteria) => setNozzleCriteria(sanitizeNozzleCriteria(criteria))} userName={authUser.name} onLogout={handleLogout} />}
      <BottomNav activeTab={activeTab} onChangeTab={(tab) => tab === 'analysis' ? handleStartNewAnalysis() : (setActiveTab(tab), setIsWizardOpen(false))} />
    </>}
  </div>;
}
