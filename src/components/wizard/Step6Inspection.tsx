import React from 'react';
import { EyeOff, Info, RotateCcw, Check } from 'lucide-react';
import { AnalysisData, DropletItem } from '../../types';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';

interface Step6InspectionProps {
  analysis: AnalysisData;
  onUpdateDroplets: (updatedDroplets: DropletItem[]) => void;
  onFinish: () => void;
}

export const Step6Inspection: React.FC<Step6InspectionProps> = ({
  analysis,
  onUpdateDroplets,
  onFinish,
}) => {
  const toggleDroplet = (id: string) => {
    const updated = analysis.droplets.map((d) =>
      d.id === id ? { ...d, included: !d.included } : d
    );
    onUpdateDroplets(updated);
  };

  const restoreAllDroplets = () => {
    const updated = analysis.droplets.map((d) => ({ ...d, included: true }));
    onUpdateDroplets(updated);
  };

  const excludedCount = analysis.droplets.filter((d) => !d.included).length;

  // Recalculated stats in real time
  const recalculated = recalculateAnalysisData(analysis);

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-36">
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto px-4 pt-4 mb-2">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>6 de 6</span>
          <span>Inspeção Manual de Gotas</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
        </div>
      </div>

      {/* Main Inspection Canvas Area */}
      <div className="w-full relative bg-surface-variant h-72 border-b border-outline-variant shadow-inner overflow-hidden select-none">
        <img
          src={analysis.imageUrl}
          alt="Cartão para inspeção de gotas"
          className="w-full h-full object-cover"
        />

        {/* Overlay Droplets */}
        <div className="absolute inset-0">
          {analysis.droplets.map((drop) => {
            return (
              <div
                key={drop.id}
                onClick={() => toggleDroplet(drop.id)}
                style={{
                  left: `${drop.x}%`,
                  top: `${drop.y}%`,
                  width: `${drop.sizePx}px`,
                  height: `${drop.sizePx}px`,
                }}
                title={`Gota ${drop.diameterUm}µm - ${drop.included ? 'Incluída' : 'Excluída'}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-transform hover:scale-125 flex items-center justify-center ${
                  drop.included
                    ? 'border-2 border-[#E53935] bg-[#E53935]/10 shadow-sm'
                    : 'border-2 border-outline bg-outline/30 opacity-60'
                }`}
              >
                {!drop.included && <span className="text-[10px] text-outline font-bold">×</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls Area */}
      <div className="p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between p-3.5 border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm">
          <div className="flex items-center gap-2 text-on-surface">
            <EyeOff className="w-5 h-5 text-outline" />
            <span className="text-sm font-medium">{excludedCount} gotas excluídas</span>
          </div>

          <button
            onClick={restoreAllDroplets}
            disabled={excludedCount === 0}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar todas
          </button>
        </div>

        <div className="flex gap-2 items-start px-1 text-xs text-on-surface-variant">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-outline" />
          <p>Toque numa gota na imagem para incluir ou excluir da análise final.</p>
        </div>
      </div>

      {/* Bottom Recalculated Bar (Floating) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container border-t border-outline-variant shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto px-4 py-3 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            RESULTADO RECALCULADO
          </h3>

          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="font-bold text-2xl text-primary">
                {recalculated.totalDroplets.toLocaleString('pt-BR')}
                <span className="text-xs font-normal text-on-surface-variant ml-1">gotas</span>
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="font-bold text-2xl text-on-surface">
                {recalculated.coveragePercent}%
                <span className="text-xs font-normal text-on-surface-variant ml-1">cobertura</span>
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="font-bold text-2xl text-on-surface">
                {recalculated.span}
                <span className="text-xs font-normal text-on-surface-variant ml-1">Span</span>
              </span>
            </div>
          </div>

          <button
            onClick={onFinish}
            className="w-full h-11 bg-primary text-on-primary font-semibold text-sm rounded-lg flex items-center justify-center gap-2 mt-1 hover:bg-primary-container active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" />
            Concluir e Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
