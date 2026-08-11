import React, { useState } from 'react';
import { Image as ImageIcon, ChevronDown, ChevronUp, BarChart2, Plus, Minus, RotateCcw } from 'lucide-react';
import { SAMPLE_CARD_IMAGES } from '../../data/mockData';

interface Step4SensitivityProps {
  sensitivity: number;
  onChangeSensitivity: (val: number) => void;
  onNext: () => void;
}

export const Step4Sensitivity: React.FC<Step4SensitivityProps> = ({
  sensitivity,
  onChangeSensitivity,
  onNext,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [minDropletUm, setMinDropletUm] = useState(50);
  const [filterEdges, setFilterEdges] = useState(true);

  // Calculate percentage fills for custom visual tracks
  const sensPercent = Math.min(100, Math.max(0, sensitivity + 50));
  const dropPercent = Math.min(100, Math.max(0, ((minDropletUm - 10) / (150 - 10)) * 100));

  const handleNudgeSensitivity = (delta: number) => {
    const nextVal = Math.min(50, Math.max(-50, sensitivity + delta));
    onChangeSensitivity(nextVal);
  };

  const handleNudgeMinDroplet = (delta: number) => {
    const nextVal = Math.min(150, Math.max(10, minDropletUm + delta));
    setMinDropletUm(nextVal);
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
        <section className="w-full h-[260px] relative rounded-2xl border-2 border-outline-variant bg-surface-container-low overflow-hidden flex flex-col shadow-sm">
          <div className="px-4 py-2.5 bg-surface-container-high border-b border-outline-variant flex justify-between items-center z-10">
            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Prévia da detecção (Máscara Binária)
            </h2>
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 relative w-full h-full p-2 flex items-center justify-center bg-black">
            <img
              src={SAMPLE_CARD_IMAGES.binary}
              alt="Prévia de detecção de pulverização"
              className="w-full h-full object-contain rounded-lg transition-all duration-200"
              style={{
                filter: `contrast(${100 + sensitivity * 1.5}%) brightness(${100 - sensitivity * 0.5}%)`,
              }}
            />
            {/* Live indicator tag */}
            <div className="absolute bottom-3 right-3 bg-primary text-on-primary text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-md border border-white/20 backdrop-blur-xs">
              Sensibilidade: {sensitivity > 0 ? `+${sensitivity}` : sensitivity}
            </div>
          </div>
        </section>

        {/* Controls Section */}
        <section className="flex flex-col gap-3">
          {/* Sensitivity Slider Card */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <label htmlFor="sensitivity" className="text-sm font-bold text-on-surface block">
                  Sensibilidade
                </label>
                <span className="text-[11px] text-on-surface-variant">
                  Ajuste o limiar de contraste das gotas
                </span>
              </div>
              <span className="font-extrabold text-2xl text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                {sensitivity > 0 ? `+${sensitivity}` : sensitivity}
              </span>
            </div>

            {/* Slider with Stepper Buttons */}
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={() => handleNudgeSensitivity(-5)}
                className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Diminuir sensibilidade (-5)"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
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
                  className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleNudgeSensitivity(5)}
                className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Aumentar sensibilidade (+5)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[-30, -15, 0, 15, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeSensitivity(preset)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sensitivity === preset
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
                  }`}
                >
                  {preset === 0 ? '0 (Padrão)' : preset > 0 ? `+${preset}` : preset}
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
                      {minDropletUm} µm
                    </span>
                  </div>

                  {/* Slider with Stepper Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleNudgeMinDroplet(-5)}
                      className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="10"
                        max="150"
                        step="5"
                        value={minDropletUm}
                        onChange={(e) => setMinDropletUm(Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #006439 0%, #006439 ${dropPercent}%, #becabe ${dropPercent}%, #becabe 100%)`,
                        }}
                        className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNudgeMinDroplet(5)}
                      className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface font-bold active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Droplet Chips */}
                  <div className="grid grid-cols-4 gap-1 mt-0.5">
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMinDropletUm(preset)}
                        className={`py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          minDropletUm === preset
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
                    checked={filterEdges}
                    onChange={(e) => setFilterEdges(e.target.checked)}
                    className="w-5 h-5 text-primary rounded border-outline-variant accent-primary cursor-pointer"
                  />
                </div>
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
