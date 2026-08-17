import React, { useState } from 'react';
import { Camera, ChevronRight, Search, Trash2, Activity, Award, Layers, Sparkles, Droplets, ArrowUpRight } from 'lucide-react';
import { AnalysisData } from '../types';

interface HomeViewProps {
  recentAnalyses: AnalysisData[];
  onStartNewAnalysis: () => void;
  onSelectAnalysis: (analysis: AnalysisData) => void;
  onDeleteAnalysis?: (analysisId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recentAnalyses,
  onStartNewAnalysis,
  onSelectAnalysis,
  onDeleteAnalysis,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnalyses = recentAnalyses.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Métricas agregadas das análises
  const totalCount = recentAnalyses.length;
  const coverageAnalyses = recentAnalyses.filter((analysis) => analysis.measurementQuality?.coverageReliable);
  const densityAnalyses = recentAnalyses.filter((analysis) => analysis.measurementQuality?.countDensityReliable);
  const avgCoverage = coverageAnalyses.length
    ? (coverageAnalyses.reduce((acc, a) => acc + a.coveragePercent, 0) / coverageAnalyses.length).toFixed(1)
    : '—';
  const avgDensity = densityAnalyses.length
    ? Math.round(densityAnalyses.reduce((acc, a) => acc + a.density, 0) / densityAnalyses.length)
    : '—';

  return (
    <main className="px-4 pt-5 max-w-[1200px] mx-auto w-full pb-28 md:pl-[236px]">
      {/* 1. Dashboard Overview Cards com Paleta Verde, Navy e Ouro */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {/* Total Amostras - Navy */}
        <div className="bg-surface-container-lowest border border-brand-navy/15 dark:border-brand-navy/30 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-brand-navy dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-brand-navy/10 text-brand-navy dark:text-blue-300 flex items-center justify-center">
              <Layers className="w-3 h-3" />
            </div>
            Total
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-black text-2xl text-on-surface">{totalCount}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">amostras</span>
          </div>
        </div>

        {/* Cobertura - Verde Primário */}
        <div className="bg-surface-container-lowest border border-primary/15 dark:border-primary/30 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="w-3 h-3" />
            </div>
            Cobertura
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-black text-2xl text-on-surface">{avgCoverage}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">% médio</span>
          </div>
        </div>

        {/* Densidade - Amarelo Ouro */}
        <div className="bg-surface-container-lowest border border-brand-yellow/30 dark:border-brand-yellow/40 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-brand-yellow/15 text-amber-800 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-3 h-3" />
            </div>
            Densidade
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-black text-2xl text-on-surface">{avgDensity}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">gotas/cm²</span>
          </div>
        </div>
      </div>

      {/* 2. Botão de Ação Primária em Destaque */}
      <button
        type="button"
        onClick={onStartNewAnalysis}
        className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary h-[105px] rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all outline-none shadow-md mb-6 cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <Camera className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="font-black text-sm sm:text-base tracking-wider uppercase flex items-center gap-2">
          Nova Análise de Cartão
          <ArrowUpRight className="w-4 h-4 opacity-80" />
        </span>
      </button>

      {/* 3. Seção de Análises Recentes */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-bold text-xs text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            Análises Recentes
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container font-black">
              {filteredAnalyses.length}
            </span>
          </h2>

          {recentAnalyses.length > 0 && (
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Buscar por talhão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
              />
              <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {filteredAnalyses.length === 0 ? (
          /* Empty State com Cartão Hidrossensível Ilustrado */
          <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-3xl p-8 text-center flex flex-col items-center gap-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-brand-yellow/15 border border-brand-yellow/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs">
              <Droplets className="w-8 h-8" />
            </div>

            <div className="max-w-sm flex flex-col gap-1">
              <h3 className="font-bold text-sm text-on-surface">
                Nenhum cartão analisado ainda
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Posicione seu cartão hidrossensível amarelo sobre uma superfície plana e clique no botão verde acima para fotografar e calcular as gotas.
              </p>
            </div>

            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="h-10 px-5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-primary-container cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Realizar Primeira Análise
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredAnalyses.map((item) => {
              let dotColorClass = 'bg-quality-poor';
              let qualityLabel = 'Inconclusiva';
              if (item.measurementQuality?.status === 'ADEQUADA') {
                dotColorClass = 'bg-quality-good';
                qualityLabel = 'Adequada';
              } else if (item.measurementQuality?.status === 'LIMITADA') {
                dotColorClass = 'bg-quality-regular';
                qualityLabel = 'Limitada';
              }

              return (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div
                    onClick={() => onSelectAnalysis(item)}
                    className="flex items-center gap-3.5 flex-1 min-w-0"
                  >
                    {/* Thumbnail da imagem ou ícone estilizado */}
                    {item.imageUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/10 border border-outline-variant/40 shrink-0 flex items-center justify-center">
                        <img
                          src={item.rectifiedImageUrl || item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant/60 flex items-center justify-center shrink-0">
                        <Droplets className="w-5 h-5 text-primary" />
                      </div>
                    )}

                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {item.title}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} title={qualityLabel} />
                      </div>
                      <span className="text-xs text-on-surface-variant truncate mt-0.5">
                        <strong>{item.density}</strong> gotas/cm² · <strong>{item.coveragePercent}%</strong> cob. · {item.vmdUm} µm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-medium text-on-surface-variant hidden sm:inline">{item.date}</span>
                    {onDeleteAnalysis && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnalysis(item.id);
                        }}
                        className="text-on-surface-variant/40 hover:text-error w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/20 transition-colors cursor-pointer"
                        title="Excluir"
                        aria-label="Excluir análise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
