import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle2, Sparkles } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

export const InstallAppBanner: React.FC = () => {
  const { isInstallable, hasNativePrompt, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('gotafiel_install_banner_dismissed') === 'true';
  });
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const success = await promptInstall();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setIsDismissed(true), 3000);
      }
    } else if (isIOS) {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('gotafiel_install_banner_dismissed', 'true');
  };

  return (
    <>
      <aside
        aria-label="Instalar aplicativo"
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md bg-surface-container-lowest/95 border-2 border-primary/40 dark:border-primary/60 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start gap-3.5">
          {/* Official App Icon Branding */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-brand-navy to-primary p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="GotaFiel Logo"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>

          <div className="flex-1 flex flex-col gap-1 pr-5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-on-surface uppercase tracking-wider">
                Instalar GotaFiel
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-yellow/15 text-amber-800 dark:text-amber-300 border border-brand-yellow/30 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                Offline na Lavoura
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Instale o app direto no seu celular para leitura instantânea de cartões e uso 100% offline no campo.
            </p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="h-9 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary-container active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                {installSuccess ? 'Instalado!' : 'Instalar App'}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="h-9 px-3 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-semibold text-xs transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar aviso de instalação"
            className="absolute top-3 right-3 w-7 h-7 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Modal de Instruções para iPhone / iPad (iOS Safari) */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Como Instalar no iPhone/iPad
              </h2>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-7 h-7 rounded-lg text-on-surface-variant hover:text-on-surface flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              No navegador Safari do iOS, siga estes 2 passos simples:
            </p>

            <div className="flex flex-col gap-3 text-xs bg-surface-container rounded-xl p-3.5 border border-outline-variant/60">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-navy text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Toque no botão <strong>Compartilhar</strong> (ícone com seta para cima na barra inferior do Safari).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Role a lista para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="h-10 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
