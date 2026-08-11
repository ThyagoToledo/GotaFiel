import React, { useState } from 'react';
import { Info, ArrowRight } from 'lucide-react';

interface Step3ScaleProps {
  cardSizeMm: { width: number; height: number };
  onChangeCardSize: (size: { width: number; height: number }) => void;
  dpi: number;
  onNext: () => void;
}

export const Step3Scale: React.FC<Step3ScaleProps> = ({
  cardSizeMm,
  onChangeCardSize,
  dpi,
  onNext,
}) => {
  const [selectedOption, setSelectedOption] = useState<'76x26' | '76x52' | '26x38' | 'custom'>('76x26');
  const [customW, setCustomW] = useState(76);
  const [customH, setCustomH] = useState(26);

  const handleSelectOption = (opt: '76x26' | '76x52' | '26x38' | 'custom') => {
    setSelectedOption(opt);
    if (opt === '76x26') onChangeCardSize({ width: 76, height: 26 });
    else if (opt === '76x52') onChangeCardSize({ width: 76, height: 52 });
    else if (opt === '26x38') onChangeCardSize({ width: 26, height: 38 });
    else onChangeCardSize({ width: customW, height: customH });
  };

  const areaCm2 = ((cardSizeMm.width * cardSizeMm.height) / 100).toFixed(2);
  const mmPerPixel = (25.4 / dpi).toFixed(4);

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-32 px-4 pt-4">
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-4">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>3 de 6</span>
          <span>Calibração de Escala</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
        </div>
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-5">
        {/* Title */}
        <h2 className="font-semibold text-xl text-on-surface">Qual o tamanho real do cartão?</h2>

        {/* Radio Cards List */}
        <div className="flex flex-col gap-2.5">
          {/* Option 1 */}
          <label
            onClick={() => handleSelectOption('76x26')}
            className={`flex items-center p-4 border rounded-md cursor-pointer transition-all active:opacity-80 ${
              selectedOption === '76x26'
                ? 'border-primary bg-surface-container-low'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-base font-medium text-on-surface">76 × 26 mm</span>
              <span className="text-xs text-on-surface-variant ml-2">(Padrão Hidrossensível)</span>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '76x26' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '76x26' && <div className="w-3 h-3 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option 2 */}
          <label
            onClick={() => handleSelectOption('76x52')}
            className={`flex items-center p-4 border rounded-md cursor-pointer transition-all active:opacity-80 ${
              selectedOption === '76x52'
                ? 'border-primary bg-surface-container-low'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-base font-medium text-on-surface">76 × 52 mm</span>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '76x52' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '76x52' && <div className="w-3 h-3 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option 3 */}
          <label
            onClick={() => handleSelectOption('26x38')}
            className={`flex items-center p-4 border rounded-md cursor-pointer transition-all active:opacity-80 ${
              selectedOption === '26x38'
                ? 'border-primary bg-surface-container-low'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-base font-medium text-on-surface">26 × 38 mm</span>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '26x38' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '26x38' && <div className="w-3 h-3 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option 4: Custom */}
          <label
            onClick={() => handleSelectOption('custom')}
            className={`flex flex-col p-4 border rounded-md cursor-pointer transition-all active:opacity-80 ${
              selectedOption === 'custom'
                ? 'border-primary bg-surface-container-low'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-base font-medium text-on-surface">Personalizado</span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === 'custom' ? 'border-primary' : 'border-outline-variant'
                }`}
              >
                {selectedOption === 'custom' && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
            </div>

            {selectedOption === 'custom' && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-outline-variant/50">
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant font-medium">Largura (mm)</label>
                  <input
                    type="number"
                    value={customW}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomW(val);
                      onChangeCardSize({ width: val, height: customH });
                    }}
                    className="w-full h-10 px-2 border border-outline rounded bg-surface mt-1 text-sm text-on-surface"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant font-medium">Altura (mm)</label>
                  <input
                    type="number"
                    value={customH}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomH(val);
                      onChangeCardSize({ width: customW, height: val });
                    }}
                    className="w-full h-10 px-2 border border-outline rounded bg-surface mt-1 text-sm text-on-surface"
                  />
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant flex items-start gap-2.5">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <span className="text-xs text-on-surface-variant flex-1 leading-relaxed">
            DPI detectado no arquivo: <strong>{dpi} dpi</strong>
          </span>
        </div>
      </div>

      {/* Bottom Action Area */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-surface dark:bg-surface-dim border-t border-outline-variant z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="text-center">
            <p className="text-xs text-on-surface-variant">
              Escala: {mmPerPixel} mm/pixel · Área analisada: {areaCm2} cm²
            </p>
          </div>

          <button
            onClick={onNext}
            className="w-full h-[52px] bg-primary text-on-primary font-semibold text-base rounded-full active:opacity-80 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
