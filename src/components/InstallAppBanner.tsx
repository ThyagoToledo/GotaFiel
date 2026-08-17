import React, { useState } from 'react';
import { Download, X, Smartphone, Monitor, Share, CheckCircle2, Sparkles } from 'lucide-react';
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
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md bg-surface-container-lowest border-2 border-primary/30 rounded-2xl p-4 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-6 h-6 md:hidden" />
            <Monitor className="w-6 h-6 hidden md:block" />
          </div>

          <div className="flex-1 flex flex-col gap-1 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-on-surface uppercase tracking-wider">
                Instalar GotaFiel
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                App Rápido
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Instale como aplicativo no seu celular ou computador para abrir instantaneamente e usar offline na lavoura.
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
                className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-on-surface-variant space-y-3 pl-1 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  No Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima <Share className="w-3.5 h-3.5 inline mx-1 text-primary" /> na barra inferior).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Role o menu e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito para fixar o GotaFiel no seu aparelho!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => {
                setShowIosModal(false);
                handleDismiss();
              }}
              className="w-full h-11 bg-primary text-on-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
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
