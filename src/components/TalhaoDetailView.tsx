import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  Plus,
  Trash2,
  ChevronDown,
  Info,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { FieldExperiment, SampleCardSummary } from '../types';

interface TalhaoDetailViewProps {
  experiments: FieldExperiment[];
  onAddSampleToField: (fieldId: string) => void;
  onAddNewField: (name: string, crop: string) => void;
  onDeleteField?: (fieldId: string) => void;
  onDeleteSample?: (fieldId: string, sampleId: string) => void;
}

export const TalhaoDetailView: React.FC<TalhaoDetailViewProps> = ({
  experiments,
  onAddSampleToField,
  onAddNewField,
  onDeleteField,
  onDeleteSample,
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string>(experiments[0]?.id || '');
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showDeleteFieldModal, setShowDeleteFieldModal] = useState(false);
  const [fieldNameInput, setFieldNameInput] = useState('');
  const [cropInput, setCropInput] = useState('Soja');

  const currentField = experiments.find((f) => f.id === selectedFieldId) || experiments[0];

  // Calculate field averages
  const sampleCount = currentField?.samples.length || 0;
  const avgDensity = sampleCount
    ? (currentField.samples.reduce((acc, s) => acc + s.density, 0) / sampleCount).toFixed(1)
    : '0.0';
  const avgCoverage = sampleCount
    ? (currentField.samples.reduce((acc, s) => acc + s.coverage, 0) / sampleCount).toFixed(1)
    : '0.0';
  const avgSpan = sampleCount
    ? (currentField.samples.reduce((acc, s) => acc + s.span, 0) / sampleCount).toFixed(1)
    : '0.0';

  // Quality Breakdown
  const idealCount = currentField?.samples.filter((s) => s.status === 'Ideal').length || 0;
  const regularCount = currentField?.samples.filter((s) => s.status === 'Razoável').length || 0;
  const poorCount = currentField?.samples.filter((s) => s.status === 'Ruim' || s.status === 'Excesso').length || 0;

  return (
    <main className="flex-1 pb-36 px-4 pt-4 max-w-[1200px] mx-auto w-full md:pl-[220px]">
      {/* Field Selector Dropdown & Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
        <div className="relative flex-1 max-w-md">
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="w-full h-11 border border-outline-variant rounded-xl px-3 bg-surface font-bold text-base md:text-lg text-primary appearance-none cursor-pointer focus:outline-none focus:border-primary pr-9 shadow-sm"
          >
            {experiments.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onAddSampleToField(selectedFieldId)}
            className="h-11 px-3.5 bg-primary text-on-primary font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Amostra
          </button>

          <button
            onClick={() => setShowAddFieldModal(true)}
            className="h-11 px-3 bg-surface-container-high border border-outline-variant text-on-surface font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-primary" />
            Novo Talhão
          </button>

          {experiments.length > 1 && (
            <button
              onClick={() => setShowDeleteFieldModal(true)}
              title="Excluir talhão"
              className="h-11 w-11 bg-surface-container-high border border-outline-variant text-error font-semibold text-xs rounded-xl flex items-center justify-center hover:bg-error-container/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subtitle Context & Breakdown Pills */}
      {currentField && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span>{currentField.crop}</span>
            <span>·</span>
            <span>{sampleCount} {sampleCount === 1 ? 'amostra' : 'amostras'}</span>
            <span>·</span>
            <span>{currentField.date}</span>
          </div>

          {sampleCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              {idealCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-quality-good/15 text-quality-good border border-quality-good/30">
                  {idealCount} Ideais
                </span>
              )}
              {regularCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-quality-regular/15 text-quality-regular border border-quality-regular/30">
                  {regularCount} Razoáveis
                </span>
              )}
              {poorCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-quality-poor/15 text-quality-poor border border-quality-poor/30">
                  {poorCount} Insuficientes
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Samples List / Empty State */}
      {!currentField || currentField.samples.length === 0 ? (
        <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center text-center my-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Nenhuma amostra salva neste talhão</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mb-5">
            Colete e analise papéis hidrossensíveis para avaliar a qualidade de aplicação neste talhão.
          </p>
          <button
            onClick={() => onAddSampleToField(selectedFieldId)}
            className="h-11 px-5 bg-primary text-on-primary font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm hover:bg-primary-container active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar Primeira Amostra
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {currentField.samples.map((sample) => {
            let sideBorderColor = 'bg-quality-great';
            let textColor = 'text-quality-great';
            let Icon = CheckCircle2;

            if (sample.status === 'Razoável') {
              sideBorderColor = 'bg-quality-regular';
              textColor = 'text-quality-regular';
              Icon = AlertTriangle;
            } else if (sample.status === 'Ruim' || sample.status === 'Excesso') {
              sideBorderColor = 'bg-quality-poor';
              textColor = 'text-quality-poor';
              Icon = XCircle;
            }

            return (
              <article
                key={sample.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col relative shadow-sm hover:border-primary/40 transition-all"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${sideBorderColor}`} />
                <div className="p-4 pl-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        {sample.name}
                      </h2>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${textColor} fill-current/10`} />
                        <span className={`text-sm font-bold ${textColor}`}>{sample.status}</span>
                      </div>
                    </div>

                    {onDeleteSample && (
                      <button
                        onClick={() => onDeleteSample(currentField.id, sample.id)}
                        className="text-on-surface-variant/60 hover:text-error p-1 rounded transition-colors"
                        title="Remover amostra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/60 text-left">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-on-surface-variant">Número de Gotas</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-xl text-on-surface">{sample.density}</span>
                        <span className="text-[10px] text-on-surface-variant">gotas/cm²</span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-on-surface-variant">Cobertura</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-xl text-on-surface">{sample.coverage}</span>
                        <span className="text-[10px] text-on-surface-variant">%</span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-on-surface-variant">Span</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-xl text-on-surface">{sample.span}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Média do Talhão Card */}
          <article className="bg-primary-container/10 border-2 border-primary-container/60 rounded-xl overflow-hidden flex flex-col relative shadow-sm mt-2">
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-quality-great" />
            <div className="p-4 pl-6 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-extrabold text-base md:text-lg text-on-surface uppercase tracking-wide">
                    MÉDIA DO TALHÃO
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-xs font-semibold text-on-surface-variant">
                      Consolidado de {sampleCount} {sampleCount === 1 ? 'Amostra' : 'Amostras'}
                    </span>
                  </div>
                </div>
                <Award className="w-8 h-8 text-quality-great" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-primary-container/20">
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface-variant font-medium">Nº de Gotas Média</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-2xl text-on-surface">{avgDensity}</span>
                    <span className="text-[11px] text-on-surface-variant">gotas/cm²</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-on-surface-variant font-medium">Cobertura Média</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-2xl text-on-surface">{avgCoverage}</span>
                    <span className="text-[11px] text-on-surface-variant">%</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-on-surface-variant font-medium">Span Médio</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-2xl text-on-surface">{avgSpan}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Fixed Sticky Action Bar at Bottom — Properly Positioned for Mobile (above 64px bottom nav) & Desktop */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 md:left-[220px] right-0 p-3 md:p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant z-30 transition-all shadow-md">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => onAddSampleToField(selectedFieldId)}
            className="w-full h-[50px] bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-5 h-5" />
            ADICIONAR AMOSTRA
          </button>
        </div>
      </div>

      {/* Modal to Add New Field */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-outline-variant shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-lg text-on-surface">Criar Novo Talhão</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">Nome do Talhão</label>
              <input
                type="text"
                placeholder="Ex: Talhão 5 — Milho"
                value={fieldNameInput}
                onChange={(e) => setFieldNameInput(e.target.value)}
                className="w-full h-11 border border-outline-variant rounded-xl px-3 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">Cultura</label>
              <input
                type="text"
                placeholder="Ex: Soja, Milho, Algodão"
                value={cropInput}
                onChange={(e) => setCropInput(e.target.value)}
                className="w-full h-11 border border-outline-variant rounded-xl px-3 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (fieldNameInput.trim()) {
                    onAddNewField(fieldNameInput, cropInput);
                    setShowAddFieldModal(false);
                    setFieldNameInput('');
                  }
                }}
                className="px-5 py-2.5 text-sm bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all shadow-sm"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Delete Selected Field */}
      {showDeleteFieldModal && currentField && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-outline-variant shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-lg text-on-surface text-error">Excluir Talhão?</h3>
            <p className="text-sm text-on-surface-variant">
              Tem certeza que deseja excluir <strong>{currentField.name}</strong> e todas as suas amostras salvas? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowDeleteFieldModal(false)}
                className="px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteField) {
                    onDeleteField(currentField.id);
                    setShowDeleteFieldModal(false);
                    // Select another remaining field
                    const remaining = experiments.filter((f) => f.id !== currentField.id);
                    if (remaining[0]) setSelectedFieldId(remaining[0].id);
                  }
                }}
                className="px-5 py-2.5 text-sm bg-error text-white font-bold rounded-xl hover:bg-error/90 active:scale-95 transition-all shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
