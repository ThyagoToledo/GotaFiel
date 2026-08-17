import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Info, Layers } from 'lucide-react';
import {
  calculateRequiredNozzleFlow,
  calculateIsoNozzlePressure,
} from '../utils/sprayAnalytics';

/**
 * Definição das pontas padrão da norma internacional ISO 10625
 */
interface IsoNozzleDefinition {
  code: string;
  name: string;
  nominalFlowLMin: number; // Vazão nominal de referência a 3.0 bar
  hexColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Tabela oficial de pontas padronizadas ISO 10625 com vazões de referência a 3.0 bar (43.5 PSI)
 */
const ISO_NOZZLES: IsoNozzleDefinition[] = [
  { code: '01', name: 'Laranja', nominalFlowLMin: 0.40, hexColor: '#f97316', textColor: '#ffffff', borderColor: '#ea580c' },
  { code: '015', name: 'Verde Oliva', nominalFlowLMin: 0.60, hexColor: '#84cc16', textColor: '#ffffff', borderColor: '#65a30d' },
  { code: '02', name: 'Amarela', nominalFlowLMin: 0.80, hexColor: '#eab308', textColor: '#000000', borderColor: '#ca8a04' },
  { code: '025', name: 'Lilás', nominalFlowLMin: 1.00, hexColor: '#c084fc', textColor: '#000000', borderColor: '#a855f7' },
  { code: '03', name: 'Azul', nominalFlowLMin: 1.20, hexColor: '#3b82f6', textColor: '#ffffff', borderColor: '#2563eb' },
  { code: '04', name: 'Vermelha', nominalFlowLMin: 1.60, hexColor: '#ef4444', textColor: '#ffffff', borderColor: '#dc2626' },
  { code: '05', name: 'Marrom', nominalFlowLMin: 2.00, hexColor: '#78350f', textColor: '#ffffff', borderColor: '#592507' },
  { code: '06', name: 'Cinza', nominalFlowLMin: 2.40, hexColor: '#64748b', textColor: '#ffffff', borderColor: '#475569' },
  { code: '08', name: 'Branca', nominalFlowLMin: 3.20, hexColor: '#f1f5f9', textColor: '#000000', borderColor: '#cbd5e1' },
];

type TargetType = 'fungicida_contato' | 'fungicida_sistemico' | 'inseticida' | 'herbicida_pos' | 'herbicida_pre';

/**
 * Recomendações técnicas agronômicas por tipo de alvo e modalidade de aplicação
 */
const TARGET_SPECS: Record<TargetType, { label: string; nozzleType: string; dropletCategory: string; tip: string }> = {
  fungicida_contato: {
    label: 'Fungicida de Contato',
    nozzleType: 'Jato Plano Duplo Leque (TTJ60 / AVI Twin)',
    dropletCategory: 'Fina a Média (150 a 250 µm)',
    tip: 'Exige alta densidade de gotas no dossel. Duplo leque melhora a deposição em ângulos opostos.',
  },
  fungicida_sistemico: {
    label: 'Fungicida Sistêmico',
    nozzleType: 'Jato Plano com Indução de Ar (AIXR / TTI)',
    dropletCategory: 'Média a Grossa (250 a 350 µm)',
    tip: 'Menor risco de deriva com boa absorção pela planta. Ideal para aplicações preventivas.',
  },
  inseticida: {
    label: 'Inseticida',
    nozzleType: 'Cone Vazio (TXA) ou Jato Plano Duplo',
    dropletCategory: 'Fina a Média (180 a 280 µm)',
    tip: 'Foco na penetração da folhagem para atingir pragas escondidas no terço médio e baixeiro.',
  },
  herbicida_pos: {
    label: 'Herbicida Pós-emergência',
    nozzleType: 'Jato Plano com Indução de Ar (AIXR)',
    dropletCategory: 'Grossa (350 a 450 µm)',
    tip: 'Reduz deriva para culturas vizinhas garantindo cobertura suficiente nas folhas das invasoras.',
  },
  herbicida_pre: {
    label: 'Herbicida Pré-emergência',
    nozzleType: 'Jato Plano Anti-deriva Severa (TTI / ULD)',
    dropletCategory: 'Muito Grossa a Ultra Grossa (> 450 µm)',
    tip: 'Deposição direta no solo ou palhada com deriva praticamente nula.',
  },
};

/**
 * Componente Seletor Inteligente de Pontas de Pulverização ISO 10625
 */
export const NozzleSelectorCalculator: React.FC = () => {
  const [target, setTarget] = useState<TargetType>('fungicida_sistemico');
  const [volumeLHa, setVolumeLHa] = useState<number>(100);
  const [spacingCm, setSpacingCm] = useState<number>(50);
  const [speedKmh, setSpeedKmh] = useState<number>(14);

  // Cálculo da vazão requerida com memoização
  const requiredFlowLMin = useMemo(() => {
    return calculateRequiredNozzleFlow(volumeLHa, spacingCm, speedKmh);
  }, [volumeLHa, spacingCm, speedKmh]);

  // Avaliação de cada ponta ISO com a física hidráulica de orifícios
  const nozzleEvaluations = useMemo(() => {
    return ISO_NOZZLES.map((nozzle) => {
      const pressureResult = calculateIsoNozzlePressure(requiredFlowLMin, nozzle.nominalFlowLMin);

      return {
        ...nozzle,
        pressureBar: pressureResult.pressureBar,
        pressurePsi: pressureResult.pressurePsi,
        status: pressureResult.status,
        statusLabel: pressureResult.statusLabel,
        pressureDiffFrom3Bar: pressureResult.pressureDiffFrom3Bar,
      };
    });
  }, [requiredFlowLMin]);

  // Identifica a melhor ponta recomendada (mais próxima da pressão de calibração de 3.0 bar)
  const bestNozzleCode = useMemo(() => {
    const validCandidates = [...nozzleEvaluations]
      .filter((n) => n.status !== 'inadequate')
      .sort((a, b) => a.pressureDiffFrom3Bar - b.pressureDiffFrom3Bar);

    return validCandidates.length > 0 ? validCandidates[0].code : null;
  }, [nozzleEvaluations]);

  return (
    <div className="flex flex-col gap-6">
      {/* Target Type Selector */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            1. Alvo Agronômico & Cultura
          </h3>
          <span className="text-[10px] text-on-surface-variant font-medium">Recomendação Técnica</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(Object.keys(TARGET_SPECS) as TargetType[]).map((tKey) => {
            const spec = TARGET_SPECS[tKey];
            const isSelected = target === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setTarget(tKey)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary'
                    : 'border-outline-variant hover:border-outline text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>{spec.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <div className="text-[10px] opacity-80">{spec.dropletCategory}</div>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/60 flex flex-col gap-1 text-[11px] text-on-surface-variant">
          <div className="font-bold text-on-surface flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-primary" />
            Ponta Recomendada para {TARGET_SPECS[target].label}:
          </div>
          <p className="text-on-surface font-semibold">{TARGET_SPECS[target].nozzleType}</p>
          <p className="text-[10px] opacity-90">{TARGET_SPECS[target].tip}</p>
        </div>
      </section>

      {/* Operational Inputs */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
          2. Parâmetros Operacionais da Máquina
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Taxa Desejada (L/ha)
            </label>
            <input
              type="number"
              min={10}
              max={500}
              step={5}
              value={volumeLHa}
              onChange={(e) => setVolumeLHa(Math.max(1, Number(e.target.value)))}
              className="h-11 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-bold text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Espaçamento entre Bicos (cm)
            </label>
            <input
              type="number"
              min={25}
              max={100}
              step={5}
              value={spacingCm}
              onChange={(e) => setSpacingCm(Math.max(1, Number(e.target.value)))}
              className="h-11 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-bold text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Velocidade de Trabalho (km/h)
            </label>
            <input
              type="number"
              min={2}
              max={35}
              step={0.5}
              value={speedKmh}
              onChange={(e) => setSpeedKmh(Math.max(0.1, Number(e.target.value)))}
              className="h-11 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-bold text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Required Flow Output Card */}
        <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
              Vazão Requerida por Bico
            </span>
            <div className="text-xl font-black text-primary">
              {requiredFlowLMin.toFixed(2)}{' '}
              <span className="text-xs font-normal text-on-surface-variant">L/min</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-on-surface-variant">
            q = ({volumeLHa} × {(spacingCm / 100).toFixed(2)}m × {speedKmh}) / 600
          </div>
        </div>
      </section>

      {/* ISO 10625 Nozzle Recommendation Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
            3. Pontas Padrão ISO 10625 & Pressões Calculadas
          </h3>
          <span className="text-[10px] text-on-surface-variant font-medium">Norma Internacional</span>
        </div>

        <div className="flex flex-col gap-2">
          {nozzleEvaluations.map((nozzle) => {
            const isBest = nozzle.code === bestNozzleCode;

            return (
              <div
                key={nozzle.code}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isBest
                    ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                    : nozzle.status === 'ideal'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : nozzle.status === 'acceptable'
                        ? 'border-amber-500/30 bg-amber-500/5 opacity-90'
                        : 'border-outline-variant/60 opacity-50 bg-surface-container/30'
                }`}
              >
                {/* Nozzle Badge & Name */}
                <div className="flex items-center gap-3 min-w-[160px]">
                  <div
                    style={{ backgroundColor: nozzle.hexColor, color: nozzle.textColor, borderColor: nozzle.borderColor }}
                    className="w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center border-2 shadow-xs shrink-0"
                  >
                    {nozzle.code}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                      <span>Ponta {nozzle.name} ({nozzle.code})</span>
                      {isBest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-primary text-on-primary">
                          Recomendada
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-on-surface-variant">
                      Nominal: {nozzle.nominalFlowLMin.toFixed(2)} L/min @ 3 bar
                    </div>
                  </div>
                </div>

                {/* Calculated Pressure */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-on-surface">
                      {nozzle.pressureBar.toFixed(2)} bar{' '}
                      <span className="text-[10px] font-normal text-on-surface-variant">
                        ({nozzle.pressurePsi.toFixed(0)} PSI)
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        nozzle.status === 'ideal'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : nozzle.status === 'acceptable'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-error'
                      }`}
                    >
                      {nozzle.statusLabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
