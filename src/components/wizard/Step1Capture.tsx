import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Lightbulb, X, RefreshCw, AlertCircle } from 'lucide-react';

interface Step1CaptureProps {
  onImageSelected: (imageUrl: string) => void;
}

export const Step1Capture: React.FC<Step1CaptureProps> = ({ onImageSelected }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  // Encerra stream de vídeo
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
    setWebcamError(null);
  };

  // Inicia webcam no desktop quando disponível
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback direto para o input nativo de câmera
        cameraInputRef.current?.click();
        return;
      }

      setIsWebcamOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Webcam não disponível ou permissão negada, utilizando seletor nativo:', err);
      stopWebcam();
      // Abre o seletor nativo como fallback
      cameraInputRef.current?.click();
    }
  };

  // Captura frame do vídeo da webcam
  const captureWebcamFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopWebcam();
    onImageSelected(dataUrl);
  };

  // Trata clique em "Tirar foto"
  const handleTakePhotoClick = () => {
    // Detecta se é dispositivo mobile (touch / tela pequena) para priorizar o app nativo de câmera
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      startWebcam();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center px-4 pt-4 max-w-[1200px] mx-auto w-full pb-36">
      {/* Progress Bar */}
      <div className="w-full max-w-sm mb-4">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 1 de 6</span>
          <span>Captura</span>
        </div>
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-[16.66%] transition-all duration-300" />
        </div>
      </div>

      {/* Card Visual Illustration */}
      <div className="w-full max-w-sm aspect-square bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col items-center justify-center mb-6 relative overflow-hidden shadow-sm p-4">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute bottom-4 left-0 w-full h-[2px] bg-outline opacity-60" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-24 bg-cartao-amarelo border-2 border-on-surface rounded-sm shadow-md transform -skew-x-[15deg]" />
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-outline border-dashed opacity-70 flex items-center justify-center bg-surface">
            <Lightbulb className="w-4 h-4 text-outline" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center max-w-sm w-full mb-6">
        <p className="text-on-surface text-base font-semibold">
          Fotografe o cartão sobre uma superfície plana, com boa luz e sem sombra.
        </p>
        <ul className="text-on-surface-variant text-xs mt-3 space-y-1.5 text-left list-disc pl-5 leading-relaxed">
          <li>Deixe todo o cartão visível, sem dobrar nem inclinar.</li>
          <li>Evite flash direto, reflexos e edição da imagem.</li>
          <li>Prefira a imagem original na maior resolução disponível.</li>
        </ul>
        <p className="text-on-surface-variant text-[11px] mt-4 opacity-80">
          Somente a foto escolhida por você será processada localmente no navegador.
        </p>
      </div>

      {/* Inputs ocultos dedicados: um para galeria e outro para câmera nativa */}
      {/* 1. Galeria: SEM atributo capture para permitir navegar fotos */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 2. Câmera: COM capture='environment' para acionar o app de câmera no mobile */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Modal de Câmera/Webcam para Desktop */}
      {isWebcamOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
              <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Câmera ao Vivo
              </span>
              <button
                type="button"
                onClick={stopWebcam}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[11px] text-white/90 bg-black/60 px-2 py-1 rounded">
                  Enquadre o cartão hidrossensível aqui
                </span>
              </div>
            </div>

            {webcamError && (
              <div className="p-3 bg-error-container text-on-error-container text-xs flex items-center gap-2 m-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                <span>{webcamError}</span>
              </div>
            )}

            <div className="p-4 flex gap-3 bg-surface-container">
              <button
                type="button"
                onClick={() => {
                  stopWebcam();
                  cameraInputRef.current?.click();
                }}
                className="flex-1 h-12 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Usar Arquivo
              </button>
              <button
                type="button"
                onClick={captureWebcamFrame}
                className="flex-1 h-12 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Capturar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-40">
        <div className="max-w-sm mx-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleTakePhotoClick}
            className="w-full h-[52px] bg-primary text-on-primary font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            Tirar foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-full h-[52px] bg-surface-container text-primary font-bold text-base rounded-xl border border-outline-variant flex items-center justify-center gap-2 hover:bg-surface-container-high active:scale-[0.98] transition-all cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
            Escolher da galeria
          </button>
        </div>
      </div>
    </div>
  );
};
