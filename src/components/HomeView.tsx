import React, { useState } from 'react';
import { Camera, ChevronRight, Search, Trash2, Activity, Award, Layers } from 'lucide-react';
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

  // Compute stats across recent analyses
  const totalCount = recentAnalyses.length;
  const avgCoverage = totalCount
    ? (recentAnalyses.reduce((acc, a) => acc + a.coveragePercent, 0) / totalCount).toFixed(1)
    : '—';
  const avgDensity = totalCount
    ? Math.round(recentAnalyses.reduce((acc, a) => acc + a.density, 0) / totalCount)
    : '—';

  // w-full no main é obrigatório: sem largura definida, `mx-auto` num item de
  // flex-column faz o elemento virar fit-content e adotar o próprio min-content, o que
  // esticava a página para 388px num aparelho de 360px e criava rolagem horizontal.
  return (
    <main className="px-4 pt-5 max-w-[1200px] mx-auto w-full pb-28 md:pl-[236px]">
      {/* Overview Dashboard Header Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-primary" /> Total
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-extrabold text-2xl text-on-surface">{totalCount}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">amostras</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-primary" /> Cobertura
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-extrabold text-2xl text-on-surface">{avgCoverage}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">% médio</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-primary" /> Densidade de Gotas
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-extrabold text-2xl text-on-surface">{avgDensity}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">gotas/cm²</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={onStartNewAnalysis}
        className="w-full bg-primary text-on-primary h-[110px] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.99] transition-all outline-none shadow-md mb-6 cursor-pointer"
      >
        <Camera className="w-10 h-10 stroke-[2]" />
        <span className="font-bold text-base tracking-wide">NOVA ANÁLISE DE CARTÃO</span>
      </button>

      {/* Recentes Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-xs text-on-surface-variant uppercase tracking-widest">
            ANÁLISES RECENTES ({filteredAnalyses.length})
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
          <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-8 text-center text-on-surface-variant text-xs">
            Nenhuma análise encontrada. Clique em &quot;Nova Análise de Cartão&quot; acima para realizar sua primeira leitura.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredAnalyses.map((item) => {
              let dotColorClass = 'bg-quality-good';
              let verdictLabel = 'Bom';
              if (item.verdict === 'REGULAR') {
                dotColorClass = 'bg-quality-regular';
                verdictLabel = 'Regular';
              } else if (item.verdict === 'RUIM' || item.verdict === 'EXCESSO') {
                dotColorClass = 'bg-quality-poor';
                verdictLabel = item.verdict === 'EXCESSO' ? 'Excesso' : 'Ruim';
              }

              return (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 flex items-center justify-between shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div
                    onClick={() => onSelectAnalysis(item)}
                    className="flex items-center gap-3.5 flex-1 min-w-0"
                  >
                    <div className={`w-3 h-3 rounded-full ${dotColorClass} shrink-0`} />
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-sm text-on-surface truncate">
                        {item.title}
                      </span>
                      {/* truncate também aqui: sem ele o subtítulo era cortado no meio
                          de um caractere pelo overflow do pai, sem reticências. */}
                      <span className="text-xs text-on-surface-variant truncate">
                        {verdictLabel} · {item.density} gotas/cm² · {item.coveragePercent}% cobertura
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-on-surface-variant">{item.date}</span>
                    {onDeleteAnalysis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnalysis(item.id);
                        }}
                        className="text-on-surface-variant/40 hover:text-error w-10 h-10 -mr-2 flex items-center justify-center rounded-full transition-colors"
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
