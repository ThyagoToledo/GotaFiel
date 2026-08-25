import React, { useState, useEffect } from 'react';
import { Info, ArrowRight, AlertTriangle, Sparkles, Maximize, Crop, Sliders } from 'lucide-react';
import { validateScale } from '../../core/scaleValidation';
import { computeTargetRaster, TARGET_MM_PER_PIXEL } from '../../core/imageProcessor';

interface Step3ScaleProps {
  cardSizeMm: { width: number; height: number };
  onChangeCardSize: (size: { width: number; height: number }) => void;
  imageUrl?: string;
  rectWidthPx?: number;
  rectHeightPx?: number;
  /** true quando a foto não tinha resolução para o raster ideal. */
  limitedBySource?: boolean;
  onNext: () => void;
}

type ScaleOption = 'auto' | 'full' | '76x26' | '76x52' | '26x38' | 'custom';

export const Step3Scale: React.FC<Step3ScaleProps> = ({
  cardSizeMm,
  onChangeCardSize,
  imageUrl,
  rectWidthPx,
  rectHeightPx,
  limitedBySource = false,
  onNext,
}) => {
  const [selectedOption, setSelectedOption] = useState<ScaleOption>(() => {
    if (cardSizeMm.width === 76 && cardSizeMm.height === 26) return '76x26';
    if (cardSizeMm.width === 76 && cardSizeMm.height === 52) return '76x52';
    if (cardSizeMm.width === 26 && cardSizeMm.height === 38) return '26x38';
    return 'auto';
  });
  const [customW, setCustomW] = useState(cardSizeMm.width || 76);
  const [customH, setCustomH] = useState(cardSizeMm.height || 26);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Measure natural dimensions of the image if available
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const aspect = img.naturalWidth / img.naturalHeight;
        setImageAspect(aspect);
        setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

        // If 'auto' or 'full' was selected, update initial card size based on image proportion
        if (selectedOption === 'auto' || selectedOption === 'full') {
          const autoH = Math.max(1, parseFloat((76 / aspect).toFixed(1)));
          onChangeCardSize({ width: 76, height: autoH });
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleSelectOption = (opt: ScaleOption) => {
    setSelectedOption(opt);
    if (opt === 'auto' || opt === 'full') {
      const aspect = imageAspect || 76 / 26;
      const autoH = Math.max(1, parseFloat((76 / aspect).toFixed(1)));
      onChangeCardSize({ width: 76, height: autoH });
    } else if (opt === '76x26') {
      onChangeCardSize({ width: 76, height: 26 });
    } else if (opt === '76x52') {
      onChangeCardSize({ width: 76, height: 52 });
    } else if (opt === '26x38') {
      onChangeCardSize({ width: 26, height: 38 });
    } else if (opt === 'custom') {
      onChangeCardSize({ width: customW, height: customH });
    }
  };

  // The raster follows the card so physical pixels stay square. Before the analysis has
  // run there is no measured raster yet, so preview the planned one.
  const plannedRaster = computeTargetRaster(cardSizeMm.width, cardSizeMm.height);
  const effectiveRectWidthPx = rectWidthPx ?? plannedRaster.targetWidth;
  const effectiveRectHeightPx = rectHeightPx ?? plannedRaster.targetHeight;

  const scaleResult = validateScale(
    cardSizeMm.width,
    cardSizeMm.height,
    effectiveRectWidthPx,
    effectiveRectHeightPx
  );

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-36 px-4 pt-4">
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 2 de 6</span>
          <span>Calibração de Escala</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
          <div className="h-1 flex-1 bg-surface-variant rounded-full" />
        </div>
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-4">
        {/* Title */}
        <div>
          <h2 className="font-bold text-xl text-on-surface">Qual o tamanho real do cartão?</h2>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Selecione o tamanho físico para calibração métrica exata dos diâmetros em micrômetros (µm) e da cobertura.
          </p>
        </div>

        {/* Radio Cards List */}
        <div className="flex flex-col gap-2.5">
          {/* Option: Automático (Proporcional à Imagem) */}
          <label
            onClick={() => handleSelectOption('auto')}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === 'auto'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">Automático (Pela Imagem)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Ajusta as dimensões físicas de acordo com a proporção da foto carregada
                {imgNaturalSize ? ` (${imgNaturalSize.width} × ${imgNaturalSize.height} px)` : ''}
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'auto' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === 'auto' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option: Tamanho Inteiro da Imagem (1:1 / Sem corte prévio) */}
          <label
            onClick={() => handleSelectOption('full')}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === 'full'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Maximize className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">Tamanho Inteiro da Imagem</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Utiliza 100% da área útil da imagem como referência métrica
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'full' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option: 76x26 mm */}
          <label
            onClick={() => handleSelectOption('76x26')}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === '76x26'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-sm font-bold text-on-surface">76 × 26 mm</span>
              <span className="text-xs text-on-surface-variant ml-2">(Padrão Hidrossensível Comercial)</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '76x26' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '76x26' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option: 76x52 mm */}
          <label
            onClick={() => handleSelectOption('76x52')}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === '76x52'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-sm font-bold text-on-surface">76 × 52 mm</span>
              <span className="text-xs text-on-surface-variant ml-2">(Cartão Duplo)</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '76x52' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '76x52' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option: 26x38 mm */}
          <label
            onClick={() => handleSelectOption('26x38')}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === '26x38'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex-1">
              <span className="text-sm font-bold text-on-surface">26 × 38 mm</span>
              <span className="text-xs text-on-surface-variant ml-2">(Meio Cartão)</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption === '26x38' ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {selectedOption === '26x38' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </label>

          {/* Option: Custom */}
          <label
            onClick={() => handleSelectOption('custom')}
            className={`flex flex-col p-3.5 border rounded-xl cursor-pointer transition-all active:opacity-80 shadow-xs ${
              selectedOption === 'custom'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-outline-variant bg-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">Personalizado</span>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === 'custom' ? 'border-primary' : 'border-outline-variant'
                }`}
              >
                {selectedOption === 'custom' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
            </div>

            {selectedOption === 'custom' && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-outline-variant/60">
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant font-bold">Largura (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={customW}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomW(val);
                      onChangeCardSize({ width: val, height: customH });
                    }}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest mt-1 text-sm text-on-surface font-bold focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant font-bold">Altura (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={customH}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomH(val);
                      onChangeCardSize({ width: customW, height: val });
                    }}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest mt-1 text-sm text-on-surface font-bold focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Validation Info Box */}
        {scaleResult.isValid ? (
          <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant flex items-start gap-2.5 shadow-xs">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-on-surface-variant flex-1 leading-relaxed">
              <p>
                Dimensões selecionadas:{' '}
                <strong className="text-primary font-bold">{cardSizeMm.width} × {cardSizeMm.height} mm</strong>
              </p>
              <p>Área física total: <strong>{scaleResult.areaCm2} cm²</strong> ({scaleResult.areaMm2} mm²)</p>
              <p>
                Resolução prevista:{' '}
                <strong>{effectiveRectWidthPx} × {effectiveRectHeightPx} px</strong>
                {' '}({(cardSizeMm.width / effectiveRectWidthPx).toFixed(4)} mm/pixel)
              </p>
              {limitedBySource && (
                <p className="mt-1.5 pt-1.5 border-t border-outline-variant/60 text-on-surface-variant">
                  A foto não possui resolução total para os {TARGET_MM_PER_PIXEL} mm/pixel ideais. A resolução real foi adaptada.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl border border-error/30 flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <span className="text-xs font-semibold flex-1 leading-relaxed">
              {scaleResult.errorReason || 'Defina dimensões físicas válidas (maiores que zero) para prosseguir.'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={!scaleResult.isValid}
            className={`w-full h-[52px] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              scaleResult.isValid
                ? 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98]'
                : 'bg-outline-variant text-on-surface-variant/50 cursor-not-allowed'
            }`}
          >
            <span>Avançar para Enquadramento do Cartão</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
