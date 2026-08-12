import React from 'react';
import { Moon, Sun, Info, Download, Trash2, Shield, Sliders } from 'lucide-react';

interface MoreViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onClearData: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onClearData,
}) => {
  return (
    <main className="flex-1 pb-24 px-4 pt-4 max-w-[1200px] mx-auto w-full md:pl-[240px]">
      <div className="flex flex-col gap-5 max-w-md mx-auto">
        {/* Theme Settings */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            APARÊNCIA & PREFERÊNCIAS
          </h2>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-on-surface">Modo Escuro</span>
                <span className="text-xs text-on-surface-variant">
                  {isDarkMode ? 'Tema escuro ativado' : 'Tema claro padrão para uso ao sol'}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                isDarkMode ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  isDarkMode ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ASABE Droplet Reference Table */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" />
            REFERÊNCIA DE CLASSIFICAÇÃO ASABE (S572)
          </h2>

          <div className="text-xs border border-outline-variant rounded-lg overflow-hidden divide-y divide-outline-variant/60">
            <div className="flex justify-between p-2.5 bg-surface-container-low font-semibold text-on-surface">
              <span>Classe de Gotas</span>
              <span>DV0,5 (µm)</span>
            </div>
            <div className="flex justify-between p-2.5 items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-asabe-very-fine" />
                Muito Fina
              </span>
              <span className="font-medium">&lt; 100 µm</span>
            </div>
            <div className="flex justify-between p-2.5 items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-asabe-fine" />
                Fina
              </span>
              <span className="font-medium">100 – 175 µm</span>
            </div>
            <div className="flex justify-between p-2.5 items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-asabe-medium" />
                Média
              </span>
              <span className="font-medium">175 – 250 µm</span>
            </div>
            <div className="flex justify-between p-2.5 items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-asabe-coarse" />
                Grossa
              </span>
              <span className="font-medium">250 – 375 µm</span>
            </div>
            <div className="flex justify-between p-2.5 items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-asabe-very-coarse" />
                Muito Grossa
              </span>
              <span className="font-medium">375 – 450 µm</span>
            </div>
          </div>
        </section>

        {/* Data & Storage */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            DADOS & ARMAZENAMENTO
          </h2>

          <button
            onClick={() => {
              const headers = ['Amostra', 'Status', 'Numero_Gotas_cm2', 'Cobertura_pct', 'Span_Homogeneidade'];
              const rows = [
                ['Amostra 1', 'Ideal', '266', '13.5', '1.04'],
                ['Amostra 2', 'Ideal', '248', '12.8', '1.08'],
                ['Amostra 3', 'Razoavel', '180', '9.2', '1.25'],
                ['Amostra 4', 'Ideal', '280', '14.1', '1.02'],
              ];
              const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `relatorio_gotas_${new Date().toISOString().slice(0,10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors cursor-pointer text-sm font-medium text-on-surface"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar Todos os Dados (CSV)</span>
            </div>
          </button>

          <button
            onClick={onClearData}
            className="w-full flex items-center justify-between p-3 border border-quality-poor/30 rounded-lg hover:bg-error-container/20 transition-colors cursor-pointer text-sm font-medium text-quality-poor"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4" />
              <span>Resetar Dados para Amostras Iniciais</span>
            </div>
          </button>
        </section>

        {/* About App */}
        <div className="text-center py-2 text-xs text-on-surface-variant">
          <p className="font-semibold text-primary">Spray Analysis — Agro-Precision System</p>
          <p className="mt-0.5">Versão 2.4.0 · Offline Ready</p>
        </div>
      </div>
    </main>
  );
};
