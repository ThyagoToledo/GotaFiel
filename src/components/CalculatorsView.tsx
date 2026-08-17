import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Save,
  Trash2,
  Timer,
  Sparkles,
  Wind,
  Thermometer,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { calculateVolumeDeCalda, evaluateNozzles, calculateWeatherRisk } from '../utils/sprayAnalytics';
import { DEFAULT_NOZZLE_CRITERIA, NozzleCalibrationSession, NozzleCriteria } from '../types';

interface CalculatorsViewProps {
  nozzleSession: NozzleCalibrationSession;
  onSaveNozzleSession: (session: NozzleCalibrationSession) => void;
  nozzleCriteria?: NozzleCriteria;
}

type TargetCropType = 'fungicida_contato' | 'fungicida_sistemico' | 'inseticida' | 'herbicida_pos' | 'herbicida_pre';

const TARGET_RECOMMENDATIONS: Record<TargetCropType, { label: string; minDensity: number; maxDensity: number; desc: string }> = {
  fungicida_contato: { label: 'Fungicida de Contato', minDensity: 50, maxDensity: 70, desc: 'Alta densidade de gotas requerida para cobertura protetora completa.' },
  fungicida_sistemico: { label: 'Fungicida Sistêmico', minDensity: 30, maxDensity: 40, desc: 'Média densidade; absorção translaminar e sistêmica no tecido foliar.' },
  inseticida: { label: 'Inseticida', minDensity: 20, maxDensity: 30, desc: 'Densidade intermediária focada no dossel e hábito da praga.' },
  herbicida_pos: { label: 'Herbicida Pós-emergência', minDensity: 20, maxDensity: 30, desc: 'Gotas médias a grossas para atingir folhas de plantas daninhas com baixa deriva.' },
  herbicida_pre: { label: 'Herbicida Pré-emergência', minDensity: 15, maxDensity: 20, desc: 'Gotas grossas para atingir solo ou palhada com segurança.' },
};

export const CalculatorsView: React.FC<CalculatorsViewProps> = ({
  nozzleSession,
  onSaveNozzleSession,
  nozzleCriteria = DEFAULT_NOZZLE_CRITERIA,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'volume' | 'afericao' | 'clima' | 'diagnostico'>('volume');

  // Diagnóstico Rápido de Gotas State
  const [simDensity, setSimDensity] = useState<number>(45);
  const [simCoverage, setSimCoverage] = useState<number>(18);
  const [selectedTarget, setSelectedTarget] = useState<TargetCropType>('fungicida_sistemico');

  // Volume de Calda State
  const [vazao, setVazao] = useState<number>(0.8);
  const [espacamento, setEspacamento] = useState<number>(50);
  const [velocidade, setVelocidade] = useState<number>(6.5);
  const [copied, setCopied] = useState(false);

  // Clima & Risco de Deriva State
  const [tempC, setTempC] = useState<number>(26);
  const [umidade, setUmidade] = useState<number>(65);
  const [ventoKmh, setVentoKmh] = useState<number>(6);

  // Aferição de Bicos State
  const [nozzleVolumes, setNozzleVolumes] = useState<number[]>(
    nozzleSession.nozzles.map((n) => n.volumeMl)
  );

  // Field Timer State (60s collection timer)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      // Play web audio beep when collection finishes
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch (e) {
        // Audio fallback
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const toggleTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(60);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(60);
  };

  // Calculated Volume
  const volumeResult = calculateVolumeDeCalda(vazao, espacamento, velocidade);

  // Calculated Nozzle Evaluation
  const nozzleEval = evaluateNozzles(nozzleVolumes, nozzleCriteria);

  const handleCopyVolume = () => {
    navigator.clipboard?.writeText?.(`${volumeResult} L/ha`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPreset = (pVazao: number, pEspacamento: number, pVelocidade: number) => {
    setVazao(pVazao);
    setEspacamento(pEspacamento);
    setVelocidade(pVelocidade);
  };

  const handleUpdateNozzleVolume = (index: number, val: number) => {
    const updated = [...nozzleVolumes];
    updated[index] = val;
    setNozzleVolumes(updated);
  };

  const handleAddNozzle = () => {
    const avg = nozzleEval.overallAvgMl || 800;
    setNozzleVolumes([...nozzleVolumes, avg]);
  };

  const handleRemoveNozzle = (index: number) => {
    if (nozzleVolumes.length <= 1) return;
    const updated = nozzleVolumes.filter((_, i) => i !== index);
    setNozzleVolumes(updated);
  };

  const handleSaveAfericao = () => {
    const updatedNozzles = nozzleVolumes.map((vol, idx) => {
      const devObj = nozzleEval.nozzleDeviations[idx] || { deviationPercent: 0, actionRequired: 'OK' as const };
      return {
        id: idx + 1,
        label: `Bico ${idx + 1}`,
        volumeMl: vol,
        deviationPercent: devObj.deviationPercent,
        actionRequired: devObj.actionRequired,
      };
    });

    onSaveNozzleSession({
      ...nozzleSession,
      nozzleCount: nozzleVolumes.length,
      overallAvgMl: nozzleEval.overallAvgMl,
      flowAvgLmin: nozzleEval.flowAvgLmin,
      maxDevPercent: nozzleEval.maxDevPercent,
      nozzles: updatedNozzles,
    });

    alert('Aferição salva com sucesso!');
  };

  return (
    <main className="flex-1 pb-28 px-4 pt-4 max-w-[1200px] mx-auto w-full md:pl-[236px]">
      {/* Subtabs Selector */}
      <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant mb-6 max-w-md mx-auto shadow-sm">
        <button
          onClick={() => setActiveSubTab('volume')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'volume'
              ? 'bg-surface text-primary shadow-sm font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Volume Calda
        </button>
        <button
          onClick={() => setActiveSubTab('afericao')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'afericao'
              ? 'bg-surface text-primary shadow-sm font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Aferição Bicos
        </button>
        <button
          onClick={() => setActiveSubTab('clima')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'clima'
              ? 'bg-surface text-primary shadow-sm font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Clima & Deriva
        </button>
        <button
          onClick={() => setActiveSubTab('diagnostico')}
          className={`flex-1 py-3 min-h-[44px] text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'diagnostico'
              ? 'bg-surface text-primary shadow-sm font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Diagnóstico Gotas
        </button>
      </div>

      {activeSubTab === 'volume' ? (
        /* VOLUME DE CALDA CALCULATOR */
        <div className="flex flex-col gap-5 max-w-md mx-auto">
          {/* Quick Presets */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets Recomendados de Aplicação:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleApplyPreset(0.8, 50, 7.0)}
                className="p-2 bg-surface-container rounded-lg border border-outline-variant/60 hover:border-primary text-center font-medium"
              >
                <div className="font-bold text-on-surface">Soja</div>
                <div className="text-on-surface-variant text-[10px]">~100 L/ha</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(0.9, 50, 6.5)}
                className="p-2 bg-surface-container rounded-lg border border-outline-variant/60 hover:border-primary text-center font-medium"
              >
                <div className="font-bold text-on-surface">Milho</div>
                <div className="text-on-surface-variant text-[10px]">~124 L/ha</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(0.65, 50, 8.0)}
                className="p-2 bg-surface-container rounded-lg border border-outline-variant/60 hover:border-primary text-center font-medium"
              >
                <div className="font-bold text-on-surface">Herbicida</div>
                <div className="text-on-surface-variant text-[10px]">~78 L/ha</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1.1, 50, 6.0)}
                className="p-2 bg-surface-container rounded-lg border border-outline-variant/60 hover:border-primary text-center font-medium"
              >
                <div className="font-bold text-on-surface">Fungicida</div>
                <div className="text-on-surface-variant text-[10px]">~146 L/ha</div>
              </button>
            </div>
          </div>

          <form className="flex flex-col gap-3.5">
            {/* Input 1: Vazão do bico */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Vazão do bico por minuto</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={vazao}
                  onChange={(e) => setVazao(Number(e.target.value))}
                  className="w-full h-13 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-lg font-extrabold text-on-surface focus:outline-none focus:border-primary pr-20 shadow-xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                  L/min
                </span>
              </div>
            </div>

            {/* Input 2: Espaçamento */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Espaçamento entre bicos na barra</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={espacamento}
                  onChange={(e) => setEspacamento(Number(e.target.value))}
                  className="w-full h-13 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-lg font-extrabold text-on-surface focus:outline-none focus:border-primary pr-16 shadow-xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                  cm
                </span>
              </div>
            </div>

            {/* Input 3: Velocidade */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Velocidade do pulverizador</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={velocidade}
                  onChange={(e) => setVelocidade(Number(e.target.value))}
                  className="w-full h-13 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-lg font-extrabold text-on-surface focus:outline-none focus:border-primary pr-16 shadow-xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                  km/h
                </span>
              </div>
            </div>
          </form>

          {/* Result Panel */}
          {vazao <= 0 || espacamento <= 0 || velocidade <= 0 ? (
            <div className="bg-error-container text-on-error-container border border-error/30 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-error shrink-0" />
              <span className="text-xs font-bold">
                Informe valores positivos maiores que zero para vazão, espaçamento e velocidade para calcular o volume de calda.
              </span>
            </div>
          ) : (
            <div className="bg-secondary-container border border-secondary-fixed rounded-2xl p-5 flex flex-col gap-3 shadow-sm relative overflow-hidden mt-1">
              <div className="flex justify-between items-start z-10 relative">
                <div className="flex flex-col">
                  <h2 className="text-xs font-bold text-on-secondary-container uppercase tracking-widest">
                    VOLUME DE CALDA RESULTANTE
                  </h2>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-extrabold text-4xl text-on-secondary-container">
                      {volumeResult.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                    </span>
                    <span className="text-sm font-bold text-on-secondary-container">L/ha</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyVolume}
                  className="h-10 px-4 rounded-full bg-surface-container-lowest border border-outline text-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-quality-good" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <div className="z-10 relative border-t border-on-secondary-container/15 pt-2">
                <p className="text-[11px] text-on-secondary-container opacity-90 font-medium">
                  Fórmula: (Vazão L/min × 600) ÷ (Espaçamento cm × Velocidade km/h)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'afericao' ? (
        /* AFERIÇÃO DE BICOS CALCULATOR */
        <div className="flex flex-col gap-5 max-w-md mx-auto">
          {/* 60-second Field Collection Stopwatch/Timer */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg transition-colors ${
                isTimerRunning ? 'bg-primary text-on-primary animate-pulse' : 'bg-primary/10 text-primary'
              }`}>
                <Timer className="w-6 h-6" />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Cronômetro de Coleta (60s)</span>
                <span className="text-2xl font-black text-primary">
                  {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                  {String(timerSeconds % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTimer}
                className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white shadow-xs transition-all cursor-pointer ${
                  isTimerRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary-container'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'Pausar' : timerSeconds === 60 ? 'Iniciar' : 'Continuar'}</span>
              </button>

              <button
                onClick={resetTimer}
                title="Reiniciar cronômetro"
                className="h-10 w-10 bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface rounded-xl flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs">
              <p className="text-xs font-bold text-on-surface-variant mb-0.5">Volume Médio Coletado</p>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-3xl text-primary">
                  {nozzleEval.overallAvgMl}
                </span>
                <span className="text-sm font-bold text-primary">mL / bico</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 shadow-xs">
              <p className="text-[11px] font-bold text-on-surface-variant mb-0.5">Vazão Média Calibrada</p>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-xl text-on-surface">
                  {nozzleEval.flowAvgLmin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-on-surface-variant font-semibold">L/min</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 shadow-xs">
              <p className="text-[11px] font-bold text-on-surface-variant mb-0.5">Desvio Máximo</p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-extrabold text-xl ${
                    nozzleEval.maxDevPercent >= nozzleCriteria.replaceThresholdPercent
                      ? 'text-quality-poor'
                      : nozzleEval.maxDevPercent >= nozzleCriteria.cleanThresholdPercent
                      ? 'text-quality-regular'
                      : 'text-quality-good'
                  }`}
                >
                  {nozzleEval.maxDevPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Critério em vigor: o operador precisa saber com que régua o app julgou. */}
          <p className="text-[11px] text-on-surface-variant text-center -mt-2">
            Critério <span className="font-semibold capitalize">{nozzleCriteria.mode}</span> ·
            limpar a partir de {nozzleCriteria.cleanThresholdPercent}% · substituir a partir de{' '}
            {nozzleCriteria.replaceThresholdPercent}% · ajuste em Mais
          </p>

          {/* Diverging Bar Chart Section */}
          <section className="flex flex-col gap-3 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-2.5">
              <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                MEDIÇÃO INDIVIDUAL POR BICO
              </h2>
              <button
                onClick={handleAddNozzle}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer min-h-[40px] px-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Bico
              </button>
            </div>

            <div className="space-y-3.5">
              {nozzleVolumes.map((vol, idx) => {
                const devObj = nozzleEval.nozzleDeviations[idx] || {
                  deviationPercent: 0,
                  actionRequired: 'OK',
                };
                const dev = devObj.deviationPercent;
                const isReplace = devObj.actionRequired === 'SUBSTITUIR';
                const isClean = devObj.actionRequired === 'LIMPAR';

                let barColor = 'bg-quality-great';
                let devTextColor = 'text-quality-great';
                if (isClean) {
                  barColor = 'bg-quality-regular';
                  devTextColor = 'text-quality-regular';
                } else if (isReplace) {
                  barColor = 'bg-quality-poor';
                  devTextColor = 'text-quality-poor';
                }

                // Width percentage normalized to max 15% range
                const widthPercent = Math.min(100, Math.max(10, (Math.abs(dev) / 15) * 100));

                return (
                  <div key={idx} className="relative pb-2 border-b border-outline-variant/40 last:border-0 last:pb-0">
                    {/* flex-wrap: em telas de 320px o rótulo + selo + campo + desvio +
                        lixeira não cabem numa linha só e vazavam para fora do cartão. */}
                    <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1.5 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm text-on-surface">
                          Bico {idx + 1}
                        </span>
                        {isReplace && (
                          <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                            SUBSTITUIR
                          </span>
                        )}
                        {isClean && (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                            LIMPAR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {/* Editable input for mL */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={vol}
                            onChange={(e) => handleUpdateNozzleVolume(idx, Number(e.target.value))}
                            className="w-20 h-10 text-xs font-bold text-center border border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary"
                          />
                          <span className="text-[11px] text-on-surface-variant font-bold">mL</span>
                        </div>

                        <span className={`text-xs font-black min-w-[36px] text-right ${devTextColor}`}>
                          {dev > 0 ? `+${dev}%` : `${dev}%`}
                        </span>

                        {nozzleVolumes.length > 1 && (
                          <button
                            onClick={() => handleRemoveNozzle(idx)}
                            className="text-on-surface-variant/40 hover:text-error w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors"
                            title="Remover bico"
                            aria-label="Remover bico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Diverging Bar Container */}
                    <div className="relative h-4 w-full flex items-center bg-surface-container rounded-full overflow-hidden">
                      {/* Center Line (0%) */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-outline-variant z-10" />

                      {/* Bar Fill */}
                      {dev >= 0 ? (
                        <div
                          className={`absolute left-1/2 h-full ${barColor} rounded-r-full transition-all duration-200`}
                          style={{ width: `${widthPercent / 2}%` }}
                        />
                      ) : (
                        <div
                          className={`absolute right-1/2 h-full ${barColor} rounded-l-full transition-all duration-200`}
                          style={{ width: `${widthPercent / 2}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Action Button */}
          <button
            onClick={handleSaveAfericao}
            className="w-full h-[50px] bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-sm mt-1"
          >
            <Save className="w-5 h-5" />
            Salvar Aferição de Bicos
          </button>
        </div>
      ) : activeSubTab === 'clima' ? (
        /* CLIMA & RISCO DE DERIVA CALCULATOR */
        <div className="flex flex-col gap-5 max-w-md mx-auto">
          {(() => {
            const weatherEval = calculateWeatherRisk(tempC, umidade, ventoKmh);
            const isOptimal = weatherEval.status === 'OPTIMAL';
            const isEvap = weatherEval.status === 'EVAPORATION_WARNING';
            const isDrift = weatherEval.status === 'DRIFT_WARNING';

            return (
              <>
                {/* Weather Inputs */}
                <form className="flex flex-col gap-3.5 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface uppercase tracking-wider pb-1 border-b border-outline-variant/60">
                    <Thermometer className="w-4 h-4 text-primary" />
                    <span>Condições Atuais no Campo</span>
                  </div>

                  {/* Temperature Input */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Temperatura do Ar</span>
                      <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{tempC} °C</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="42"
                      value={tempC}
                      onChange={(e) => setTempC(Number(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #006439 0%, #006439 ${((tempC - 10) / (42 - 10)) * 100}%, #becabe ${((tempC - 10) / (42 - 10)) * 100}%, #becabe 100%)`,
                      }}
                      className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
                    />
                  </div>

                  {/* Humidity Input */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Umidade Relativa (UR)</span>
                      <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{umidade}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      value={umidade}
                      onChange={(e) => setUmidade(Number(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #006439 0%, #006439 ${((umidade - 20) / (95 - 20)) * 100}%, #becabe ${((umidade - 20) / (95 - 20)) * 100}%, #becabe 100%)`,
                      }}
                      className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
                    />
                  </div>

                  {/* Wind Input */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Velocidade do Vento</span>
                      <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{ventoKmh} km/h</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={ventoKmh}
                      onChange={(e) => setVentoKmh(Number(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #006439 0%, #006439 ${(ventoKmh / 25) * 100}%, #becabe ${(ventoKmh / 25) * 100}%, #becabe 100%)`,
                      }}
                      className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
                    />
                  </div>
                </form>

                {/* Weather Status Result Card */}
                <div
                  className={`rounded-2xl p-5 border flex flex-col gap-3 shadow-sm ${
                    isOptimal
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isEvap
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isDrift
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-purple-500/10 border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isOptimal ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      )}
                      <h2 className="text-sm font-extrabold text-on-surface">
                        {weatherEval.statusLabel}
                      </h2>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-surface text-xs font-black text-primary border border-outline-variant shadow-xs">
                      Delta T: {weatherEval.deltaT} °C
                    </div>
                  </div>

                  <p className="text-xs text-on-surface leading-relaxed font-medium">
                    {weatherEval.recommendation}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/60 text-center text-xs">
                    <div className="flex flex-col bg-surface/60 rounded-lg p-2 border border-outline-variant/40">
                      <span className="text-[10px] text-on-surface-variant font-bold">TEMPERATURA</span>
                      <span className="font-bold text-on-surface mt-0.5">{tempC} °C</span>
                    </div>
                    <div className="flex flex-col bg-surface/60 rounded-lg p-2 border border-outline-variant/40">
                      <span className="text-[10px] text-on-surface-variant font-bold">UMIDADE</span>
                      <span className="font-bold text-on-surface mt-0.5">{umidade}%</span>
                    </div>
                    <div className="flex flex-col bg-surface/60 rounded-lg p-2 border border-outline-variant/40">
                      <span className="text-[10px] text-on-surface-variant font-bold">VENTO</span>
                      <span className="font-bold text-on-surface mt-0.5">{ventoKmh} km/h</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        /* DIAGNÓSTICO RÁPIDO DE PULVERIZAÇÃO */
        <div className="flex flex-col gap-5 max-w-md mx-auto">
          {/* Target Selection */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Tipo de Aplicação / Alvo:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TARGET_RECOMMENDATIONS) as TargetCropType[]).map((key) => {
                const target = TARGET_RECOMMENDATIONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTarget(key)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                      selectedTarget === key
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-outline-variant bg-surface text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="text-xs font-bold">{target.label}</span>
                    <span className="text-[10px] opacity-80">{target.minDensity} a {target.maxDensity} gotas/cm²</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">
              {TARGET_RECOMMENDATIONS[selectedTarget].desc}
            </p>
          </div>

          {/* Density & Coverage Inputs */}
          <form className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            {/* Densidade */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                <span>Densidade de Gotas:</span>
                <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {simDensity} gotas/cm²
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={simDensity}
                onChange={(e) => setSimDensity(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #006439 0%, #006439 ${(simDensity / 120) * 100}%, #becabe ${(simDensity / 120) * 100}%, #becabe 100%)`,
                }}
                className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant">
                <span>0</span>
                <span>25 (Mínimo)</span>
                <span>50 (Ideal)</span>
                <span>120+</span>
              </div>
            </div>

            {/* Cobertura */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/60">
              <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                <span>Cobertura Estimada:</span>
                <span className={`font-extrabold px-2 py-0.5 rounded border ${
                  simCoverage >= 75
                    ? 'bg-error-container text-on-error-container border-error/30'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {simCoverage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simCoverage}
                onChange={(e) => setSimCoverage(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, ${simCoverage >= 75 ? '#ba1a1a' : '#006439'} 0%, ${simCoverage >= 75 ? '#ba1a1a' : '#006439'} ${simCoverage}%, #becabe ${simCoverage}%, #becabe 100%)`,
                }}
                className="w-full h-2.5 rounded-full cursor-pointer appearance-none"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant">
                <span>0%</span>
                <span>20% (Ideal)</span>
                <span>50%</span>
                <span className="text-error font-bold">75%+ (Escorrimento)</span>
              </div>
            </div>
          </form>

          {/* Diagnostic Result Card */}
          {(() => {
            const target = TARGET_RECOMMENDATIONS[selectedTarget];
            const isRunoff = simCoverage >= 75;
            const isDensityGood = simDensity >= target.minDensity;
            const isDensityAdequateGeneral = simDensity >= 50;
            const isDensityIntermediate = simDensity >= 25 && simDensity < 50;

            const generalClass = isRunoff
              ? 'bg-rose-500/10 border-rose-500/30'
              : isDensityGood
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : isDensityIntermediate
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-rose-500/10 border-rose-500/30';

            return (
              <div className={`rounded-2xl p-5 border flex flex-col gap-3 shadow-sm ${generalClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isRunoff ? (
                      <AlertTriangle className="w-6 h-6 text-error" />
                    ) : isDensityGood ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    )}
                    <h2 className="text-sm font-extrabold text-on-surface">
                      {isRunoff
                        ? 'Excesso / Risco de Escorrimento'
                        : isDensityGood
                        ? 'Cobertura e Densidade Ideais'
                        : isDensityIntermediate
                        ? 'Densidade Intermediária'
                        : 'Densidade Insuficiente'}
                    </h2>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isDensityAdequateGeneral
                      ? 'bg-primary text-on-primary'
                      : isDensityIntermediate
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                      : 'bg-error-container text-on-error-container'
                  }`}>
                    {isDensityAdequateGeneral ? 'Bom (≥50)' : isDensityIntermediate ? 'Intermediário (25-50)' : 'Insuficiente (<25)'}
                  </span>
                </div>

                <p className="text-xs text-on-surface leading-relaxed font-medium">
                  {isRunoff
                    ? `A cobertura de ${simCoverage}% ultrapassou o limite seguro. Gotas adicionais não aumentam a eficácia e escorrem da folha para o solo.`
                    : isDensityGood
                    ? `Atinge o padrão de ${target.minDensity} a ${target.maxDensity} gotas/cm² recomendado para ${target.label.toLowerCase()}.`
                    : `Para ${target.label.toLowerCase()}, a densidade recomendada é de ${target.minDensity} a ${target.maxDensity} gotas/cm² (atual: ${simDensity} gotas/cm²).`}
                </p>

                <div className="pt-2 border-t border-outline-variant/60 text-xs text-on-surface-variant flex flex-col gap-1">
                  <strong className="text-on-surface">Recomendação Agronômica:</strong>
                  <span>
                    {isRunoff
                      ? 'Reduza a taxa de aplicação (L/ha) ou aumente a velocidade do pulverizador para evitar desperdício de calda.'
                      : isDensityGood
                      ? 'Parâmetros calibrados e adequados para a operação. Monitore as condições de vento e temperatura.'
                      : 'Considere aumentar a pressão de pulverização, utilizar pontas de menor vazão com mais bicos por barra ou aumentar ligeiramente a taxa de aplicação.'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </main>
  );
};
