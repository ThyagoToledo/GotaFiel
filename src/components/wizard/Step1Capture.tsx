import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Lightbulb, Sparkles } from 'lucide-react';
import { SAMPLE_CARD_IMAGES } from '../../data/mockData';

interface Step1CaptureProps {
  onImageSelected: (imageUrl: string) => void;
}

export const Step1Capture: React.FC<Step1CaptureProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelected(url);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 pt-4 max-w-[1200px] mx-auto w-full pb-32">
      {/* Step Progress Bar */}
      <div className="w-full max-w-sm mb-4">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 1 de 6</span>
          <span>Captura</span>
        </div>
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-[16.66%] transition-all duration-300" />
        </div>
      </div>

      {/* Illustration Area */}
      <div className="w-full max-w-sm aspect-square bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center mb-6 relative overflow-hidden shadow-sm p-4">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Surface line */}
          <div className="absolute bottom-4 left-0 w-full h-[2px] bg-outline opacity-60" />

          {/* Yellow Card Simulation */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-24 bg-cartao-amarelo border-2 border-on-surface rounded-sm shadow-md transform -skew-x-[15deg]">
            {/* Blue specks (Gota Azul) */}
            <div className="absolute top-2 left-3 w-2.5 h-2.5 rounded-full bg-gota-azul opacity-90" />
            <div className="absolute top-8 left-8 w-2 h-2 rounded-full bg-gota-azul opacity-90" />
            <div className="absolute top-4 right-6 w-3 h-3 rounded-full bg-gota-azul opacity-80" />
            <div className="absolute bottom-4 left-5 w-1.5 h-1.5 rounded-full bg-gota-azul opacity-90" />
            <div className="absolute bottom-6 right-8 w-2.5 h-2.5 rounded-full bg-gota-azul opacity-85" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gota-azul opacity-95" />
          </div>

          {/* Light bulb indicator */}
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-outline border-dashed opacity-70 flex items-center justify-center bg-surface">
            <Lightbulb className="w-4 h-4 text-outline" />
          </div>
        </div>
      </div>

      {/* Instruction text */}
      <div className="text-center max-w-sm w-full mb-6">
        <p className="text-on-surface text-base">
          Fotografe o cartão sobre uma superfície plana, com boa luz e sem sombra.
        </p>
      </div>

      {/* Sample preset cards selection */}
      <div className="w-full max-w-sm bg-surface-container p-3 rounded-lg border border-outline-variant mb-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ou selecione uma amostra de teste rápida:</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onImageSelected(SAMPLE_CARD_IMAGES.ideal)}
            className="flex flex-col items-center gap-1 p-1.5 bg-surface-container-lowest rounded border border-outline-variant hover:border-primary transition-colors text-xs text-center"
          >
            <img src={SAMPLE_CARD_IMAGES.ideal} alt="Amostra Ideal" className="w-full h-12 object-cover rounded" />
            <span className="font-medium text-[11px]">Cartão Ideal</span>
          </button>
          <button
            onClick={() => onImageSelected(SAMPLE_CARD_IMAGES.runoff)}
            className="flex flex-col items-center gap-1 p-1.5 bg-surface-container-lowest rounded border border-outline-variant hover:border-primary transition-colors text-xs text-center"
          >
            <img src={SAMPLE_CARD_IMAGES.runoff} alt="Excesso" className="w-full h-12 object-cover rounded" />
            <span className="font-medium text-[11px]">Excesso</span>
          </button>
          <button
            onClick={() => onImageSelected(SAMPLE_CARD_IMAGES.macro)}
            className="flex flex-col items-center gap-1 p-1.5 bg-surface-container-lowest rounded border border-outline-variant hover:border-primary transition-colors text-xs text-center"
          >
            <img src={SAMPLE_CARD_IMAGES.macro} alt="Macro" className="w-full h-12 object-cover rounded" />
            <span className="font-medium text-[11px]">Macro Gota</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Bottom Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface dark:bg-surface-dim border-t border-outline-variant z-40">
        <div className="max-w-sm mx-auto flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[52px] bg-primary text-on-primary font-medium text-base rounded-md flex items-center justify-center gap-2 active:opacity-80 transition-opacity cursor-pointer shadow-sm"
          >
            <Camera className="w-5 h-5" />
            Tirar foto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[52px] bg-transparent text-primary font-medium text-base rounded-md border border-outline flex items-center justify-center gap-2 active:bg-surface-container transition-colors cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
            Escolher da galeria
          </button>
        </div>
      </div>
    </div>
  );
};
