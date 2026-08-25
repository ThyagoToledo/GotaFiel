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
  ShieldAlert,
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

export const Step2Crop: React.FC<Step2CropProps> = ({
  imageUrl,
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

  // Measure natural dimensions & aspect ratio of the image to scale workspace perfectly
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = imageUrl;

    // Reset corners to 100% full image whenever a new image is loaded
    setCorners(DEFAULT_FULL_CORNERS);
    setIsManualAdjust(false);
    setActiveCorner(null);
    setIsDraggingArea(false);
  }, [imageUrl]);

  // Calculate approximate percentage area of quadrilateral (Shoelace formula)
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

  // Handle pointer/touch position updates for individual corner dragging
  const updateCornerPos = useCallback(
    (clientX: number, clientY: number, cornerKey: CornerKey) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;

      // Allow full range [0, 100] without artificial inner limits
      const clampedX = Math.min(100, Math.max(0, parseFloat(rawX.toFixed(1))));
      const clampedY = Math.min(100, Math.max(0, parseFloat(rawY.toFixed(1))));

      setCorners((prev) => ({
        ...prev,
        [cornerKey]: { x: clampedX, y: clampedY },
      }));
    },
    []
  );

  // Handle dragging the entire selection area in bulk (pan selection)
  const updateAreaPos = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !dragAreaStart) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = ((clientX - dragAreaStart.clientX) / rect.width) * 100;
      const deltaYPct = ((clientY - dragAreaStart.clientY) / rect.height) * 100;

      const { initialCorners } = dragAreaStart;

      // Calculate bounding box of initial corners to ensure whole polygon stays in [0, 100]
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

  // Global event handlers for drag tracking
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

  // Select 100% of the loaded image (Full Workspace)
  const handleSelectAll = () => {
    setIsManualAdjust(true);
    setCorners(DEFAULT_FULL_CORNERS);
  };

  // Safe Margins (5% margin)
  const handleSafeMargin = () => {
    setIsManualAdjust(true);
    setCorners(DEFAULT_MARGIN_CORNERS);
  };

  // Reset to original default (100% of image)
  const handleResetCorners = () => {
    setCorners(DEFAULT_FULL_CORNERS);
    setIsManualAdjust(false);
  };

  // Micro-nudge for a specific corner
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

  // Selected crop pixel size estimation
  const selectedPxWidth = imageDimensions
    ? Math.round((imageDimensions.width * Math.abs(corners.tr.x - corners.tl.x)) / 100)
    : null;
  const selectedPxHeight = imageDimensions
    ? Math.round((imageDimensions.height * Math.abs(corners.bl.y - corners.tl.y)) / 100)
    : null;

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
          <span>Dimensionamento & Seleção do Cartão</span>
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
            <strong className="text-primary font-bold">Ajuste os 4 cantos azuis</strong> para delimitar a área de análise do cartão hidrossensível ou use <strong className="text-primary font-bold">Selecionar tudo</strong> para utilizar a imagem inteira.
          </p>
        </div>

        {/* Card Image Interactive Workspace Frame */}
        <div className="w-full bg-neutral-950 rounded-2xl p-2.5 border-2 border-outline-variant shadow-md flex items-center justify-center overflow-visible">
          {/* Workspace Container: Aspect ratio dynamically matches image natural size with ZERO cropping and ZERO letterboxing */}
          <div
            ref={containerRef}
            style={{
              aspectRatio: `${aspectRatio}`,
              width: aspectRatio >= 1 ? '100%' : `min(100%, calc(420px * ${aspectRatio}))`,
              maxHeight: '52vh',
            }}
            className="relative rounded-xl overflow-visible touch-none select-none cursor-crosshair mx-auto"
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
            {/* Full Sample Image - Shown 100% complete without cropping */}
            <img
              src={imageUrl}
              alt="Cartão hidrossensível original"
              className="w-full h-full block rounded-lg pointer-events-none select-none object-contain"
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

        {/* Dimension & Selection Metadata Badge */}
        <div className="flex items-center justify-between bg-surface-container rounded-xl p-3 border border-outline-variant shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-quality-good shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">
                {areaPercent === 100 ? 'Imagem 100% Selecionada' : 'Área de Análise Personalizada'}
              </span>
              <span className="text-[11px] font-medium text-on-surface-variant">
                Área selecionada: <strong className="text-primary font-bold">{areaPercent}%</strong>
                {selectedPxWidth && selectedPxHeight ? ` (${selectedPxWidth} × ${selectedPxHeight} px)` : ''}
              </span>
            </div>
          </div>

          {imageDimensions && (
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Original</span>
              <span className="text-xs font-extrabold text-on-surface">
                {imageDimensions.width} × {imageDimensions.height} px
              </span>
            </div>
          )}
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

            <div className="grid grid-cols-3 gap-1.5 w-full">
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

              {/* Margem Segura (5% de margem) */}
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
              <div className="flex gap-1 my-0.5">
                <button
                  type="button"
                  onClick={() => handleNudge(-0.5, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-l-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover 0.5% para esquerda"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0.5, 0)}
                  className="w-8 h-7 bg-surface-container border border-outline-variant hover:bg-primary/20 rounded-r-md flex items-center justify-center text-xs font-bold text-on-surface active:scale-95 transition-all cursor-pointer"
                  title="Mover 0.5% para direita"
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

        {/* Color Selector */}
        <div className="flex flex-col gap-1 mt-0.5">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            COR DO PAPEL HIDROSSENSÍVEL
          </label>
          <span className="text-[11px] text-on-surface-variant leading-relaxed -mt-0.5">
            Registrado no relatório. Não altera a detecção — o ajuste fino é feito no passo 4.
          </span>
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
            <span>Confirmar Seleção da Imagem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
