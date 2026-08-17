import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check, X, Info } from 'lucide-react';

const STORAGE_KEY = 'gotafiel_cookie_consent';

export type CookieConsentType = 'all' | 'essential';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Exibe com um breve delay para suavidade visual
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }
  }, []);

  const handleConsent = (type: CookieConsentType) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        version: '1.0',
      }));
    } catch {
      // Ignora erro de acesso ao localStorage
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Consentimento de Cookies e Privacidade"
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide flex items-center gap-1.5">
                Privacidade & Armazenamento Local (LGPD)
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium">
                Sua experiência e segurança na lavoura
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleConsent('essential')}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Fechar banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Utilizamos cookies e armazenamento local para manter sua sessão conectada, permitir o processamento 100% offline em campo (PWA) e salvar seus talhões e análises com segurança.
        </p>

        {showDetails && (
          <div className="text-[10px] text-on-surface-variant/90 bg-surface-container/60 border border-outline-variant/50 rounded-xl p-2.5 flex flex-col gap-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1 font-bold text-on-surface">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Categorias de Dados:
            </div>
            <p>
              • <strong>Essenciais (Sempre Ativos):</strong> Sessão de login segura, armazenamento local de cartões e banco offline Neon.
            </p>
            <p>
              • <strong>Preferências:</strong> Tema escuro/claro e parâmetros agronômicos de calibração de bicos e motor de análise.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-outline-variant/50">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 py-1 cursor-pointer"
          >
            <Info className="w-3 h-3" />
            {showDetails ? 'Ocultar detalhes' : 'Ver finalidade'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleConsent('essential')}
              className="flex-1 sm:flex-none h-8 px-3 rounded-xl border border-outline-variant text-[11px] font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              Apenas Essenciais
            </button>
            <button
              type="button"
              onClick={() => handleConsent('all')}
              className="flex-1 sm:flex-none h-8 px-4 rounded-xl bg-primary text-on-primary text-[11px] font-bold shadow-sm hover:bg-primary-container active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Aceitar Todos
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
