import React, { useEffect, useState } from 'react';
import { Download, Sun, Moon, MapPin, Plus, CloudSun, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  onOpenExport: () => void;
  onOpenPresets: () => void;
  onOpenWeather: () => void;
  onResetRoute: () => void;
  onFitBounds: () => void;
  onAddLegClick: () => void;
  legsCount: number;
}

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('mapanimator-theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      aria-label={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'}
      className="w-8 h-8 rounded-md flex items-center justify-center text-ink2 hover:text-ink hover:bg-hairline2 transition-colors"
      title={isDark ? 'Light appearance' : 'Dark appearance'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  onOpenExport,
  onOpenPresets,
  onOpenWeather,
  onResetRoute,
  onFitBounds,
  onAddLegClick,
  legsCount,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const quietBtn =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-ink2 hover:text-ink hover:bg-hairline2 transition-colors whitespace-nowrap';

  return (
    <header className="h-[52px] px-4 bg-surface/80 backdrop-blur-xl border-b border-hairline2 flex items-center justify-between gap-4 z-30 shrink-0">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8l-2.6 5.4L9 13l2.6-5.4L16 8z" fill="currentColor" stroke="none" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold text-ink whitespace-nowrap">MapAnimator</span>
        </div>
      </div>

      {/* Navigation & quick actions */}
      <nav className="hidden md:flex items-center gap-1 min-w-0">
        <button onClick={onAddLegClick} className={quietBtn}>
          <Plus className="w-4 h-4" />
          <span>Add Leg</span>
        </button>
        <button onClick={onOpenPresets} className={quietBtn}>
          <Sparkles className="w-4 h-4" />
          <span>Presets</span>
        </button>
        <button onClick={onOpenWeather} className={quietBtn}>
          <CloudSun className="w-4 h-4" />
          <span>Weather</span>
        </button>
        <button
          onClick={onFitBounds}
          disabled={legsCount === 0}
          title={legsCount === 0 ? 'Add legs to overview journey' : 'Fit map to overview all legs'}
          className={`${quietBtn} disabled:opacity-40 disabled:pointer-events-none`}
        >
          <MapPin className="w-4 h-4" />
          <span>Overview ({legsCount})</span>
        </button>
        <button
          onClick={onResetRoute}
          disabled={legsCount === 0}
          title={legsCount === 0 ? 'Journey is already empty' : 'Clear all legs and start fresh'}
          className="flex items-center px-2.5 py-1.5 rounded-md text-[13px] font-medium text-ink2 hover:text-danger hover:bg-danger/10 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
        >
          Clear
        </button>
      </nav>

      {/* Right zone: appearance, install, primary action */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            title="Install as desktop application"
            className={quietBtn}
          >
            Install
          </button>
        )}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-accent hover:bg-accent-strong rounded-md transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
