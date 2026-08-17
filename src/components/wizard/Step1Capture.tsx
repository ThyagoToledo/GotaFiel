import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Lightbulb,
  X,
  RefreshCw,
  AlertCircle,
  MapPin,
  Sparkles,
  Layers,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { CanopyPosition } from '../../types';
import { computeLaplacianSharpness } from '../../utils/sprayAnalytics';

interface Step1CaptureProps {
  onImageSelected: (
    imageUrl: string,
    gpsCoords?: { latitude: number; longitude: number },
    canopyPosition?: CanopyPosition
  ) => void;
}

export const Step1Capture: React.FC<Step1CaptureProps> = ({ onImageSelected }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const focusCheckIntervalRef = useRef<any>(null);

  // Buffers estáticos reutilizados para evitar pressão no Garbage Collector (GC)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const grayscaleBufferRef = useRef<Float32Array | null>(null);

  // Focus & Sharpness Meter State
  const [sharpnessScore, setSharpnessScore] = useState<number>(0);
  const [sharpnessStatus, setSharpnessStatus] = useState<'ruim' | 'medio' | 'otimo'>('ruim');

  // Canopy Position & GPS State
  const [canopyPos, setCanopyPos] = useState<CanopyPosition>('livre');
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Tenta obter coordenadas GPS em background
  const requestGps = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsLocating(false);
        },
        (err) => {
          console.warn('GPS não disponível ou permissão recusada:', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  useEffect(() => {
    requestGps();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageSelected(reader.result, gpsLocation || undefined, canopyPos);
        }
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  /**
   * Amostra a imagem do vídeo com buffers pré-alocados para cálculo de foco
   */
  const sampleVideoSharpness = (video: HTMLVideoElement): number => {
    const width = 160;
    const height = 90;

    if (!offscreenCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      offscreenCanvasRef.current = canvas;
    }

    if (!grayscaleBufferRef.current) {
      grayscaleBufferRef.current = new Float32Array(width * height);
    }

    const canvas = offscreenCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    // Desenha o frame do vídeo reduzido no buffer
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const gray = grayscaleBufferRef.current;

    // Conversão otimizada para escala de cinza perceptiva (Rec. 601)
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    return computeLaplacianSharpness(gray, width, height);
  };

  // Encerra stream de vídeo
  const stopWebcam = () => {
    if (focusCheckIntervalRef.current) {
      clearInterval(focusCheckIntervalRef.current);
      focusCheckIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
    setWebcamError(null);
  };

  // Inicia webcam e foco em tempo real
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

        // Monitor de foco (~10 FPS)
        focusCheckIntervalRef.current = setInterval(() => {
          if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
            const variance = sampleVideoSharpness(videoRef.current);
            setSharpnessScore(Math.round(variance));

            if (variance >= 120) {
              setSharpnessStatus('otimo');
            } else if (variance >= 50) {
              setSharpnessStatus('medio');
            } else {
              setSharpnessStatus('ruim');
            }
          }
        }, 120);
      }
    } catch (err) {
      console.warn('Webcam não disponível, usando seletor nativo:', err);
      stopWebcam();
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
    onImageSelected(dataUrl, gpsLocation || undefined, canopyPos);
  };

  const handleTakePhotoClick = () => {
    requestGps();
    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 768);

    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      startWebcam();
    }
  };

  useEffect(() => {
    return () => {
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
      }
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
          <span>Captura & Metadados</span>
        </div>
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-[16.66%] transition-all duration-300" />
        </div>
      </div>

      {/* Canopy Position Selector */}
      <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl p-3.5 shadow-sm mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Posição do Cartão no Dossel
          </span>
          <span className="text-[10px] text-on-surface-variant">Opcional</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              { key: 'topo', label: 'Topo' },
              { key: 'medio', label: 'Médio' },
              { key: 'baixeiro', label: 'Baixeiro' },
              { key: 'livre', label: 'Livre' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCanopyPos(item.key)}
              className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                canopyPos === item.key
                  ? 'bg-primary text-on-primary shadow-xs ring-1 ring-primary'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container border border-outline-variant/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* GPS Location Status Indicator */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between px-3 py-2 bg-surface-container rounded-xl border border-outline-variant/60 text-[11px] text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <MapPin className={`w-3.5 h-3.5 ${gpsLocation ? 'text-primary' : 'text-on-surface-variant'}`} />
          <span>
            {gpsLocation
              ? `GPS: ${gpsLocation.latitude.toFixed(4)}, ${gpsLocation.longitude.toFixed(4)}`
              : isLocating
                ? 'Obtendo GPS...'
                : 'GPS não detectado'}
          </span>
        </div>
        {!gpsLocation && (
          <button
            type="button"
            onClick={requestGps}
            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
          >
            Ativar GPS
          </button>
        )}
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
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Live Camera Viewfinder with Real-time Focus & Sharpness Assistant */}
      {isWebcamOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
              <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Assistente de Foco em Tempo Real
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

              {/* Dynamic Focus Reticle Overlay */}
              <div
                className={`absolute inset-x-10 inset-y-8 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3 border-2 transition-all ${
                  sharpnessStatus === 'otimo'
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                    : sharpnessStatus === 'medio'
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-white/50 border-dashed bg-black/20'
                }`}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-[11px] font-bold text-white shadow-xs">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  {sharpnessStatus === 'otimo' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Foco Excelente ({sharpnessScore})
                    </span>
                  ) : sharpnessStatus === 'medio' ? (
                    <span className="text-amber-300">Ajustando Foco ({sharpnessScore})</span>
                  ) : (
                    <span className="text-white/80">Aproxime e Estabilize</span>
                  )}
                </div>

                <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded">
                  Enquadre o cartão (76 × 26 mm)
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
