import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Maximize2,
  Sliders,
  Sparkles,
  Move,
  Scan,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CardColor } from '../../types';

interface Step2CropProps {
  imageUrl: string;
  cardSizeMm?: { width: number; height: number };
  cardColor: CardColor;
  onChangeCardColor: (color: CardColor) => void;
  onNext: (corners: Record<CornerKey, Point>) => void;
}

export type CornerKey = 'tl' | 'tr' | 'br' | 'bl';

export interface Point {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

export const DEFAULT_FULL_CORNERS: Record<CornerKey, Point> = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

const DEFAULT_MARGIN_CORNERS: Record<CornerKey, Point> = {
  tl: { x: 5, y: 5 },
  tr: { x: 95, y: 5 },
  br: { x: 95, y: 95 },
  bl: { x: 5, y: 95 },
};

const CORNER_LABELS: Record<CornerKey, string> = {
  tl: 'Topo-Esq',
  tr: 'Topo-Dir',
  br: 'Base-Dir',
  bl: 'Base-Esq',
};

/**
 * Calcula cantos proporcionais para a área de análise respeitando a proporção física do cartão
 * e o aspecto da imagem original.
 */
export function computeCornersForAspect(
  cardWidth: number,
  cardHeight: number,
  imgAspect: number
): Record<CornerKey, Point> {
  const cardAspect = cardWidth / cardHeight;
  let widthPct = 90;
  let heightPct = 90;

  if (cardAspect <= imgAspect) {
    heightPct = 85;
    widthPct = parseFloat((85 * (cardAspect / imgAspect)).toFixed(1));
    if (widthPct > 96) {
      widthPct = 96;
      heightPct = parseFloat((96 * (imgAspect / cardAspect)).toFixed(1));
    }
  } else {
    widthPct = 90;
    heightPct = parseFloat((90 * (imgAspect / cardAspect)).toFixed(1));
    if (heightPct > 96) {
      heightPct = 96;
      widthPct = parseFloat((96 * (cardAspect / imgAspect)).toFixed(1));
    }
  }

  const left = parseFloat(((100 - widthPct) / 2).toFixed(1));
  const right = parseFloat((left + widthPct).toFixed(1));
  const top = parseFloat(((100 - heightPct) / 2).toFixed(1));
  const bottom = parseFloat((top + heightPct).toFixed(1));

  return {
    tl: { x: left, y: top },
    tr: { x: right, y: top },
    br: { x: right, y: bottom },
    bl: { x: left, y: bottom },
  };
}

export const Step2Crop: React.FC<Step2CropProps> = ({
  imageUrl,
  cardSizeMm = { width: 76, height: 26 },
  cardColor,
  onChangeCardColor,
  onNext,
}) => {
  const [isManualAdjust, setIsManualAdjust] = useState(false);
  const [corners, setCorners] = useState<Record<CornerKey, Point>>(DEFAULT_FULL_CORNERS);
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [isDraggingArea, setIsDraggingArea] = useState(false);
  const [dragAreaStart, setDragAreaStart] = useState<{ clientX: number; clientY: number; initialCorners: Record<CornerKey, Point> } | null>(null);

  const [selectedCornerForNudge, setSelectedCornerForNudge] = useState<CornerKey>('tl');
  const [aspectRatio, setAspectRatio] = useState<number>(2.2);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Proporção e dimensões físicas do cartão ativo
  const cardWidth = cardSizeMm?.width || 76;
  const cardHeight = cardSizeMm?.height || 26;
  const cardAspect = cardWidth / cardHeight;

  // Mede as dimensões reais da foto e inicializa a seleção azul proporcionalmente
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        const imgAspect = imgW / imgH;
        setImageDimensions({ width: imgW, height: imgH });
        setAspectRatio(imgAspect);

        // Se a proporção do cartão for diferente da proporção da imagem (>3%),
        // inicializa a seleção diretamente com a dimensão/proporção do cartão!
        if (Math.abs(cardAspect - imgAspect) / imgAspect > 0.03) {
          const fittedCorners = computeCornersForAspect(cardWidth, cardHeight, imgAspect);
          setCorners(fittedCorners);
        } else {
          setCorners(DEFAULT_FULL_CORNERS);
        }
      }
    };
    img.src = imageUrl;

    setIsManualAdjust(false);
    setActiveCorner(null);
    setIsDraggingArea(false);
  }, [imageUrl, cardWidth, cardHeight]);

  // Calcula percentual aproximado da área do quadrilátero selecionado
  const calculateAreaPercent = useCallback(() => {
    const { tl, tr, br, bl } = corners;
    const area = Math.abs(
      (tl.x * tr.y - tr.x * tl.y) +
      (tr.x * br.y - tr.x * br.y) +
      (br.x * bl.y - bl.x * br.y) +
      (bl.x * tl.y - tl.x * bl.y)
    ) / 2;
    return Math.min(100, Math.max(1, Math.round(area)));
  }, [corners]);

  // Atualização dos cantos individuais
  const updateCornerPos = useCallback(
    (clientX: number, clientY: number, cornerKey: CornerKey) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.min(100, Math.max(0, parseFloat(rawX.toFixed(1))));
      const clampedY = Math.min(100, Math.max(0, parseFloat(rawY.toFixed(1))));

      setCorners((prev) => ({
        ...prev,
        [cornerKey]: { x: clampedX, y: clampedY },
      }));
    },
    []
  );

  // Arraste do bloco inteiro da seleção
  const updateAreaPos = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !dragAreaStart) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = ((clientX - dragAreaStart.clientX) / rect.width) * 100;
      const deltaYPct = ((clientY - dragAreaStart.clientY) / rect.height) * 100;

      const { initialCorners } = dragAreaStart;
      const points = Object.values(initialCorners) as Point[];
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));

      const allowedDeltaX = Math.min(100 - maxX, Math.max(-minX, deltaXPct));
      const allowedDeltaY = Math.min(100 - maxY, Math.max(-minY, deltaYPct));

      setCorners({
        tl: {
          x: parseFloat((initialCorners.tl.x + allowedDeltaX).toFixed(1)),
          y: parseFloat((initialCorners.tl.y + allowedDeltaY).toFixed(1)),
        },
        tr: {
          x: parseFloat((initialCorners.tr.x + allowedDeltaX).toFixed(1)),
          y: parseFloat((initialCorners.tr.y + allowedDeltaY).toFixed(1)),
        },
        br: {
          x: parseFloat((initialCorners.br.x + allowedDeltaX).toFixed(1)),
          y: parseFloat((initialCorners.br.y + allowedDeltaY).toFixed(1)),
        },
        bl: {
          x: parseFloat((initialCorners.bl.x + allowedDeltaX).toFixed(1)),
          y: parseFloat((initialCorners.bl.y + allowedDeltaY).toFixed(1)),
        },
      });
    },
    [dragAreaStart]
  );

  // Listeners globais de movimento
  useEffect(() => {
    if (!activeCorner && !isDraggingArea) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (activeCorner) {
        updateCornerPos(e.clientX, e.clientY, activeCorner);
      } else if (isDraggingArea) {
        updateAreaPos(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (activeCorner) {
          updateCornerPos(touch.clientX, touch.clientY, activeCorner);
        } else if (isDraggingArea) {
          updateAreaPos(touch.clientX, touch.clientY);
        }
      }
    };

    const handlePointerUp = () => {
      setActiveCorner(null);
      setIsDraggingArea(false);
      setDragAreaStart(null);
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
  }, [activeCorner, isDraggingArea, updateCornerPos, updateAreaPos]);

  const handleStartDragCorner = (cornerKey: CornerKey, clientX: number, clientY: number) => {
    setIsManualAdjust(true);
    setActiveCorner(cornerKey);
    setSelectedCornerForNudge(cornerKey);
    updateCornerPos(clientX, clientY, cornerKey);
  };

  const handleStartDragArea = (clientX: number, clientY: number) => {
    setIsManualAdjust(true);
    setIsDraggingArea(true);
    setDragAreaStart({ clientX, clientY, initialCorners: { ...corners } });
  };

  // Ajusta seleção para uma proporção física específica
  const applyPresetAspect = (wMm: number, hMm: number) => {
    setIsManualAdjust(true);
    const imgAspect = aspectRatio || (imageDimensions ? imageDimensions.width / imageDimensions.height : 1);
    setCorners(computeCornersForAspect(wMm, hMm, imgAspect));
  };

  // Selecionar 100% da imagem
  const handleSelectAll = () => {
    setIsManualAdjust(true);
    setCorners(DEFAULT_FULL_CORNERS);
  };

  // Margem segura de 5%
  const handleSafeMargin = () => {
    setIsManualAdjust(true);
    setCorners(DEFAULT_MARGIN_CORNERS);
  };

  // Redefinir para o padrão do cartão atual
  const handleResetCorners = () => {
    const imgAspect = aspectRatio || (imageDimensions ? imageDimensions.width / imageDimensions.height : 1);
    if (Math.abs(cardAspect - imgAspect) / imgAspect > 0.03) {
      setCorners(computeCornersForAspect(cardWidth, cardHeight, imgAspect));
    } else {
      setCorners(DEFAULT_FULL_CORNERS);
    }
    setIsManualAdjust(false);
  };

  // Micro-ajuste direcional
  const handleNudge = (dx: number, dy: number) => {
    setIsManualAdjust(true);
    setCorners((prev) => {
      const current = prev[selectedCornerForNudge];
      return {
        ...prev,
        [selectedCornerForNudge]: {
          x: Math.min(100, Math.max(0, Number((current.x + dx).toFixed(1)))),
          y: Math.min(100, Math.max(0, Number((current.y + dy).toFixed(1)))),
        },
      };
    });
  };

  const activeCornerPoint = activeCorner ? corners[activeCorner] : null;
  const areaPercent = calculateAreaPercent();

  // Dimensões em pixels da área recortada em tempo real
  const rawCropW = imageDimensions
    ? Math.round((imageDimensions.width * Math.abs(corners.tr.x - corners.tl.x + corners.br.x - corners.bl.x)) / 200)
    : 0;
  const rawCropH = imageDimensions
    ? Math.round((imageDimensions.height * Math.abs(corners.bl.y - corners.tl.y + corners.br.y - corners.tr.y)) / 200)
    : 0;
  const selectedPxWidth = Math.max(1, rawCropW);
  const selectedPxHeight = Math.max(1, rawCropH);

  // Resolução e DPI efetivo calculados na hora
  const effectiveDpi = imageDimensions && cardWidth > 0
    ? Math.round(selectedPxWidth / (cardWidth / 25.4))
    : 300;
  const mm2PerPx = (cardWidth * cardHeight) / (selectedPxWidth * selectedPxHeight);
  const minDetectableUm = Math.max(10, Math.round(Math.sqrt(mm2PerPx) * 1000));

  // Lupa de precisão
  const containerRect = containerRef.current?.getBoundingClientRect();
  const mainW = containerRect ? containerRect.width : 340;
  const mainH = containerRect ? containerRect.height : 180;

  const loupeSize = 144;
  const loupeCenter = loupeSize / 2;
  const zoomScale = 3.0;

  const zoomedW = mainW * zoomScale;
  const zoomedH = mainH * zoomScale;

  let loupeImgLeft = 0;
  let loupeImgTop = 0;

  if (activeCornerPoint) {
    loupeImgLeft = loupeCenter - (activeCornerPoint.x / 100) * zoomedW;
    loupeImgTop = loupeCenter - (activeCornerPoint.y / 100) * zoomedH;
  }

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
          <span>Passo 3 de 6</span>
          <span>Dimensionamento & Seleção do Cartão</span>
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

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-3.5">
        {/* Instruction Alert */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface leading-relaxed">
            <strong className="text-primary font-bold">Ajuste os 4 cantos azuis</strong> para delimitar a área útil do cartão. A resolução e o DPI da área são calculados em tempo real.
          </p>
        </div>

        {/* Quick Format Chips Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => applyPresetAspect(76, 26)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
              cardWidth === 76 && cardHeight === 26 && areaPercent < 100
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface'
            }`}
          >
            Cartão 76×26 mm
          </button>

          <button
            type="button"
            onClick={() => applyPresetAspect(76, 52)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition-all cursor-pointer"
          >
            Cartão 76×52 mm
          </button>

          <button
            type="button"
            onClick={() => applyPresetAspect(26, 38)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition-all cursor-pointer"
          >
            Cartão 26×38 mm
          </button>

          <button
            type="button"
            onClick={handleSelectAll}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
              areaPercent === 100
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface'
            }`}
          >
            100% Foto Inteira
          </button>
        </div>

        {/* Card Image Interactive Workspace Frame (Zero Letterboxing, Zero Margin Offset) */}
        <div className="w-full bg-neutral-950 rounded-2xl p-2.5 border-2 border-outline-variant shadow-md flex items-center justify-center overflow-visible">
          {/* Workspace Container: Tightly shrink-wrapped to the image element */}
          <div
            ref={containerRef}
            className="relative inline-block max-w-full max-h-[50vh] touch-none select-none cursor-crosshair mx-auto rounded-lg overflow-visible"
            onClick={(e) => {
              if (!activeCorner && !isDraggingArea) {
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
            {/* Full Sample Image - Rendered with exact natural aspect ratio without empty bars */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Cartão hidrossensível original"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  const imgW = img.naturalWidth;
                  const imgH = img.naturalHeight;
                  const imgAspect = imgW / imgH;
                  setImageDimensions({ width: imgW, height: imgH });
                  setAspectRatio(imgAspect);
                }
              }}
              className="block max-h-[50vh] max-w-full w-auto h-auto rounded-lg pointer-events-none select-none shadow-sm object-contain"
            />

            {/* Polygon Overlay & Selection Border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Draggable Polygon Interior */}
              <polygon
                points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                fill="rgba(0, 229, 255, 0.22)"
                stroke="#00E5FF"
                strokeWidth="1.5"
                strokeDasharray={areaPercent === 100 ? 'none' : '2,2'}
                className="pointer-events-auto cursor-move"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleStartDragArea(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length > 0) {
                    handleStartDragArea(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />

              {/* Crosshair Guidelines for Active Corner */}
              {activeCornerPoint && (
                <>
                  <line
                    x1="0"
                    y1={activeCornerPoint.y}
                    x2="100"
                    y2={activeCornerPoint.y}
                    stroke="rgba(0, 229, 255, 0.8)"
                    strokeWidth="0.6"
                    strokeDasharray="1,1"
                  />
                  <line
                    x1={activeCornerPoint.x}
                    y1="0"
                    x2={activeCornerPoint.x}
                    y2="100"
                    stroke="rgba(0, 229, 255, 0.8)"
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
                    handleStartDragCorner(cornerKey, e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length > 0) {
                      handleStartDragCorner(cornerKey, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className="absolute z-20 -ml-6 -mt-6 w-12 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing group touch-none"
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
                    className={`absolute text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-black/90 text-cyan-300 backdrop-blur-xs border border-cyan-400/50 pointer-events-none whitespace-nowrap shadow-sm ${
                      cornerKey === 'tl' || cornerKey === 'bl' ? 'left-8' : 'right-8'
                    } ${cornerKey === 'tl' || cornerKey === 'tr' ? '-top-2' : '-bottom-2'}`}
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

        {/* Live Resolution & Metrology Panel (Calculado em tempo real pela área azul) */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3.5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                Metrologia & Resolução da Área
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              effectiveDpi >= 300
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              {effectiveDpi >= 300 ? 'Alta Resolução' : 'Resolução Básica'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* 1. Tamanho do Cartão */}
            <div className="bg-surface-container rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase">Cartão Físico</span>
              <span className="text-xs font-extrabold text-primary mt-0.5">
                {cardWidth} × {cardHeight} mm
              </span>
              <span className="text-[9px] text-on-surface-variant font-medium">({cardAspect.toFixed(2)}:1)</span>
            </div>

            {/* 2. Resolução da Seleção */}
            <div className="bg-surface-container rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase">Resolução da Área</span>
              <span className="text-xs font-extrabold text-on-surface mt-0.5">
                {selectedPxWidth} × {selectedPxHeight} px
              </span>
              <span className="text-[9px] text-on-surface-variant font-medium">{areaPercent}% da imagem</span>
            </div>

            {/* 3. DPI Efetivo */}
            <div className="bg-surface-container rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase">DPI Efetivo</span>
              <span className={`text-xs font-extrabold mt-0.5 ${
                effectiveDpi >= 300 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {effectiveDpi} DPI
              </span>
              <span className="text-[9px] text-on-surface-variant font-medium">calibração óptica</span>
            </div>

            {/* 4. Menor Gota Detectável */}
            <div className="bg-surface-container rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase">Menor Gota</span>
              <span className="text-xs font-extrabold text-primary mt-0.5">
                ≥ {minDetectableUm} µm
              </span>
              <span className="text-[9px] text-on-surface-variant font-medium">sensibilidade ASABE</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Precision Controls */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 shadow-xs flex flex-col gap-2.5">
          <div className="flex flex-col gap-2 border-b border-outline-variant/60 pb-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Menu de Ajuste da Área</span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1">
                <Move className="w-3 h-3 text-primary" /> Arraste o centro ou os cantos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
              {/* Selecionar Tudo - 100% Exato */}
              <button
                type="button"
                onClick={handleSelectAll}
                className={`h-11 px-1.5 border text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap overflow-hidden text-ellipsis shadow-2xs ${
                  areaPercent === 100
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface'
                }`}
                title="Selecionar 100% da imagem original"
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Selecionar tudo</span>
              </button>

              {/* Proporção do Cartão */}
              <button
                type="button"
                onClick={handleResetCorners}
                className="h-11 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis shadow-2xs"
                title={`Ajustar na proporção exata do cartão (${cardWidth}×${cardHeight} mm)`}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Cartão {cardWidth}×{cardHeight}</span>
              </button>

              {/* Margem Segura (5%) */}
              <button
                type="button"
                onClick={handleSafeMargin}
                className="h-11 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis shadow-2xs"
                title="Aplicar margem segura de 5%"
              >
                <Scan className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Margem 5%</span>
              </button>

              {/* Redefinir */}
              <button
                type="button"
                onClick={handleResetCorners}
                className="h-11 px-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis shadow-2xs"
                title="Redefinir seleção"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Redefinir</span>
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
                    className={`px-2 py-2.5 min-h-[44px] rounded-lg text-[11px] font-extrabold transition-all cursor-pointer text-center truncate ${
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
                onClick={() => handleNudge(0, -0.5)}
                className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-t-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                title="Mover 0.5% para cima"
              >
                ▲
              </button>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => handleNudge(-0.5, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-l-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover 0.5% para a esquerda"
                >
                  ◀
                </button>
                <div className="w-8 h-7 bg-surface-container-high border-t border-b border-outline-variant flex items-center justify-center text-[9px] font-bold text-primary">
                  0.5%
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(0.5, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-r-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover 0.5% para a direita"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(0, 0.5)}
                className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-b-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                title="Mover 0.5% para baixo"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Card Color Selector */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface">Tipo de Cartão:</span>
          <div className="flex gap-2">
            {(['Amarelo', 'Branco'] as CardColor[]).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChangeCardColor(color)}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  cardColor === color
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {color === 'Amarelo' ? '🟡 Papel Amarelo' : '⚪ Papel Branco'}
              </button>
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onNext(corners)}
          className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <span>Avançar para Ajuste de Detecção</span>
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
