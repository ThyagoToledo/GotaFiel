import React from 'react';
import { ArrowLeft, HelpCircle, Share2, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  stepText?: string;
  showBack?: boolean;
  onBack?: () => void;
  showHelp?: boolean;
  onHelp?: () => void;
  showShare?: boolean;
  onShare?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  stepText,
  showBack = false,
  onBack,
  showHelp = false,
  onHelp,
  showShare = false,
  onShare,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline shrink-0">
      <div className="flex items-center justify-between px-4 h-14 max-w-[1200px] mx-auto">
        <div className="flex items-center min-w-[44px]">
          {showBack && (
            <button
              onClick={onBack}
              aria-label="Voltar"
              className="w-11 h-11 flex items-center justify-center text-primary dark:text-primary-fixed hover:bg-surface-container transition-colors rounded-full active:opacity-70"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 truncate">
          <h1 className="font-semibold text-[20px] text-primary dark:text-primary-fixed truncate">
            {title}
          </h1>
          {subtitle && (
            <span className="text-xs text-on-surface-variant font-normal">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 min-w-[44px] justify-end">
          {stepText && (
            <span className="text-xs font-semibold text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-full">
              {stepText}
            </span>
          )}
          {showShare && (
            <button
              onClick={onShare}
              aria-label="Compartilhar"
              className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors rounded-full active:opacity-70"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          {showHelp && (
            <button
              onClick={onHelp}
              aria-label="Ajuda"
              className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors rounded-full active:opacity-70"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              aria-label="Alternar tema"
              className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors rounded-full active:opacity-70 ml-1"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
