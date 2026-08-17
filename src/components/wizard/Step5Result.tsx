import React, { useState } from 'react';
import {
  AlertTriangle,
  Image as ImageIcon,
  ChevronRight,
  Save,
  SlidersHorizontal,
  FileText,
  Download,
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

  const hasSourceImage = Boolean(analysis.imageUrl);
  const quality = analysis.measurementQuality ?? {
    status: 'INCONCLUSIVA' as const,
    effectiveDpi: 0,
    orientationCorrected: false,
    coverageReliable: false,
    countDensityReliable: false,
    sizeVolumeReliable: false,
    warnings: ['Análise anterior sem metadados suficientes para avaliar a confiabilidade.'],
    algorithmVersion: 'legacy',
  };
  const qualityTitle = quality.status === 'ADEQUADA'
    ? 'LEITURA TECNICAMENTE ADEQUADA'
    : quality.status === 'LIMITADA'
      ? 'LEITURA COM LIMITAÇÕES'
      : 'LEITURA INCONCLUSIVA';
  const qualityClass = quality.status === 'ADEQUADA'
    ? 'bg-quality-good'
    : quality.status === 'LIMITADA'
      ? 'bg-quality-regular'
      : 'bg-quality-poor';

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
        {/* Qualidade técnica da medição — não é um veredito agronômico. */}
        <section className={`w-full min-h-[104px] p-4 rounded-xl text-white shadow-sm ${qualityClass}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="font-bold text-base tracking-wide">{qualityTitle}</h2>
          </div>
          <p className="text-xs opacity-95 leading-relaxed">
            Resolução efetiva: {quality.effectiveDpi || 'não registrada'} dpi · algoritmo {quality.algorithmVersion}.
            Este status avalia a possibilidade de medir a imagem; não determina se a aplicação foi boa ou ruim.
          </p>
        </section>

        {quality.warnings.length > 0 && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
            <h3 className="text-xs font-bold text-on-surface mb-2">Limites desta leitura</h3>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-on-surface-variant leading-relaxed">
              {quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        )}

        {quality.captureQuality && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-xs font-bold text-on-surface">Sinais da captura</h3>
              <span className="text-[10px] font-semibold text-on-surface-variant">informativos</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mb-3">
              Estes números ajudam a comparar imagens, mas ainda não têm limites calibrados para bloquear uma captura.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-surface-container-low p-2">
                <span className="block text-on-surface-variant">Cartão no quadro</span>
                <strong className="text-on-surface">{quality.captureQuality.cardOccupancyPercent.toLocaleString('pt-BR')}%</strong>
              </div>
              <div className="rounded-lg bg-surface-container-low p-2">
                <span className="block text-on-surface-variant">Nitidez (Laplaciano)</span>
                <strong className="text-on-surface">{quality.captureQuality.focusLaplacianVariance.toLocaleString('pt-BR')}</strong>
              </div>
              <div className="rounded-lg bg-surface-container-low p-2">
                <span className="block text-on-surface-variant">Variação de luz</span>
                <strong className="text-on-surface">{quality.captureQuality.illuminationVariationPercent.toLocaleString('pt-BR')}%</strong>
              </div>
              <div className="rounded-lg bg-surface-container-low p-2">
                <span className="block text-on-surface-variant">Altas luzes neutras</span>
                <strong className="text-on-surface">{quality.captureQuality.highlightPixelPercent.toLocaleString('pt-BR')}%</strong>
              </div>
              <div className="rounded-lg bg-surface-container-low p-2">
                <span className="block text-on-surface-variant">Pixels escuros</span>
                <strong className="text-on-surface">{quality.captureQuality.darkPixelPercent.toLocaleString('pt-BR')}%</strong>
              </div>
            </div>
          </section>
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
            </div>
          </section>
        )}

        {/* Alerta de Excesso e Risco de Escorrimento (> 75%) */}
        {analysis.coveragePercent >= 75 && (
          <section className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/40 shadow-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-error">
                Alerta Crítico: Excesso / Risco de Escorrimento (≥ 75%)
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">
                A cobertura do alvo atingiu o ponto de saturação ({analysis.coveragePercent.toLocaleString('pt-BR')}%). Aplicações com cobertura excessiva provocam coalescência de gotas e escorrimento foliar para o solo, gerando perda econômica de calda e risco de fitotoxicidade.
              </p>
            </div>
          </section>
        )}

        {/* Acima de ~20% de cobertura as manchas se encostam com frequência, e um
            aglomerado é lido como uma única gota grande. A cobertura em si continua
            válida (é razão de pixels); contagem, DMV e span é que degradam. */}
        {/* Quality Metrics Cards */}
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            MEDIÇÕES DO CARTÃO
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Densidade de Gotas */}
            <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-on-surface">Densidade de gotas</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    analysis.density >= 50
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : analysis.density >= 25
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                        : 'bg-error-container text-on-error-container border border-error/20'
                  }`}>
                    {analysis.density >= 50 ? 'Bom (≥50)' : analysis.density >= 25 ? 'Intermediário (25-50)' : 'Insuficiente (<25)'}
                  </span>
                  {!quality.countDensityReliable && <span className="text-[10px] font-bold text-quality-regular">LIMITADA</span>}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-3xl text-primary">{analysis.density.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-on-surface-variant font-medium">gotas/cm²</span>
              </div>
            </div>

            {/* Cobertura */}
            <div className="border border-outline-variant rounded-lg p-4 shadow-sm bg-surface-container-lowest">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-on-surface">Cobertura</span>
                {!quality.coverageReliable && <span className="text-[10px] font-bold text-quality-poor">INCONCLUSIVA</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-3xl text-primary">
                  {analysis.coveragePercent.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs font-medium text-on-surface-variant">
                  %
                </span>
              </div>
            </div>

            {/* Span */}
            <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-on-surface">Dispersão (Span)</span>
                {!quality.sizeVolumeReliable && <span className="text-[10px] font-bold text-quality-regular">LIMITADA</span>}
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
                <span className="font-semibold text-on-surface">{analysis.vmdUm.toLocaleString('pt-BR')} µm</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3.5">
              <span className="font-medium text-on-surface">Volume estimado*</span>
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

            {analysis.canopyPosition && (
              <div className="flex justify-between items-center p-3.5">
                <span className="font-medium text-on-surface">Posição no Dossel</span>
                <span className="font-bold text-primary uppercase">{analysis.canopyPosition}</span>
              </div>
            )}

            {analysis.latitude !== undefined && analysis.longitude !== undefined && (
              <div className="flex justify-between items-center p-3.5">
                <span className="font-medium text-on-surface">Localização GPS</span>
                <span className="font-semibold text-on-surface text-xs font-mono">
                  {analysis.latitude.toFixed(4)}, {analysis.longitude.toFixed(4)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            *Estimativas de diâmetro e volume dependem da relação de espalhamento adotada e não equivalem a medição direta em laboratório.
          </p>
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
                  <span className="text-[10px] text-on-surface-variant">Relatório de medição em PDF</span>
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
