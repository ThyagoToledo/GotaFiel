import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Maximize2,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CardColor } from '../../types';

interface Step2CropProps {
  imageUrl: string;
  cardColor: CardColor;
  onChangeCardColor: (color: CardColor) => void;
  onNext: (corners: Record<CornerKey, Point>) => void;
}

type CornerKey = 'tl' | 'tr' | 'br' | 'bl';

interface Point {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

const DEFAULT_CORNERS: Record<CornerKey, Point> = {
  tl: { x: 5, y: 10 },
  tr: { x: 95, y: 10 },
  br: { x: 95, y: 90 },
  bl: { x: 5, y: 90 },
};

const CORNER_LABELS: Record<CornerKey, string> = {
  tl: 'Topo-Esq',
  tr: 'Topo-Dir',
  br: 'Base-Dir',
  bl: 'Base-Esq',
};

export const Step2Crop: React.FC<Step2CropProps> = ({
  imageUrl,
  cardColor,
  onChangeCardColor,
  onNext,
}) => {
  const [isManualAdjust, setIsManualAdjust] = useState(false);
  const [corners, setCorners] = useState<Record<CornerKey, Point>>(DEFAULT_CORNERS);
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [selectedCornerForNudge, setSelectedCornerForNudge] = useState<CornerKey>('tl');
  const [aspectRatio, setAspectRatio] = useState<number>(2.2);

  const containerRef = useRef<HTMLDivElement>(null);

  // Measure natural aspect ratio of the image to scale container perfectly with NO cropping and NO letterboxing
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = imageUrl;
    // Reset corners when image changes
    setCorners(DEFAULT_CORNERS);
    setIsManualAdjust(false);
  }, [imageUrl]);

  // Calculate approximate percentage area of quadrilateral (Shoelace formula)
  const calculateAreaPercent = useCallback(() => {
    const { tl, tr, br, bl } = corners;
    const area = Math.abs(
      (tl.x * tr.y - tr.x * tl.y) +
      (tr.x * br.y - br.x * tr.y) +
      (br.x * bl.y - bl.x * br.y) +
      (bl.x * tl.y - tl.x * bl.y)
    ) / 2;
    return Math.min(99, Math.max(5, Math.round(area)));
  }, [corners]);

  // Handle pointer/touch position updates
  const updateCornerPos = useCallback(
    (clientX: number, clientY: number, cornerKey: CornerKey) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.min(99, Math.max(1, parseFloat(rawX.toFixed(1))));
      const clampedY = Math.min(99, Math.max(1, parseFloat(rawY.toFixed(1))));

      setCorners((prev) => ({
        ...prev,
        [cornerKey]: { x: clampedX, y: clampedY },
      }));
    },
    []
  );

  // Global event handlers for drag tracking
  useEffect(() => {
    if (!activeCorner) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateCornerPos(e.clientX, e.clientY, activeCorner);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateCornerPos(touch.clientX, touch.clientY, activeCorner);
      }
    };

    const handlePointerUp = () => {
      setActiveCorner(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeCorner, updateCornerPos]);

  const handleStartDrag = (cornerKey: CornerKey, clientX: number, clientY: number) => {
    setIsManualAdjust(true);
    setActiveCorner(cornerKey);
    setSelectedCornerForNudge(cornerKey);
    updateCornerPos(clientX, clientY, cornerKey);
  };

  const handleResetCorners = () => {
    setCorners(DEFAULT_CORNERS);
    setIsManualAdjust(false);
  };

  const handleMaximizeCorners = () => {
    setIsManualAdjust(true);
    setCorners({
      tl: { x: 2, y: 2 },
      tr: { x: 98, y: 2 },
      br: { x: 98, y: 98 },
      bl: { x: 2, y: 98 },
    });
  };

  const handleAutoAlignCorners = () => {
    setIsManualAdjust(true);
    setCorners({
      tl: { x: 5, y: 10 },
      tr: { x: 95, y: 10 },
      br: { x: 95, y: 90 },
      bl: { x: 5, y: 90 },
    });
  };

  const handleNudge = (dx: number, dy: number) => {
    setIsManualAdjust(true);
    setCorners((prev) => {
      const current = prev[selectedCornerForNudge];
      return {
        ...prev,
        [selectedCornerForNudge]: {
          x: Math.min(99, Math.max(1, Number((current.x + dx).toFixed(1)))),
          y: Math.min(99, Math.max(1, Number((current.y + dy).toFixed(1)))),
        },
      };
    });
  };

  const activeCornerPoint = activeCorner ? corners[activeCorner] : null;
  const areaPercent = calculateAreaPercent();

  // Exact Loupe calculations using container size
  const containerRect = containerRef.current?.getBoundingClientRect();
  const mainW = containerRect ? containerRect.width : 340;
  const mainH = containerRect ? containerRect.height : 180;

  const loupeSize = 144; // 144px (w-36 h-36)
  const loupeCenter = loupeSize / 2; // 72px
  const zoomScale = 3.0;

  const zoomedW = mainW * zoomScale;
  const zoomedH = mainH * zoomScale;

  let loupeImgLeft = 0;
  let loupeImgTop = 0;

  if (activeCornerPoint) {
    loupeImgLeft = loupeCenter - (activeCornerPoint.x / 100) * zoomedW;
    loupeImgTop = loupeCenter - (activeCornerPoint.y / 100) * zoomedH;
  }

  // Position Loupe in opposite quadrant so finger never covers it
  let loupePositionClass = 'bottom-2 right-2';
  if (activeCornerPoint) {
    const isRight = activeCornerPoint.x >= 50;
    const isBottom = activeCornerPoint.y >= 50;
    if (isRight && !isBottom) {
      loupePositionClass = 'bottom-2 left-2';
    } else if (!isRight && !isBottom) {
      loupePositionClass = 'bottom-2 right-2';
    } else if (!isRight && isBottom) {
      loupePositionClass = 'top-2 right-2';
    } else {
      loupePositionClass = 'top-2 left-2';
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-36 px-4 pt-4">
      {/* Step Progress Dots */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 2 de 6</span>
          <span>Detecção & Corte do Cartão</span>
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

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-3.5">
        {/* Instruction Alert */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface leading-relaxed">
            <strong className="text-primary font-bold">Arraste os 4 cantos azuis</strong> para delimitar a área exata do papel hidrossensível.
          </p>
        </div>

        {/* Card Image Interactive Canvas Frame */}
        <div className="w-full bg-neutral-950 rounded-2xl p-2 border-2 border-outline-variant shadow-md flex items-center justify-center">
          {/* Canvas Container: Aspect ratio dynamically matches image natural size so 100% of photo is shown without ANY cropping */}
          <div
            ref={containerRef}
            style={{ aspectRatio: `${aspectRatio}` }}
            className="relative w-full max-h-[380px] rounded-xl overflow-hidden touch-none select-none cursor-crosshair"
            onClick={(e) => {
              if (!activeCorner) {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                  const clickY = ((e.clientY - rect.top) / rect.height) * 100;

                  let nearest: CornerKey = 'tl';
                  let minDist = Infinity;
                  (Object.keys(corners) as CornerKey[]).forEach((key) => {
                    const dist = Math.hypot(corners[key].x - clickX, corners[key].y - clickY);
                    if (dist < minDist) {
                      minDist = dist;
                      nearest = key;
                    }
                  });
                  setSelectedCornerForNudge(nearest);
                }
              }
            }}
          >
            {/* Full Sample Image - Shown 100% complete without cropping */}
            <img
              src={imageUrl}
              alt="Cartão hidrossensível"
              className="w-full h-full block pointer-events-none select-none"
            />

            {/* Polygon Overlay & Selection Border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                fill="rgba(0, 229, 255, 0.22)"
                stroke="#00E5FF"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />

              {/* Crosshair Guidelines for Active Corner */}
              {activeCornerPoint && (
                <>
                  <line
                    x1="0"
                    y1={activeCornerPoint.y}
                    x2="100"
                    y2={activeCornerPoint.y}
                    stroke="rgba(0, 229, 255, 0.7)"
                    strokeWidth="0.6"
                    strokeDasharray="1,1"
                  />
                  <line
                    x1={activeCornerPoint.x}
                    y1="0"
                    x2={activeCornerPoint.x}
                    y2="100"
                    stroke="rgba(0, 229, 255, 0.7)"
                    strokeWidth="0.6"
                    strokeDasharray="1,1"
                  />
                </>
              )}
            </svg>

            {/* Interactive Touch Target Handles */}
            {(['tl', 'tr', 'br', 'bl'] as CornerKey[]).map((cornerKey) => {
              const point = corners[cornerKey];
              const isActive = activeCorner === cornerKey;
              const isSelectedNudge = selectedCornerForNudge === cornerKey;

              return (
                <div
                  key={cornerKey}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleStartDrag(cornerKey, e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length > 0) {
                      handleStartDrag(cornerKey, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className="absolute z-20 -ml-6 -mt-6 w-12 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing group"
                >
                  <div
                    className={`w-7 h-7 rounded-full bg-cyan-400 border-2 border-white shadow-xl flex items-center justify-center transition-transform duration-100 ${
                      isActive
                        ? 'scale-125 ring-4 ring-cyan-400/70 bg-white'
                        : isSelectedNudge
                        ? 'ring-2 ring-cyan-300 scale-110'
                        : 'group-hover:scale-110'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-cyan-600 animate-ping' : 'bg-primary'
                      }`}
                    />
                  </div>

                  <span
                    className={`absolute text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-black/85 text-cyan-300 backdrop-blur-xs border border-cyan-400/40 pointer-events-none whitespace-nowrap shadow-sm ${
                      cornerKey === 'tl' || cornerKey === 'bl' ? '-left-8' : '-right-8'
                    } ${cornerKey === 'tl' || cornerKey === 'tr' ? '-top-3' : '-bottom-3'}`}
                  >
                    {CORNER_LABELS[cornerKey]}
                  </span>
                </div>
              );
            })}

            {/* Precision Loupe Magnifier */}
            {activeCorner && activeCornerPoint && (
              <div
                className={`absolute ${loupePositionClass} z-30 w-36 h-36 rounded-full border-3 border-cyan-400 bg-black overflow-hidden shadow-2xl flex flex-col items-center justify-center pointer-events-none ring-4 ring-black/80 transition-all duration-150`}
              >
                <img
                  src={imageUrl}
                  alt="Zoom Loupe"
                  className="pointer-events-none"
                  style={{
                    position: 'absolute',
                    width: `${zoomedW}px`,
                    height: `${zoomedH}px`,
                    left: `${loupeImgLeft}px`,
                    top: `${loupeImgTop}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                />

                <svg
                  className="pointer-events-none"
                  style={{
                    position: 'absolute',
                    width: `${zoomedW}px`,
                    height: `${zoomedH}px`,
                    left: `${loupeImgLeft}px`,
                    top: `${loupeImgTop}px`,
                  }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                    fill="rgba(0, 229, 255, 0.25)"
                    stroke="#00E5FF"
                    strokeWidth="1.2"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-5 h-5 border-2 border-cyan-400 rounded-full shadow-md bg-cyan-400/20" />
                  <div className="absolute w-full h-[1px] bg-cyan-400/80" />
                  <div className="absolute h-full w-[1px] bg-cyan-400/80" />
                </div>

                <div className="absolute bottom-1.5 z-20 bg-black/90 text-[9px] font-extrabold text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/40 shadow-sm uppercase tracking-wider">
                  {CORNER_LABELS[activeCorner]} ({activeCornerPoint.x.toFixed(0)}%, {activeCornerPoint.y.toFixed(0)}%)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar & Precision Controls */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 shadow-xs flex flex-col gap-2.5">
          <div className="flex flex-col gap-2 border-b border-outline-variant/60 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Ferramentas de Alinhamento</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full">
              <button
                type="button"
                onClick={handleAutoAlignCorners}
                className="h-9 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                title="Alinhar em retângulo perfeito"
              >
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Retângulo</span>
              </button>

              <button
                type="button"
                onClick={handleResetCorners}
                className="h-9 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                title="Redefinir para detecção automática"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Redefinir</span>
              </button>

              <button
                type="button"
                onClick={handleMaximizeCorners}
                className="h-9 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                title="Expandir seleção para bordas"
              >
                <Maximize2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Maximizar</span>
              </button>
            </div>
          </div>

          {/* Directional Micro-Nudge Pad */}
          <div className="flex flex-col xs:flex-row items-center justify-between gap-3">
            <div className="flex flex-col flex-1 w-full xs:w-auto">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Ajustar Canto Específico:
              </span>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {(['tl', 'tr', 'bl', 'br'] as CornerKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setIsManualAdjust(true);
                      setSelectedCornerForNudge(key);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer text-center truncate ${
                      selectedCornerForNudge === key
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
                    }`}
                  >
                    {CORNER_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* D-Pad */}
            <div className="flex flex-col items-center shrink-0 pt-1 xs:pt-0 border-t xs:border-t-0 border-outline-variant/40 w-full xs:w-auto">
              <button
                type="button"
                onClick={() => handleNudge(0, -1)}
                className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-t-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                title="Mover para cima"
              >
                ▲
              </button>
              <div className="flex gap-1 my-0.5">
                <button
                  type="button"
                  onClick={() => handleNudge(-1, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-l-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover para esquerda"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(1, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-r-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover para direita"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(0, 1)}
                className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-b-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                title="Mover para baixo"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Detection Card Info Status */}
        <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3 border border-outline-variant shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-quality-good shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">
              {isManualAdjust ? 'Ajuste manual ativado' : 'Cartão detectado automaticamente'}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">
              Área selecionada: <strong className="text-primary font-bold">{areaPercent}%</strong> do cartão
            </span>
          </div>
        </div>

        {/* Color Selector */}
        <div className="flex flex-col gap-1 mt-0.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            COR DO PAPEL HIDROSSENSÍVEL
          </label>
          <div className="relative">
            <select
              value={cardColor}
              onChange={(e) => onChangeCardColor(e.target.value as CardColor)}
              className="w-full h-11 border border-outline-variant rounded-xl px-3 pl-10 bg-surface-container-lowest text-on-surface font-bold text-xs md:text-sm appearance-none focus:outline-none focus:border-primary cursor-pointer shadow-xs"
            >
              <option value="Amarelo">Amarelo (Hidrossensível Padrão)</option>
              <option value="Branco">Branco</option>
              <option value="Outro">Outro</option>
            </select>
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border border-outline-variant ${
                cardColor === 'Amarelo'
                  ? 'bg-cartao-amarelo'
                  : cardColor === 'Branco'
                  ? 'bg-white'
                  : 'bg-gray-400'
              }`}
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-40">
        <div className="max-w-md mx-auto flex gap-2">
          <button
            type="button"
            onClick={() => onNext(corners)}
            className="w-full h-[52px] bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <span>Confirmar Corte do Cartão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
