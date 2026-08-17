import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, CheckCircle2, FlaskConical, Timer, Play, Pause, RotateCcw } from 'lucide-react';

/**
 * Estrutura de cada etapa da sequência WALES/DULES
 */
interface MixingStep {
  letter: string;
  title: string;
  sub: string;
  description: string;
  examples: string;
  warning?: string;
  badgeColor: string;
}

/**
 * Sequência agronômica padronizada de adição no tanque de pulverização (Regra WALES / DULES)
 */
const WALES_STEPS: MixingStep[] = [
  {
    letter: 'W',
    title: '1. Água & Condicionadores (Water)',
    sub: '50% a 75% do volume do tanque com agitação ligada',
    description: 'Abasteça o tanque com água limpa até atingir mais da metade do volume total. Ligue o sistema de agitação/retorno e adicione antiespumantes, condicionadores de calda e redutores de pH, se recomendados.',
    examples: 'Água limpa, antiespumante, sulfato de amônio, redutores de pH.',
    warning: 'Nunca adicione produtos formulados diretamente em tanque vazio ou sem agitação hidráulica ativa.',
    badgeColor: 'bg-blue-500 text-white',
  },
  {
    letter: 'W',
    title: '2. Pós Molháveis & Grânulos (WP / WG / WDG)',
    sub: 'Formulação sólida dispersível em água',
    description: 'Adicione os produtos sólidos na sequência: Grânulos Dispersíveis em Água (WG / WDG), Pós Molháveis (WP) e Pós Solúveis (SP). Faça a pré-diluição prévia em balde para evitar torrões no filtro.',
    examples: 'Mancozebe, Clorotalonil WG, Atrazina WG, Tiodicarbe.',
    warning: 'Permita tempo suficiente para a completa dissolução e hidratação das partículas antes do próximo passo.',
    badgeColor: 'bg-amber-600 text-white',
  },
  {
    letter: 'A',
    title: '3. Agitação Completa (Agitation)',
    sub: 'Homogeneização mecânica por 3 a 5 minutos',
    description: 'Mantenha a agitação ativa em rotação de trabalho para garantir que os grânulos e pós estejam 100% dispersos e suspensos de maneira homogênea.',
    examples: 'Agitador mecânico e retorno de calda operando em fluxo constante.',
    badgeColor: 'bg-emerald-600 text-white',
  },
  {
    letter: 'L',
    title: '4. Suspensões Concentradas (SC / CS / Flowables)',
    sub: 'Líquidos particulados e microencapsulados',
    description: 'Adicione as formulações líquidas de base aquosa contendo partículas insolúveis em suspensão (SC) e suspensões de microcápsulas (CS).',
    examples: 'Azoxistrobina SC, Tiametoxam SC, Clantraniliprole SC, Piretróides CS.',
    badgeColor: 'bg-indigo-600 text-white',
  },
  {
    letter: 'E',
    title: '5. Concentrados Emulsionáveis (EC / EW / ME)',
    sub: 'Formulações à base de solvente oleoso',
    description: 'Adicione os Concentrados Emulsionáveis (EC), Emulsões em Água (EW) e Microemulsões (ME). Ao entrar em contato com a água, formam uma emulsão de aspecto leitoso.',
    examples: 'Cipermetrina EC, Cletodim EC, Difenoconazol EC, Clorpirifós EC.',
    warning: 'Adicionar EC antes de pós molháveis cria uma película oleosa impermeável sobre os grânulos, impedindo sua dissolução.',
    badgeColor: 'bg-purple-600 text-white',
  },
  {
    letter: 'S',
    title: '6. Soluções, Adjuvantes & Óleos (SL / Adjuvants)',
    sub: 'Concentrados solúveis, fertilizantes foliares e óleos',
    description: 'Por último, adicione Concentrados Solúveis (SL), Fertilizantes Foliares, Óleos Minerais/Vegetais e Adjuvantes tensoativos/siliconados. Complete o restante da água (100%) com agitação contínua.',
    examples: 'Glifosato SL, 2,4-D amina, Adjuvante organossiliconado, Óleo metilado.',
    warning: 'Óleos e adjuvantes adicionados no início podem gerar excesso de espuma e instabilidade na calda.',
    badgeColor: 'bg-teal-600 text-white',
  },
];

/**
 * Componente Guia Interativo de Ordem de Mistura (WALES) e Teste de Compatibilidade (Jar Test)
 */
export const TankMixingGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wales' | 'jartest'>('wales');
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Cronômetro do Jar Test (15 minutos = 900 segundos)
  const [jarTimerSec, setJarTimerSec] = useState<number>(900);
  const [isJarTimerRunning, setIsJarTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isJarTimerRunning && jarTimerSec > 0) {
      interval = setInterval(() => {
        setJarTimerSec((prev) => prev - 1);
      }, 1000);
    } else if (jarTimerSec === 0) {
      setIsJarTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isJarTimerRunning, jarTimerSec]);

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub Navigation */}
      <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={() => setActiveTab('wales')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'wales'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Ordem WALES de Mistura
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jartest')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'jartest'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Jar Test (Teste do Frasco)
        </button>
      </div>

      {activeTab === 'wales' ? (
        <div className="flex flex-col gap-4">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              Sequência Padrão de Abastecimento (Regra WALES / DULES)
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Seguir a ordem correta de adição no tanque evita a formação de grumos, separação de fases e o entupimento precoce de pontas e filtros.
            </p>
          </section>

          {/* Steps List */}
          <div className="flex flex-col gap-3">
            {WALES_STEPS.map((step, index) => {
              const isDone = checkedSteps[index] === true;

              return (
                <div
                  key={step.title}
                  onClick={() => toggleStep(index)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isDone
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-outline-variant bg-surface-container-lowest hover:border-outline'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${step.badgeColor}`}
                      >
                        {step.letter}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                          {step.title}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant font-medium">{step.sub}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-on-surface leading-relaxed pl-12">
                    {step.description}
                  </p>

                  <div className="text-[10px] text-on-surface-variant pl-12 flex flex-col gap-1">
                    <div>
                      <strong>Exemplos:</strong> {step.examples}
                    </div>
                    {step.warning && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 font-medium flex items-start gap-1.5 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{step.warning}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Jar Test Section */
        <div className="flex flex-col gap-4">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-primary" />
              Teste de Compatibilidade no Frasco (Jar Test)
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              O Jar Test é uma simulação proporcional da mistura em um recipiente transparente de 1 Litro antes de colocar os produtos no tanque de 2.000 ou 4.000 Litros.
            </p>
          </section>

          {/* Jar Test Timer */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col items-center gap-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-primary" />
              Cronômetro de Decantação e Estabilidade
            </div>

            <div className="text-4xl font-black text-primary font-mono tracking-tight">
              {formatTimer(jarTimerSec)}
            </div>

            <p className="text-[10px] text-on-surface-variant max-w-xs">
              Após misturar na garrafa, aguarde 15 minutos sem agitar para checar se ocorre separação de fases ou formação de sedimentos.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsJarTimerRunning(!isJarTimerRunning)}
                className={`h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isJarTimerRunning
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
              >
                {isJarTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isJarTimerRunning ? 'Pausar' : 'Iniciar 15 Min'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsJarTimerRunning(false);
                  setJarTimerSec(900);
                }}
                className="h-9 px-3 rounded-xl border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </section>

          {/* Visual Checklist */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Critérios de Avaliação Visual da Calda
            </h4>

            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-900 dark:text-emerald-200">
                <strong>Calda Compatível (Aprovada):</strong> Líquido homogêneo, emulsão leitosa estável ou suspensão uniforme sem separação após 15 minutos.
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                <strong>Incompatibilidade Física Leve:</strong> Pequena separação de fase que se homogeneíza facilmente com leve agitação. Exige agitação contínua no tanque.
              </div>

              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-900 dark:text-red-200">
                <strong>Incompatibilidade Severa (Reprovada):</strong> Formação de pasta, grumos grossos, precipitação de cristais no fundo ou separação oleosa irreversível. <strong>Não aplicar no pulverizador!</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
