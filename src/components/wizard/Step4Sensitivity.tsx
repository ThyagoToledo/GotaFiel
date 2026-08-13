import React, { useState } from 'react';
import { Image as ImageIcon, ChevronDown, ChevronUp, BarChart2, Plus, Minus, Settings2, AlertTriangle } from 'lucide-react';
import { BinarizationMethod } from '../../core/types';

interface Step4SensitivityProps {
  sensitivity: number;
  onChangeSensitivity: (val: number) => void;
  method?: BinarizationMethod;
  onChangeMethod?: (m: BinarizationMethod) => void;
  minDropletUm?: number;
  onChangeMinDropletUm?: (val: number) => void;
  discardBorder?: boolean;
  onChangeDiscardBorder?: (val: boolean) => void;
  meanFilterPasses?: number;
  onChangeMeanFilterPasses?: (val: number) => void;
  fillHoles?: boolean;
  onChangeFillHoles?: (val: boolean) => void;
  binaryMaskDataUrl?: string;
  isProcessing?: boolean;
  detectedDroplets?: number;
  hasError?: boolean;
  onNext: () => void;
}

export const Step4Sensitivity: React.FC<Step4SensitivityProps> = ({
  sensitivity,
  onChangeSensitivity,
  method = 'chromatic',
  onChangeMethod,
  minDropletUm = 50,
  onChangeMinDropletUm,
  discardBorder = true,
  onChangeDiscardBorder,
  meanFilterPasses = 1,
  onChangeMeanFilterPasses,
  fillHoles = true,
  onChangeFillHoles,
  binaryMaskDataUrl,
  isProcessing = false,
  detectedDroplets,
  hasError = false,
  onNext,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [localMinDroplet, setLocalMinDroplet] = useState(minDropletUm);
  const [localDiscardBorder, setLocalDiscardBorder] = useState(discardBorder);
  const [localMethod, setLocalMethod] = useState<BinarizationMethod>(method);

  // Calculate percentage fills for custom visual tracks
  const sensPercent = Math.min(100, Math.max(0, sensitivity + 50));
  const dropPercent = Math.min(100, Math.max(0, ((localMinDroplet - 10) / (150 - 10)) * 100));

  const handleNudgeSensitivity = (delta: number) => {
    const nextVal = Math.min(50, Math.max(-50, sensitivity + delta));
    onChangeSensitivity(nextVal);
  };

  const handleNudgeMinDroplet = (delta: number) => {
    const nextVal = Math.min(150, Math.max(10, localMinDroplet + delta));
    setLocalMinDroplet(nextVal);
    onChangeMinDropletUm?.(nextVal);
  };

  const handleMethodChange = (m: BinarizationMethod) => {
    setLocalMethod(m);
    onChangeMethod?.(m);
  };

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-36 px-4 pt-4">
      {/* Step Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 4 de 6</span>
          <span>Ajuste de Detecção</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
        </div>
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-4">
        {/* Binary Mask Preview Card */}
        <section className="w-full h-[240px] relative rounded-2xl border-2 border-outline-variant bg-surface-container-low overflow-hidden flex flex-col shadow-sm">
          <div className="px-4 py-2 bg-surface-container-high border-b border-outline-variant flex justify-between items-center z-10">
            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              Prévia da Máscara Binária ({localMethod === 'chromatic' ? 'Cromático' : 'Compatível em cinza'})
            </h2>
          </div>
          <div className="flex-1 relative w-full h-full p-2 flex items-center justify-center bg-black">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center gap-2 text-cyan-400">
                <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold">Processando pixels...</span>
              </div>
            ) : binaryMaskDataUrl ? (
              <img src={binaryMaskDataUrl} alt="Prévia real de detecção de pulverização" className="w-full h-full object-contain rounded-lg transition-all duration-200" />
            ) : (
              <div className="px-5 text-center text-xs leading-relaxed text-white/80">A prévia real aparecerá depois que uma foto for processada.</div>
            )}
            {/* Live indicator tag */}
            <div className="absolute bottom-3 right-3 bg-primary text-on-primary text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-md border border-white/20">
              Sensibilidade: {sensitivity > 0 ? `+${sensitivity}` : sensitivity}
            </div>
          </div>
        </section>

        {/* Zero detections is indistinguishable from a clean card unless we say so.
            The legacy threshold in particular can reject every droplet on palettes
            where the stain is not much darker than the paper. */}
        {!isProcessing && !hasError && detectedDroplets === 0 && (
          <section className="p-3.5 rounded-2xl border border-error/40 bg-error-container text-on-error-container shadow-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold">Nenhuma gota detectada</span>
              <span className="text-[11px] leading-relaxed">
                {localMethod === 'gotas-legacy'
                  ? 'O método GOTAS (Cinza) só separa manchas bem mais escuras que o papel. Experimente o método Cromático, que é o indicado para gotas azuis.'
                  : 'Ajuste a sensibilidade para um valor negativo, reduza o tamanho mínimo de gota, ou refaça o corte do cartão no passo 2.'}
              </span>
            </div>
          </section>
        )}

        {/* Method Selector */}
        <section className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <Settings2 className="w-4 h-4 text-primary" />
            <span>Método de Binarização:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleMethodChange('chromatic')}
              className={`py-3 min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                localMethod === 'chromatic'
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant'
              }`}
            >
              Cromático (B - max)
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('gotas-legacy')}
              className={`py-3 min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                localMethod === 'gotas-legacy'
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant'
              }`}
            >
              Compatível em cinza
            </button>
          </div>
        </section>

        {/* Controls Section */}
        <section className="flex flex-col gap-3">
          {/* Sensitivity Slider Card */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <label htmlFor="sensitivity" className="text-sm font-bold text-on-surface block">
                  Sensibilidade do Limiar
                </label>
                <span className="text-[11px] text-on-surface-variant">
                  {/* Otsu only exists in the chromatic path. The legacy path uses the
                      historical GOTAS threshold ((max-min)+mean)/3, so naming Otsu there
                      would misdescribe what the slider actually shifts. */}
                  {localMethod === 'gotas-legacy'
                    ? 'Ajuste do limiar histórico GOTAS (-50 a +50)'
                    : 'Ajuste fino de Otsu (-50 a +50)'}
                </span>
              </div>
              <span className="font-extrabold text-xl text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                {sensitivity > 0 ? `+${sensitivity}` : sensitivity}
              </span>
            </div>

            {/* Slider with Stepper Buttons */}
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={() => handleNudgeSensitivity(-5)}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                title="Diminuir sensibilidade (-5)"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="relative flex-1 py-2">
                <input
                  id="sensitivity"
                  type="range"
                  min="-50"
                  max="50"
                  value={sensitivity}
                  onChange={(e) => onChangeSensitivity(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #006439 0%, #006439 ${sensPercent}%, #becabe ${sensPercent}%, #becabe 100%)`,
                  }}
                  className="w-full h-3 rounded-full cursor-pointer appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleNudgeSensitivity(5)}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                title="Aumentar sensibilidade (+5)"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[-30, -15, 0, 15, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeSensitivity(preset)}
                  className={`py-3 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sensitivity === preset
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/60'
                  }`}
                >
                  {preset === 0 ? '0' : preset > 0 ? `+${preset}` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Accordion */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span>Opções Avançadas de Filtro</span>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="w-5 h-5 text-on-surface-variant" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-outline-variant/60 flex flex-col gap-4 bg-surface-container-lowest text-xs">
                {/* Min Droplet Size */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center font-bold text-on-surface">
                    <span>Tamanho mínimo de gota:</span>
                    <span className="text-primary font-extrabold text-sm bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                      {localMinDroplet} µm
                    </span>
                  </div>

                  {/* Slider with Stepper Buttons */}
                  <div className="flex items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleNudgeMinDroplet(-5)}
                      className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative flex-1 py-1">
                      <input
                        type="range"
                        min="10"
                        max="150"
                        step="5"
                        value={localMinDroplet}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLocalMinDroplet(val);
                          onChangeMinDropletUm?.(val);
                        }}
                        style={{
                          background: `linear-gradient(to right, #006439 0%, #006439 ${dropPercent}%, #becabe ${dropPercent}%, #becabe 100%)`,
                        }}
                        className="w-full h-3 rounded-full cursor-pointer appearance-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNudgeMinDroplet(5)}
                      className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Droplet Chips */}
                  <div className="grid grid-cols-4 gap-1.5 mt-0.5">
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLocalMinDroplet(preset);
                          onChangeMinDropletUm?.(preset);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          localMinDroplet === preset
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {preset} µm
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Edges Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                  <div className="flex flex-col">
                    <span className="font-bold text-on-surface text-xs">Isolar gotas na borda</span>
                    <span className="text-[10px] text-on-surface-variant">Desconsiderar gotas cortadas no limite do cartão</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localDiscardBorder}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setLocalDiscardBorder(val);
                      onChangeDiscardBorder?.(val);
                    }}
                    className="w-5 h-5 text-primary rounded border-outline-variant accent-primary cursor-pointer"
                  />
                </div>

                {localMethod === 'gotas-legacy' && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/40">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface text-xs">Suavização 3 × 3</span>
                          <span className="text-[10px] text-on-surface-variant">Reduz variações locais antes do limiar em cinza</span>
                        </div>
                        <span className="text-xs font-bold text-primary">{meanFilterPasses} passagem(ns)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[0, 1, 2].map((passes) => (
                          <button
                            type="button"
                            key={passes}
                            onClick={() => onChangeMeanFilterPasses?.(passes)}
                            className={`min-h-[40px] rounded-lg text-xs font-bold border transition-colors ${
                              meanFilterPasses === passes
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-surface-container text-on-surface-variant border-outline-variant'
                            }`}
                          >
                            {passes === 0 ? 'Desligada' : `${passes}×`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-xs">Preencher buracos internos</span>
                        <span className="text-[10px] text-on-surface-variant">Une falhas claras totalmente cercadas pela mesma mancha</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={fillHoles}
                        onChange={(event) => onChangeFillHoles?.(event.target.checked)}
                        className="w-5 h-5 text-primary rounded border-outline-variant accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Fixed Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-40">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onNext}
            className="w-full h-[52px] bg-primary text-on-primary font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <BarChart2 className="w-5 h-5" />
            Analisar
          </button>
        </div>
      </div>
    </div>
  );
};
