import React, { useEffect, useState } from 'react';
import { Moon, Sun, Info, Download, Trash2, Shield, Sliders, Droplets, RotateCcw, Sparkles, Smartphone, CheckCircle2, Cookie } from 'lucide-react';
import { AnalysisData, DEFAULT_ENGINE_MODE, DEFAULT_NOZZLE_CRITERIA, EngineMode, NozzleCriteria, NozzleCriteriaMode } from '../types';
import { downloadAllAnalysesCsv } from '../utils/generateCsvReport';
import { usePwaInstall } from '../hooks/usePwaInstall';

interface MoreViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onClearData: () => void;
  recentAnalyses: AnalysisData[];
  nozzleCriteria: NozzleCriteria;
  onChangeNozzleCriteria: (criteria: NozzleCriteria) => void;
  engineMode?: EngineMode;
  onChangeEngineMode?: (mode: EngineMode) => void;
  userName?: string;
  onLogout?: () => Promise<void> | void;
}

const MODE_DESCRIPTIONS: Record<NozzleCriteriaMode, string> = {
  absoluto:
    'Só o tamanho do desvio importa. Um bico 8% acima e outro 8% abaixo da média recebem a mesma recomendação.',
  direcional:
    'Separa as causas: acima da média o orifício está desgastado e a limpeza não recupera a vazão, então a recomendação é substituir. Abaixo da média é obstrução, e limpar resolve até o limite maior.',
};

export const MoreView: React.FC<MoreViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onClearData,
  recentAnalyses,
  nozzleCriteria,
  onChangeNozzleCriteria,
  engineMode = DEFAULT_ENGINE_MODE,
  onChangeEngineMode,
  userName,
  onLogout,
}) => {
  const { isInstalled, isIOS, hasNativePrompt, promptInstall } = usePwaInstall();
  const [showIosTip, setShowIosTip] = useState(false);

  // Rascunho local para os campos numéricos: deixa o usuário apagar e redigitar sem
  // que a normalização reescreva o valor a cada tecla.
  const [cleanDraft, setCleanDraft] = useState(String(nozzleCriteria.cleanThresholdPercent));
  const [replaceDraft, setReplaceDraft] = useState(String(nozzleCriteria.replaceThresholdPercent));

  useEffect(() => {
    setCleanDraft(String(nozzleCriteria.cleanThresholdPercent));
    setReplaceDraft(String(nozzleCriteria.replaceThresholdPercent));
  }, [nozzleCriteria.cleanThresholdPercent, nozzleCriteria.replaceThresholdPercent]);

  const commitThresholds = () => {
    onChangeNozzleCriteria({
      ...nozzleCriteria,
      cleanThresholdPercent: Number(cleanDraft.replace(',', '.')),
      replaceThresholdPercent: Number(replaceDraft.replace(',', '.')),
    });
  };

  const isDefaultCriteria =
    nozzleCriteria.mode === DEFAULT_NOZZLE_CRITERIA.mode &&
    nozzleCriteria.cleanThresholdPercent === DEFAULT_NOZZLE_CRITERIA.cleanThresholdPercent &&
    nozzleCriteria.replaceThresholdPercent === DEFAULT_NOZZLE_CRITERIA.replaceThresholdPercent;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIOS) {
      setShowIosTip(!showIosTip);
    } else {
      alert('Para instalar, use o menu do seu navegador (três pontinhos ou ícone de instalação na barra de endereço) e selecione "Instalar GotaFiel".');
    }
  };

  return (
    <main className="flex-1 pb-24 px-4 pt-4 max-w-[1200px] mx-auto w-full md:pl-[236px]">
      <div className="flex flex-col gap-5 max-w-md mx-auto">
        {userName && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">USUÁRIO</h2>
              <p className="text-sm font-bold text-on-surface mt-1">{userName}</p>
              <p className="text-[11px] text-on-surface-variant mt-1">As análises recentes desta conta vêm do Neon.</p>
            </div>
            {onLogout && <button onClick={onLogout} className="h-10 px-3 rounded-lg border border-outline-variant text-xs font-bold text-error hover:bg-error-container/20">Sair</button>}
          </section>
        )}

        {/* Instalação do Aplicativo / PWA */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              APLICATIVO & USO OFFLINE
            </h2>
            {isInstalled ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Instalado
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                PWA Disponível
              </span>
            )}
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            O GotaFiel pode ser instalado diretamente no seu celular ou computador. Ele abre instantaneamente sem barra do navegador e funciona mesmo sem sinal de internet na lavoura.
          </p>

          {!isInstalled && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full h-11 bg-primary text-on-primary font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                {isIOS ? 'Como Instalar no iPhone/iPad' : 'Instalar Aplicativo GotaFiel'}
              </button>

              {showIosTip && (
                <div className="p-3 bg-surface-container rounded-xl text-[11px] text-on-surface-variant leading-relaxed border border-outline-variant/60 flex flex-col gap-1">
                  <strong>No Safari do iPhone/iPad:</strong>
                  <span>1. Toque no botão <strong>Compartilhar</strong> (ícone com seta para cima na barra inferior).</span>
                  <span>2. Selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                </div>
              )}
            </div>
          )}
        </section>

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

        {/* Motor de Análise de Imagem */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-primary" />
            MOTOR DE ANÁLISE DE IMAGEM
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Escolha o algoritmo padrão utilizado no processamento dos cartões hidrossensíveis:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Motor Híbrido Adaptativo */}
            <button
              type="button"
              onClick={() => onChangeEngineMode?.('hybrid')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                engineMode === 'hybrid'
                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                  : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                engineMode === 'hybrid' ? 'border-primary' : 'border-outline'
              }`}>
                {engineMode === 'hybrid' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">Motor Híbrido Adaptativo</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Padrão Recomendado (95%+ precisão)
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant leading-relaxed">
                  Fusão espectral azul-amarelo e contraste luminoso, normalização contínua de sombras/iluminação, separação morfológica de aglomerados e filtragem de fibras e riscos.
                </span>
              </div>
            </button>

            {/* Motor Cromático */}
            <button
              type="button"
              onClick={() => onChangeEngineMode?.('chromatic')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                engineMode === 'chromatic'
                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                  : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                engineMode === 'chromatic' ? 'border-primary' : 'border-outline'
              }`}>
                {engineMode === 'chromatic' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">Motor Cromático (Espectral)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20">
                    B - max(R,G)
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant leading-relaxed">
                  Binarização direta por isolamento do canal azul sobre fundo amarelo com limiarização automática de Otsu.
                </span>
              </div>
            </button>

            {/* Motor Monocromático */}
            <button
              type="button"
              onClick={() => onChangeEngineMode?.('monochrome')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                engineMode === 'monochrome'
                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                  : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                engineMode === 'monochrome' ? 'border-primary' : 'border-outline'
              }`}>
                {engineMode === 'monochrome' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">Motor Monocromático (Escala de Cinza)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant border border-outline-variant">
                    Contraste Óptico
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant leading-relaxed">
                  Binarização em escala de cinza por contraste de densidade com suavização espacial 3×3 e preenchimento morfológico.
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Limites do método: não apresentar classificação ASABE simulada. */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" />
            COMO INTERPRETAR AS MEDIÇÕES
          </h2>
          <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-on-surface-variant leading-relaxed">
            <li>Cobertura é a fração do cartão marcada pela pulverização.</li>
            <li>Contagem, densidade e tamanhos ficam pouco confiáveis quando as manchas se sobrepõem.</li>
            <li>DV e volume são estimativas dependentes da relação de espalhamento do papel e do líquido.</li>
            <li>A classe ASABE S572.3 exige comparação padronizada com bicos de referência; ela não é inferida apenas do DV0,5 deste cartão.</li>
            <li>O GotaFiel mede o cartão, mas não decide sozinho se a aplicação foi agronomicamente adequada.</li>
          </ul>
        </section>

        {/* Nozzle Calibration Criteria */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-primary" />
              CRITÉRIOS DA AFERIÇÃO DE BICOS
            </h2>
            {!isDefaultCriteria && (
              <button
                onClick={() => onChangeNozzleCriteria(DEFAULT_NOZZLE_CRITERIA)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Padrão
              </button>
            )}
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Define como o desvio de vazão de cada bico vira uma recomendação na calculadora
            de aferição. Vale para as próximas aferições; as já salvas não são reescritas.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Como interpretar o desvio
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['absoluto', 'direcional'] as NozzleCriteriaMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onChangeNozzleCriteria({ ...nozzleCriteria, mode })}
                  className={`p-2.5 rounded-lg border text-xs font-bold capitalize transition-colors cursor-pointer ${
                    nozzleCriteria.mode === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {mode}
                  {mode === DEFAULT_NOZZLE_CRITERIA.mode && (
                    <span className="block text-[9px] font-medium opacity-70 normal-case">padrão</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
              {MODE_DESCRIPTIONS[nozzleCriteria.mode]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="criterio-limpar" className="text-xs font-semibold text-on-surface-variant">
                Sai do OK a partir de
              </label>
              <div className="relative">
                <input
                  id="criterio-limpar"
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={cleanDraft}
                  onChange={(e) => setCleanDraft(e.target.value)}
                  onBlur={commitThresholds}
                  className="w-full h-11 border border-outline-variant rounded-lg pl-3 pr-7 bg-surface text-on-surface text-sm font-semibold focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="criterio-substituir" className="text-xs font-semibold text-on-surface-variant">
                Substituir a partir de
              </label>
              <div className="relative">
                <input
                  id="criterio-substituir"
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={replaceDraft}
                  onChange={(e) => setReplaceDraft(e.target.value)}
                  onBlur={commitThresholds}
                  className="w-full h-11 border border-outline-variant rounded-lg pl-3 pr-7 bg-surface text-on-surface text-sm font-semibold focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Regra ativa em texto, para conferência antes de ir a campo. */}
          <div className="text-[11px] rounded-lg border border-outline-variant/70 bg-surface-container-low p-2.5 flex flex-col gap-1">
            <span className="font-bold text-on-surface">Regra ativa</span>
            <span className="text-on-surface-variant">
              Abaixo de {nozzleCriteria.cleanThresholdPercent}% de desvio: <strong>OK</strong>.
            </span>
            {nozzleCriteria.mode === 'direcional' ? (
              <>
                <span className="text-on-surface-variant">
                  Acima da média com {nozzleCriteria.cleanThresholdPercent}% ou mais:{' '}
                  <strong>SUBSTITUIR</strong>.
                </span>
                <span className="text-on-surface-variant">
                  Abaixo da média entre {nozzleCriteria.cleanThresholdPercent}% e{' '}
                  {nozzleCriteria.replaceThresholdPercent}%: <strong>LIMPAR</strong>; a partir de{' '}
                  {nozzleCriteria.replaceThresholdPercent}%: <strong>SUBSTITUIR</strong>.
                </span>
              </>
            ) : (
              <span className="text-on-surface-variant">
                Desvio entre {nozzleCriteria.cleanThresholdPercent}% e{' '}
                {nozzleCriteria.replaceThresholdPercent}%, para cima ou para baixo:{' '}
                <strong>LIMPAR</strong>; a partir de {nozzleCriteria.replaceThresholdPercent}%:{' '}
                <strong>SUBSTITUIR</strong>.
              </span>
            )}
          </div>
        </section>

        {/* Data & Storage */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            DADOS & ARMAZENAMENTO
          </h2>

          <button
            onClick={() => {
              // Exporta as análises REAIS salvas no app — antes aqui saía uma tabela
              // fixa de demonstração que não tinha relação com os dados do usuário.
              try {
                downloadAllAnalysesCsv(recentAnalyses);
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Não há análises para exportar.');
              }
            }}
            disabled={recentAnalyses.length === 0}
            className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors cursor-pointer text-sm font-medium text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-primary" />
              <span>
                Exportar Todos os Dados (CSV)
                {recentAnalyses.length > 0 && (
                  <span className="text-on-surface-variant font-normal"> · {recentAnalyses.length} análise{recentAnalyses.length > 1 ? 's' : ''}</span>
                )}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('gotafiel_cookie_consent');
              window.location.reload();
            }}
            className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors cursor-pointer text-sm font-medium text-on-surface"
          >
            <div className="flex items-center gap-2.5">
              <Cookie className="w-4 h-4 text-primary" />
              <span>Privacidade & Cookies (LGPD)</span>
            </div>
            <span className="text-[11px] text-primary font-bold">Redefinir</span>
          </button>

          <button
            onClick={onClearData}
            className="w-full flex items-center justify-between p-3 border border-quality-poor/30 rounded-lg hover:bg-error-container/20 transition-colors cursor-pointer text-sm font-medium text-quality-poor"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4" />
              <span>Limpar preferências locais</span>
            </div>
          </button>
        </section>

        {/* About App Branding Card */}
        <section className="bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-brand-navy/5 border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-navy to-primary p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/icon.svg"
                alt="GotaFiel Logo"
                className="w-full h-full rounded-[14px] object-cover"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                GotaFiel
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  v2.5.0
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Metrologia & Análise Digital de Pulverização Agrícola
              </p>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Plataforma científica para leitura de cartões hidrossensíveis, calibração ISO 10625 de bicos, ordem WALES de tanque e mapeamento geoespacial da deposição foliar.
          </p>

          {/* Badges de Destaque */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-brand-navy/10 text-brand-navy dark:text-blue-300 border border-brand-navy/20">
              Metrologia Científica
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-brand-yellow/15 text-amber-800 dark:text-amber-300 border border-brand-yellow/30">
              PWA 100% Offline
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              Neon PostgreSQL
            </span>
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex flex-col gap-2 text-xs text-on-surface-variant">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>
                Desenvolvido por <strong>Thyago Toledo</strong>
              </span>
              <a
                href="https://github.com/ThyagoToledo/GotaFiel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1"
              >
                GitHub do Projeto
              </a>
            </div>

            <div className="text-[11px] text-on-surface-variant/90 border-t border-outline-variant/40 pt-2 flex flex-col gap-0.5">
              <span className="font-semibold text-on-surface">Consultoria & Validação Agronômica:</span>
              <span>• Eng. Agrônomo <strong>Carlos Alberto</strong></span>
              <span>• Eng. Agrônomo <strong>Marco Antônio Moreira de Freitas</strong></span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
