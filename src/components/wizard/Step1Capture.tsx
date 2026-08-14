import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Lightbulb } from 'lucide-react';

interface Step1CaptureProps {
  onImageSelected: (imageUrl: string) => void;
}

export const Step1Capture: React.FC<Step1CaptureProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => onImageSelected(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  return <div className="flex-1 flex flex-col items-center px-4 pt-4 max-w-[1200px] mx-auto w-full pb-32">
    <div className="w-full max-w-sm mb-4"><div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1"><span>Passo 1 de 6</span><span>Captura</span></div><div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden"><div className="bg-primary h-full w-[16.66%] transition-all duration-300" /></div></div>
    <div className="w-full max-w-sm aspect-square bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center mb-6 relative overflow-hidden shadow-sm p-4"><div className="relative w-48 h-48 flex items-center justify-center"><div className="absolute bottom-4 left-0 w-full h-[2px] bg-outline opacity-60" /><div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-24 bg-cartao-amarelo border-2 border-on-surface rounded-sm shadow-md transform -skew-x-[15deg]" /><div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-outline border-dashed opacity-70 flex items-center justify-center bg-surface"><Lightbulb className="w-4 h-4 text-outline" /></div></div></div>
    <div className="text-center max-w-sm w-full mb-6"><p className="text-on-surface text-base">Fotografe o cartão sobre uma superfície plana, com boa luz e sem sombra.</p><ul className="text-on-surface-variant text-xs mt-2 space-y-1 text-left list-disc pl-5"><li>Deixe todo o cartão visível, sem dobrar nem inclinar.</li><li>Evite flash direto, reflexos e edição da imagem.</li><li>Prefira a imagem original na maior resolução disponível.</li></ul><p className="text-on-surface-variant text-xs mt-3">Somente a foto escolhida por você será processada localmente no navegador.</p></div>
    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface dark:bg-surface-dim border-t border-outline-variant z-40"><div className="max-w-sm mx-auto flex flex-col gap-2"><button onClick={() => fileInputRef.current?.click()} className="w-full h-[52px] bg-primary text-on-primary font-medium text-base rounded-md flex items-center justify-center gap-2 active:opacity-80 transition-opacity cursor-pointer shadow-sm"><Camera className="w-5 h-5" />Tirar foto</button><button onClick={() => fileInputRef.current?.click()} className="w-full h-[52px] bg-transparent text-primary font-medium text-base rounded-md border border-outline flex items-center justify-center gap-2 active:bg-surface-container transition-colors cursor-pointer"><ImageIcon className="w-5 h-5" />Escolher da galeria</button></div></div>
  </div>;
};
