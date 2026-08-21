import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  EyeOff,
  Eye,
  Info,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { AnalysisData, DropletItem } from '../../types';
import { recalculateAnalysisData } from '../../utils/sprayAnalytics';
import { runImagePipeline } from '../../core/workerPipeline';
import { CropCorners } from '../../core/types';

interface Step6InspectionProps {
  analysis: AnalysisData;
  onUpdateDroplets: (updatedDroplets: DropletItem[]) => void;
  onFinish: () => void;
}

const DEFAULT_FULL_CORNERS: CropCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
};

export const Step6Inspection: React.FC<Step6InspectionProps> = ({
  analysis,
  onUpdateDroplets,
  onFinish,
}) => {
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectionError, setDetectionError] = useState<string>('');

  // Viewport states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visual options
  const [showMask, setShowMask] = useState<boolean>(false);
  const [showCircles, setShowCircles] = useState<boolean>(true);
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [hoveredDroplet, setHoveredDroplet] = useState<DropletItem | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const binaryImageRef = useRef<HTMLImageElement | null>(null);

  // Auto-detect droplets if the analysis does not currently have them (e.g. opened from Neon DB history)
  useEffect(() => {
    if (analysis.droplets && analysis.droplets.length > 0) return;
    const targetImg = analysis.rectifiedImageUrl || analysis.imageUrl;
    if (!targetImg) return;

    let isMounted = true;
    setIsDetecting(true);
    setDetectionError('');

    const detect = async () => {
      try {
        const cornersToUse = analysis.rectifiedImageUrl
          ? DEFAULT_FULL_CORNERS
          : { tl: { x: 5, y: 10 }, tr: { x: 95, y: 10 }, br: { x: 95, y: 90 }, bl: { x: 5, y: 90 } };

        const result = await runImagePipeline(
          targetImg,
          cornersToUse,
          analysis.cardSizeMm || { width: 76, height: 26 },
          {
            method: analysis.analysisMethod ?? 'hybrid',
            thresholdAdjustment: analysis.sensitivity ?? 0,
            minAreaPx: 1,
            minDropletUm: 20,
            discardBorder: false,
            meanFilterPasses: analysis.meanFilterPasses ?? 1,
            fillHoles: analysis.fillHoles ?? true,
            splitOverlappingDroplets: true,
            filterArtifacts: true,
            normalizeIllumination: true,
          }
        );

        if (isMounted) {
          if (result.droplets && result.droplets.length > 0) {
            onUpdateDroplets(result.droplets);
          } else {
            setDetectionError('Nenhuma gota detectada nesta imagem com a sensibilidade atual.');
          }
          setIsDetecting(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Falha ao processar gotas para inspeção:', err);
          setDetectionError('Não foi possível mapear as gotas da imagem para inspeção.');
          setIsDetecting(false);
        }
      }
    };

    detect();

    return () => {
      isMounted = false;
    };
  }, [analysis.rectifiedImageUrl, analysis.imageUrl, analysis.droplets?.length]);

  // Load image element for canvas rendering
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  useEffect(() => {
    const src = analysis.rectifiedImageUrl || analysis.imageUrl;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Tenta carregar sem crossOrigin
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
        setImageLoaded(true);
      };
      fallbackImg.src = src;
    };
    img.src = src;
  }, [analysis.rectifiedImageUrl, analysis.imageUrl]);

  // Handle droplet toggle
  const toggleDroplet = useCallback(
    (id: string) => {
      const updated = analysis.droplets.map((d) =>
        d.id === id ? { ...d, included: !d.included } : d
      );
      onUpdateDroplets(updated);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }
      } catch {
        // Ignora vibração se não suportado
      }
    },
    [analysis.droplets, onUpdateDroplets]
  );

  // Restore all droplets
  const restoreAllDroplets = () => {
    const updated = analysis.droplets.map((d) => ({ ...d, included: true }));
    onUpdateDroplets(updated);
  };

  // Exclude border droplets
  const excludeBorders = () => {
    const updated = analysis.droplets.map((d) => {
      const isNearBorder = d.x < 3 || d.x > 97 || d.y < 5 || d.y > 95;
      return isNearBorder ? { ...d, included: false } : d;
    });
    onUpdateDroplets(updated);
  };

  // Exclude micro droplets (< 50 um)
  const excludeMicroDroplets = () => {
    const updated = analysis.droplets.map((d) =>
      d.diameterUm < 50 ? { ...d, included: false } : d
    );
    onUpdateDroplets(updated);
  };

  // Filter droplets by current tab
  const filteredDroplets = analysis.droplets.filter((d) => {
    if (sizeFilter === 'small') return d.diameterUm < 100;
    if (sizeFilter === 'medium') return d.diameterUm >= 100 && d.diameterUm <= 300;
    if (sizeFilter === 'large') return d.diameterUm > 300;
    return true;
  });

  const excludedCount = analysis.droplets.filter((d) => !d.included).length;
  const includedCount = analysis.droplets.filter((d) => d.included).length;

  // Recalculate stats in real-time
  const recalculated = recalculateAnalysisData(analysis);

  // Render Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Apply pan and zoom transforms
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);

    // 1. Draw Card Image
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Droplets Highlights
    if (showCircles && analysis.droplets.length > 0) {
      for (const drop of filteredDroplets) {
        const cx = (drop.x / 100) * width;
        const cy = (drop.y / 100) * height;

        // Radius based on real size with minimum visible boundary
        const rawRadius = drop.sizePx ? drop.sizePx / 2 : 4;
        const radius = Math.max(rawRadius, 4.5);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);

        if (drop.included) {
          // Included: Vibrant Red / Crimson
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = Math.max(1.5 / zoom, 1.2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
          ctx.fill();
          ctx.stroke();

          // Center target dot
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.2 / zoom, 0.8), 0, Math.PI * 2);
          ctx.fillStyle = '#DC2626';
          ctx.fill();
        } else {
          // Excluded: Slate Grey with strikethrough mark
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = Math.max(1.2 / zoom, 1);
          ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
          ctx.fill();
          ctx.stroke();

          // Draw small "x"
          const crossSize = Math.max(2.5, radius * 0.6);
          ctx.beginPath();
          ctx.moveTo(cx - crossSize, cy - crossSize);
          ctx.lineTo(cx + crossSize, cy + crossSize);
          ctx.moveTo(cx + crossSize, cy - crossSize);
          ctx.lineTo(cx - crossSize, cy + crossSize);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = Math.max(1 / zoom, 0.8);
          ctx.stroke();
        }

        // Highlight if hovered
        if (hoveredDroplet && hoveredDroplet.id === drop.id) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 3 / zoom, 0, Math.PI * 2);
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = Math.max(2.5 / zoom, 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [zoom, pan, showCircles, analysis.droplets, filteredDroplets, hoveredDroplet, imageLoaded]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Adjust canvas size to container aspect ratio
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const cardAspect = (analysis.cardSizeMm?.width || 76) / (analysis.cardSizeMm?.height || 26);
      const width = Math.min(rect.width, 900);
      const height = width / cardAspect;

      canvas.width = width;
      canvas.height = height;
      drawCanvas();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [analysis.cardSizeMm, drawCanvas]);

  // Find droplet near canvas coordinates
  const findDropletAtClient = (clientX: number, clientY: number): DropletItem | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

    // Transform back through zoom and pan
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const imgX = (canvasX - (centerX + pan.x)) / zoom + centerX;
    const imgY = (canvasY - (centerY + pan.y)) / zoom + centerY;

    let closest: DropletItem | null = null;
    let minDistance = Math.max(24 / zoom, 16); // Touch tolerance radius

    for (const drop of analysis.droplets) {
      const cx = (drop.x / 100) * canvas.width;
      const cy = (drop.y / 100) * canvas.height;
      const dist = Math.hypot(cx - imgX, cy - imgY);

      if (dist < minDistance) {
        minDistance = dist;
        closest = drop;
      }
    }

    return closest;
  };

  // Mouse / Touch handlers for Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else {
      const droplet = findDropletAtClient(e.clientX, e.clientY);
      setHoveredDroplet(droplet);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If not a significant drag movement, treat as tap / click to toggle droplet
    const distMoved = Math.hypot(e.clientX - dragStart.x - pan.x, e.clientY - dragStart.y - pan.y);
    if (distMoved < 6) {
      const droplet = findDropletAtClient(e.clientX, e.clientY);
      if (droplet) {
        toggleDroplet(droplet.id);
      }
    }
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(8, Math.max(0.8, Number((prev * factor).toFixed(2)))));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full pb-36">
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto px-4 pt-4 mb-2">
        <div className="flex justify-between items-center text-xs text-on-surface-variant uppercase font-semibold mb-1">
          <span>Passo 6 de 6</span>
          <span>Inspeção e Refinamento de Gotas</span>
        </div>
        <div className="flex gap-1.5 w-full">
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
          <div className="h-1 flex-1 bg-primary rounded-full" />
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="w-full bg-[#0b131e] border-y border-outline-variant shadow-inner select-none relative overflow-hidden py-2 px-2 flex flex-col items-center">
        {/* Top HUD Controls Overlay */}
        <div className="w-full max-w-4xl flex items-center justify-between gap-2 px-2 py-1 z-10">
          <div className="flex items-center gap-1.5 bg-surface-container/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-outline-variant text-xs shadow-sm">
            <span className="font-bold text-on-surface flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              {includedCount} Ativas
            </span>
            <span className="text-on-surface-variant">·</span>
            <span className="text-on-surface-variant font-medium">
              {excludedCount} Excluídas
            </span>
          </div>

          <div className="flex items-center gap-1 bg-surface-container/90 backdrop-blur-md p-1 rounded-xl border border-outline-variant shadow-sm">
            <button
              type="button"
              onClick={() => handleZoom(0.75)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface active:scale-95 transition-all"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-primary min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(1.33)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface active:scale-95 transition-all"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface active:scale-95 transition-all ml-0.5"
              title="Resetar enquadramento"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div
          ref={containerRef}
          className="w-full max-w-4xl relative flex items-center justify-center min-h-[160px] sm:min-h-[220px] my-1"
        >
          {isDetecting && (
            <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs font-bold text-on-surface">
                Detectando e mapeando gotas no cartão...
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Isolando componentes conexos e calculando diâmetros volumétricos
              </span>
            </div>
          )}

          {detectionError && (
            <div className="absolute inset-0 z-20 bg-background/90 flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
              <Info className="w-7 h-7 text-amber-500" />
              <span className="text-xs font-bold text-on-surface">{detectionError}</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setIsDragging(false)}
            className="rounded-lg shadow-md cursor-crosshair touch-none border border-outline-variant/30 max-w-full"
          />

          {/* Hover Tooltip */}
          {hoveredDroplet && !isDragging && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-surface-container-highest/95 backdrop-blur-md border border-outline-variant text-on-surface px-3 py-1 rounded-full text-xs font-medium shadow-md pointer-events-none flex items-center gap-2">
              <span className="font-bold text-primary">Ø {hoveredDroplet.diameterUm} µm</span>
              <span className="text-on-surface-variant">|</span>
              <span>{hoveredDroplet.included ? '✓ Incluída' : '× Excluída'}</span>
              <span className="text-[10px] text-on-surface-variant">
                ({(hoveredDroplet.areaMm2 * 1000).toFixed(1)} µm²)
              </span>
            </div>
          )}
        </div>

        {/* Bottom Tool Helper */}
        <div className="text-[11px] text-on-surface-variant/80 flex items-center gap-1.5 mt-1">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Toque ou clique sobre qualquer gota para incluí-la ou removê-la da análise.</span>
        </div>
      </div>

      {/* Filter Tabs & Quick Actions */}
      <div className="p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        {/* Size Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant">
          <button
            type="button"
            onClick={() => setSizeFilter('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sizeFilter === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Todas ({analysis.droplets.length})
          </button>
          <button
            type="button"
            onClick={() => setSizeFilter('small')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sizeFilter === 'small'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            &lt; 100µm
          </button>
          <button
            type="button"
            onClick={() => setSizeFilter('medium')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sizeFilter === 'medium'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            100–300µm
          </button>
          <button
            type="button"
            onClick={() => setSizeFilter('large')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sizeFilter === 'large'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            &gt; 300µm
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={restoreAllDroplets}
            disabled={excludedCount === 0}
            className="p-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs font-bold text-primary hover:bg-surface-container-low disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center justify-center gap-1 transition-all shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-primary" />
            <span>Restaurar Todas</span>
          </button>

          <button
            type="button"
            onClick={excludeBorders}
            disabled={analysis.droplets.length === 0}
            className="p-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-surface-container-low disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center justify-center gap-1 transition-all shadow-2xs"
          >
            <Filter className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Excluir Bordas</span>
          </button>

          <button
            type="button"
            onClick={excludeMicroDroplets}
            disabled={analysis.droplets.length === 0}
            className="p-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-surface-container-low disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center justify-center gap-1 transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Filtrar &lt; 50µm</span>
          </button>
        </div>
      </div>

      {/* Floating Recalculated Results Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
        <div className="max-w-md mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-outline-variant/60 pb-1.5">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Diagnóstico Recalculado em Tempo Real
            </span>
            <span className="text-[11px] font-extrabold text-primary">
              {recalculated.asabeCategory}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col bg-surface-container-low rounded-lg p-1.5">
              <span className="text-[10px] text-on-surface-variant font-medium">Gotas</span>
              <span className="font-extrabold text-base text-primary">
                {recalculated.totalDroplets.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex flex-col bg-surface-container-low rounded-lg p-1.5">
              <span className="text-[10px] text-on-surface-variant font-medium">Densidade</span>
              <span className="font-extrabold text-base text-on-surface">
                {recalculated.density}
              </span>
            </div>

            <div className="flex flex-col bg-surface-container-low rounded-lg p-1.5">
              <span className="text-[10px] text-on-surface-variant font-medium">Cobertura</span>
              <span className="font-extrabold text-base text-on-surface">
                {recalculated.coveragePercent}%
              </span>
            </div>

            <div className="flex flex-col bg-surface-container-low rounded-lg p-1.5">
              <span className="text-[10px] text-on-surface-variant font-medium">DMV / VMD</span>
              <span className="font-extrabold text-base text-on-surface">
                {recalculated.vmdUm} µm
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onFinish}
            className="w-full h-11 bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-sm mt-1"
          >
            <Check className="w-4 h-4" />
            Salvar e Concluir Inspeção
          </button>
        </div>
      </div>
    </div>
  );
};
