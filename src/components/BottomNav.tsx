import React from 'react';
import { Home, ScanLine, FlaskConical, Calculator, MoreHorizontal, Droplets } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Início', icon: Home },
    { id: 'analysis' as ActiveTab, label: 'Análise', icon: ScanLine },
    { id: 'experiments' as ActiveTab, label: 'Talhões', icon: FlaskConical },
    { id: 'calculators' as ActiveTab, label: 'Calculadoras', icon: Calculator },
    { id: 'more' as ActiveTab, label: 'Mais', icon: MoreHorizontal },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 dark:bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant md:hidden">
        <div className="flex justify-around items-center h-[64px] px-1 max-w-[1200px] mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-2.5 min-w-[54px] rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] leading-tight mt-0.5 font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-[220px] bg-surface dark:bg-surface-dim border-r border-outline-variant z-40 p-3">
        <div className="flex items-center gap-2 px-3 py-2 mb-2 text-primary font-bold text-sm border-b border-outline-variant/60 pb-3">
          <Droplets className="w-5 h-5 fill-primary/20" />
          <span>Analisador de Gotas</span>
        </div>

        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left font-semibold text-xs md:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-extrabold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
