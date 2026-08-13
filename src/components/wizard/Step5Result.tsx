import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Image as ImageIcon,
  ChevronRight,
  Save,
  SlidersHorizontal,
  FileText,
  Download,
  Printer,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { AnalysisData, FieldExperiment } from '../../types';

interface Step5ResultProps {
  analysis: AnalysisData;
  fieldExperiments: FieldExperiment[];
  preselectedFieldId?: string;
  onViewDroplets: () => void;
  onSaveToSample: (fieldId: string, sampleName: string) => Promise<void> | void;
  onAdjustCalibration: () => void;
}

export const Step5Result: React.FC<Step5ResultProps> = ({
  analysis,
  fieldExperiments,
  preselectedFieldId,
  onViewDroplets,
  onSaveToSample,
  onAdjustCalibration,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  // Só aceita o talhão de origem se ele ainda existir na lista.
  const initialFieldId = fieldExperiments.some((f) => f.id === preselectedFieldId)
    ? (preselectedFieldId as string)
    : fieldExperiments[0]?.id || '';
  const [selectedFieldId, setSelectedFieldId] = useState(initialFieldId);

  // Próximo número de amostra do talhão, em vez de um número aleatório que sugeria
  // uma sequência inexistente ("Amostra 7" num talhão com 2 amostras).
  const defaultSampleName = (fieldId: string) => {
    const field = fieldExperiments.find((f) => f.id === fieldId);
    return `Amostra ${(field?.samples.length ?? 0) + 1}`;
  };
  const [sampleNameInput, setSampleNameInput] = useState(defaultSampleName(initialFieldId));
  const [pdfGeneratedToast, setPdfGeneratedToast] = useState(false);
  const [csvGeneratedToast, setCsvGeneratedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isRunoff = analysis.verdict === 'EXCESSO';
  const isGood = analysis.verdict === 'BOM';
  const isRegular = analysis.verdict === 'REGULAR';
  const hasSourceImage = Boolean(analysis.imageUrl);

  // Import dinâmico: o jsPDF (~200 kB gzip com dependências) só carrega quando o
  // usuário pede um relatório, não no carregamento inicial do app.
  const handleGeneratePdf = async () => {
    try {
      const { generateAnalysisPdfReport } = await import('../../utils/generatePdfReport');
      generateAnalysisPdfReport(analysis);
      setPdfGeneratedToast(true);
      setTimeout(() => setPdfGeneratedToast(false), 3500);
    } catch (err) {
      console.error('Erro ao gerar relatório PDF:', err);
      alert('Atenção: Não é possível gerar relatório com métricas inválidas.');
    }
  };

  const handleGenerateCsv = async () => {
    try {
      const { downloadAnalysisCsv } = await import('../../utils/generateCsvReport');
      downloadAnalysisCsv(analysis);
      setCsvGeneratedToast(true);
      setTimeout(() => setCsvGeneratedToast(false), 3500);
    } catch (err) {
      console.error('Erro ao gerar relatório CSV:', err);
      alert('Atenção: Não é possível exportar CSV com métricas inválidas.');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-32 px-4 pt-4">
      {/* Step Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>5 de 6</span>
          <span>Resultado da Análise</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
        </div>
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-5">
        {/* Verdict Banner */}
        {isRunoff ? (
          <section className="w-full bg-quality-runoff min-h-[110px] p-4 rounded-xl flex flex-col justify-center text-on-error shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-7 h-7 text-white fill-white/20 shrink-0" />
              <h2 className="font-bold text-lg tracking-wide uppercase">EXCESSO / ESCORRIMENTO</h2>
            </div>
            <p className="text-sm opacity-90 leading-snug">
              {analysis.verdictMessage ||
                `Cobertura de ${analysis.coveragePercent}%. Indica excesso de volume ou gotas muito grandes. Risco de perda.`}
            </p>
          </section>
        ) : (
          <div
            className={`w-full min-h-[88px] rounded-xl flex items-center justify-between px-5 text-white shadow-sm ${
              isGood ? 'bg-quality-good' : isRegular ? 'bg-quality-regular' : 'bg-quality-poor'
            }`}
          >
            <div className="flex items-center gap-3">
              {isGood ? (
                <CheckCircle2 className="w-9 h-9 fill-white text-quality-good shrink-0" />
              ) : (
                <AlertTriangle className="w-9 h-9 fill-white text-quality-regular shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-xl uppercase tracking-wider">
                  {analysis.verdict}
                </span>
                <span className="text-xs opacity-90">Análise concluída</span>
              </div>
            </div>

            <div className="font-bold text-3xl">
              {analysis.verdictScore}
              <span className="text-sm font-normal opacity-80">/100</span>
            </div>
          </div>
        )}

        {/* Analyzed Image Preview (If runoff or standard) */}
        {hasSourceImage && (
          <section className="mt-1">
            <span className="mb-2 block text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
              Imagem analisada
            </span>
            <div
              className="w-full aspect-[4/3] bg-cover bg-center rounded-lg border border-outline-variant relative overflow-hidden shadow-sm"
              style={{ backgroundImage: `url('${analysis.imageUrl}')` }}
            >
              {isRunoff && <div className="absolute inset-2 border border-quality-runoff/40 rounded flex items-center justify-center">
                <div className="w-6 h-6 border-t-2 border-l-2 border-quality-runoff absolute top-0 left-0" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-quality-runoff absolute top-0 right-0" />
                <div className="w-6 h-6 border-b-2 border-l-2 border-quality-runoff absolute bottom-0 left-0" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-quality-runoff absolute bottom-0 right-0" />
              </div>}
            </div>
          </section>
        )}

        {/* Acima de ~20% de cobertura as manchas se encostam com frequência, e um
            aglomerado é lido como uma única gota grande. A cobertura em si continua
            válida (é razão de pixels); contagem, DMV e span é que degradam. */}
        {analysis.coveragePercent > 20 && (
          <section className="rounded-2xl border border-quality-regular/40 bg-quality-regular/10 p-4 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-quality-regular shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-on-surface">
                Cobertura alta: contagem e espectro pouco confiáveis
              </span>
              <span className="text-[11px] text-on-surface-variant leading-relaxed">
                Com {analysis.coveragePercent}% de cobertura, muitas gotas se sobrepõem e são
                contadas como uma só. A cobertura continua confiável; já a densidade, o DMV e o
                span tendem a ficar, respectivamente, subestimada e superestimados.
              </span>
            </div>
          </section>
        )}

        {/* Quality Metrics Cards */}
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            O QUE DEFINE A QUALIDADE
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Densidade de Gotas */}
            <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-on-surface">Densidade de gotas</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-quality-good" />
                  <div className="w-2 h-2 rounded-full bg-quality-good" />
                  <div className="w-2 h-2 rounded-full bg-quality-good" />
                  <div className="w-2 h-2 rounded-full bg-outline-variant" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-3xl text-primary">{analysis.density.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-on-surface-variant font-medium">gotas/cm²</span>
              </div>
            </div>

            {/* Cobertura */}
            <div
              className={`border rounded-lg p-4 shadow-sm ${
                isRunoff
                  ? 'border-2 border-quality-runoff bg-error-container'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-sm font-medium ${
                    isRunoff ? 'text-on-error-container font-bold' : 'text-on-surface'
                  }`}
                >
                  Cobertura
                </span>
                <div className="flex gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunoff ? 'bg-quality-runoff' : 'bg-cartao-amarelo'
                    }`}
                  />
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunoff ? 'bg-quality-runoff' : 'bg-cartao-amarelo'
                    }`}
                  />
                  <div className="w-2 h-2 rounded-full bg-outline-variant" />
                  <div className="w-2 h-2 rounded-full bg-outline-variant" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-bold text-3xl ${
                    isRunoff ? 'text-quality-runoff' : 'text-primary'
                  }`}
                >
                  {analysis.coveragePercent.toLocaleString('pt-BR')}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isRunoff ? 'text-quality-runoff' : 'text-on-surface-variant'
                  }`}
                >
                  %
                </span>
              </div>
            </div>

            {/* Span */}
            <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-on-surface">Dispersão (Span)</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-quality-great" />
                  <div className="w-2 h-2 rounded-full bg-quality-great" />
                  <div className="w-2 h-2 rounded-full bg-quality-great" />
                  <div className="w-2 h-2 rounded-full bg-quality-great" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-3xl text-primary">{analysis.span.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Context Table Section */}
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            CONTEXTO TÉCNICO
          </h2>
          <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden shadow-sm divide-y divide-outline-variant/60 text-sm">
            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">Total de gotas</span>
              <span className="font-semibold text-on-surface">{analysis.totalDroplets.toLocaleString('pt-BR')}</span>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">DMV (DV0,5)</span>
              <div className="flex items-center gap-2">
                <span className="bg-asabe-coarse text-white text-xs font-semibold px-2 py-0.5 rounded">
                  {analysis.asabeCategory}
                </span>
                <span className="font-semibold text-on-surface">{analysis.vmdUm.toLocaleString('pt-BR')} µm</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">Volume Estimado</span>
              <span className="font-semibold text-on-surface">
                {analysis.estimatedVolumeLha.toLocaleString('pt-BR')} L/ha
              </span>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">DV0,1</span>
              <span className="font-semibold text-on-surface">{analysis.dv01Um.toLocaleString('pt-BR')} µm</span>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">DV0,9</span>
              <span className="font-semibold text-on-surface">{analysis.dv09Um.toLocaleString('pt-BR')} µm</span>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">Dimensões do Cartão</span>
              <span className="font-semibold text-on-surface">{analysis.cardSizeMm.width} × {analysis.cardSizeMm.height} mm</span>
            </div>
          </div>
        </section>

        {/* Export PDF & CSV Report Actions */}
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/30 rounded-2xl hover:bg-primary/20 transition-all cursor-pointer shadow-xs active:scale-[0.99] group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">Relatório PDF</span>
                  <span className="text-[10px] text-on-surface-variant">Laudo completo em PDF</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-primary shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleGenerateCsv}
              className="flex items-center justify-between p-3.5 bg-secondary-container/50 border border-secondary-fixed rounded-2xl hover:bg-secondary-container transition-all cursor-pointer shadow-xs active:scale-[0.99] group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">Exportar CSV</span>
                  <span className="text-[10px] text-on-surface-variant">Formato GOTAS (;)</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-secondary shrink-0" />
            </button>
          </div>

          {/* Toast Notifications */}
          {pdfGeneratedToast && (
            <div className="bg-primary text-on-primary text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Relatório PDF baixado com sucesso!</span>
              </div>
            </div>
          )}

          {csvGeneratedToast && (
            <div className="bg-secondary text-on-secondary text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Arquivo CSV baixado com sucesso!</span>
              </div>
            </div>
          )}
        </section>

        {/* Expandable Action: Ver gotas detectadas */}
        {hasSourceImage && <section>
          <button
            type="button"
            onClick={onViewDroplets}
            className="w-full flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl hover:bg-surface-container transition-colors cursor-pointer shadow-xs active:opacity-80"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-on-surface">Ver gotas detectadas (Inspecionar)</span>
            </div>
            <ChevronRight className="w-5 h-5 text-on-surface-variant" />
          </button>
        </section>}
      </div>

      {/* Bottom Action Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-40">
        <div className="max-w-md mx-auto flex gap-2">
          <button
            type="button"
            onClick={handleGeneratePdf}
            className="h-[52px] px-3.5 bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Baixar Relatório PDF"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={onAdjustCalibration}
            disabled={!hasSourceImage || Boolean(analysis.remoteOnly)}
            className="flex-1 h-[52px] bg-transparent text-primary font-bold text-xs sm:text-sm rounded-xl border border-outline-variant flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Calibrar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            disabled={Boolean(analysis.remoteOnly)}
            className="flex-[2] h-[52px] bg-primary text-on-primary font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Amostra</span>
          </button>
        </div>
      </div>

      {/* Modal to Save to Sample Field */}
      {showSaveModal && !analysis.remoteOnly && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl p-5 max-w-sm w-full border border-outline-variant shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-lg text-on-surface">Salvar Amostra no Talhão</h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant">Selecione o Talhão</label>
              <select
                value={selectedFieldId}
                onChange={(e) => {
                  setSelectedFieldId(e.target.value);
                  // Segue a numeração do talhão escolhido, sem sobrescrever um nome
                  // que o usuário já digitou manualmente.
                  setSampleNameInput((prev) =>
                    /^Amostra \d+$/.test(prev) ? defaultSampleName(e.target.value) : prev
                  );
                }}
                className="w-full h-11 border border-outline-variant rounded-lg px-3 bg-surface text-on-surface text-sm"
              >
                <option value="">Sem talhão</option>
                {fieldExperiments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.crop})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant">Nome da Amostra</label>
              <input
                type="text"
                value={sampleNameInput}
                onChange={(e) => setSampleNameInput(e.target.value)}
                className="w-full h-11 border border-outline-variant rounded-lg px-3 bg-surface text-on-surface text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSaveToSample(selectedFieldId, sampleNameInput);
                    setShowSaveModal(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="px-5 py-2 text-sm bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-container"
              >
                {isSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
