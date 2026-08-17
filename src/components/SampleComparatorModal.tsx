import React, { useState, useMemo } from 'react';
import { X, Columns, Layers, CheckCircle2 } from 'lucide-react';
import { AnalysisData, CanopyPosition } from '../types';
import { calculateCanopyPenetration } from '../utils/sprayAnalytics';

interface SampleComparatorModalProps {
  analyses: AnalysisData[];
  initialSelectedIds?: string[];
  onClose: () => void;
}

/**
 * Modal para Comparação Lado a Lado de Amostras de Pulverização
 * e Avaliação Automatizada de Penetração no Dossel Vegetal (Topo, Médio, Baixeiro).
 */
export const SampleComparatorModal: React.FC<SampleComparatorModalProps> = ({
  analyses,
  initialSelectedIds = [],
  onClose,
}) => {
  // Até 3 amostras para comparação lado a lado
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedIds.length > 0) return initialSelectedIds.slice(0, 3);
    return analyses.slice(0, 2).map((a) => a.id);
  });

  const [customPositions, setCustomPositions] = useState<Record<string, CanopyPosition>>(() => {
    const map: Record<string, CanopyPosition> = {};
    analyses.forEach((a) => {
      if (a.canopyPosition) map[a.id] = a.canopyPosition;
    });
    return map;
  });

  // Amostras selecionadas ativas com memoização
  const selectedAnalyses = useMemo(() => {
    return selectedIds
      .map((id) => analyses.find((a) => a.id === id))
      .filter((a): a is AnalysisData => Boolean(a));
  }, [selectedIds, analyses]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        // Substitui a última se já tiver 3
        setSelectedIds([selectedIds[0], selectedIds[1], id]);
      }
    }
  };

  const setPosition = (analysisId: string, pos: CanopyPosition) => {
    setCustomPositions((prev) => ({ ...prev, [analysisId]: pos }));
  };

  // Avaliação da penetração foliar
  const canopyEvaluation = useMemo(() => {
    const topo = selectedAnalyses.find(
      (a) => (customPositions[a.id] || a.canopyPosition) === 'topo'
    );
    const baixeiro = selectedAnalyses.find(
      (a) => (customPositions[a.id] || a.canopyPosition) === 'baixeiro'
    );

    if (!topo || !baixeiro) return null;

    return {
      topo,
      baixeiro,
      result: calculateCanopyPenetration(topo.density, baixeiro.density),
    };
  }, [selectedAnalyses, customPositions]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/60 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
                Comparador de Amostras & Dossel
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                  {selectedAnalyses.length}/3 Amostras
                </span>
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                Compare a deposição lado a lado e avalie a penetração foliar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comparador"
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Sample Picker Selector */}
          <section className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Selecione as amostras para comparar (máximo 3):
            </span>
            <div className="flex flex-wrap gap-2">
              {analyses.map((ana) => {
                const isSelected = selectedIds.includes(ana.id);
                const pos = customPositions[ana.id] || ana.canopyPosition || 'livre';

                return (
                  <button
                    key={ana.id}
                    type="button"
                    onClick={() => toggleSelect(ana.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs'
                        : 'border-outline-variant hover:border-outline text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span>{ana.title || 'Amostra'}</span>
                    {pos !== 'livre' && (
                      <span className="text-[9px] uppercase px-1 rounded bg-surface font-bold">
                        {pos}
                      </span>
                    )}
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Canopy Penetration Diagnostic Banner (se houver Topo + Baixeiro) */}
          {canopyEvaluation && (
            <section
              className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                canopyEvaluation.result.classification === 'excelente'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-200'
                  : canopyEvaluation.result.classification === 'moderada'
                    ? 'bg-amber-100/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700/60 text-red-950 dark:text-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Perfil de Penetração no Dossel
                </h3>
                {canopyEvaluation.result.penetrationRate !== null && (
                  <span className="font-black text-sm">{canopyEvaluation.result.penetrationRate}% de Penetração</span>
                )}
              </div>

              <p className="text-xs leading-relaxed">
                {canopyEvaluation.result.message}
              </p>
            </section>
          )}

          {/* Side by Side Comparative Grid */}
          <div className={`grid grid-cols-1 ${selectedAnalyses.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
            {selectedAnalyses.map((ana, idx) => {
              const currentPos = customPositions[ana.id] || ana.canopyPosition || 'livre';

              return (
                <div
                  key={ana.id}
                  className="bg-surface-container border border-outline-variant rounded-2xl p-4 flex flex-col gap-4 shadow-sm"
                >
                  {/* Card Header & Position Selector */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-outline-variant/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        Amostra #{idx + 1}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {ana.date}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-on-surface truncate">
                      {ana.title || 'Amostra'}
                    </h3>

                    {/* Canopy Selector Pills */}
                    <div className="flex items-center gap-1 mt-1">
                      {(['topo', 'medio', 'baixeiro', 'livre'] as CanopyPosition[]).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setPosition(ana.id, pos)}
                          className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                            currentPos === pos
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail Preview */}
                  {ana.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-black/10 border border-outline-variant/40 flex items-center justify-center">
                      <img
                        src={ana.rectifiedImageUrl || ana.imageUrl}
                        alt={ana.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Key Metrics */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Densidade:</span>
                      <strong className="text-primary text-sm font-black">
                        {ana.density} <span className="text-[10px] font-normal text-on-surface-variant">gotas/cm²</span>
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Cobertura:</span>
                      <strong className="text-on-surface font-bold">
                        {ana.coveragePercent}%
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">DMV (DV0,5):</span>
                      <strong className="text-on-surface font-bold">
                        {ana.vmdUm} µm
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Espectro ASABE:</span>
                      <span className="text-[11px] font-bold text-on-surface">
                        {ana.asabeCategory}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-outline-variant/40">
                      <span className="text-on-surface-variant">Dispersão (Span):</span>
                      <strong className="text-on-surface font-bold">
                        {ana.span.toFixed(2)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-on-surface-variant">Volume Estimado:</span>
                      <strong className="text-on-surface font-bold">
                        {ana.estimatedVolumeLha} L/ha
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-outline-variant/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer shadow-sm hover:bg-primary-container"
          >
            Concluir Comparação
          </button>
        </div>
      </div>
    </div>
  );
};
