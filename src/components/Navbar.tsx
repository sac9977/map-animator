import React from 'react';
import { Compass, Download, Sparkles, MapPin, Laptop, Plus, CloudSun } from 'lucide-react';
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

  return (
    <header className="h-16 px-6 bg-[#FFFFFF] border-b border-[#E6E1D7] flex items-center justify-between gap-8 z-30 shrink-0 shadow-[0_2px_12px_-4px_rgba(30,41,59,0.04)]">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#0E6466] flex items-center justify-center text-[#F59E0B] shadow-sm">
          <Compass className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-[#0E6466] whitespace-nowrap">
            MapAnimator
          </span>
          <span className="text-[11px] font-medium text-[#78716C] -mt-1 tracking-wider uppercase">
            Explorer Studio
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation & Quick Actions */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-semibold text-stone-600">
        <button
          onClick={onAddLegClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0E6466] bg-[#0E6466]/10 hover:bg-[#0E6466]/20 rounded-xl transition-all whitespace-nowrap active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Add Journey Leg</span>
        </button>

        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-[#0E6466] hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Curated Expeditions</span>
        </button>

        <button
          onClick={onOpenWeather}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-[#0E6466] hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap active:scale-95"
          title="Historical weather and precipitation analysis for start and destination points"
        >
          <CloudSun className="w-3.5 h-3.5 text-[#0E6466]" />
          <span>Weather Overlay</span>
        </button>

        <button
          onClick={onFitBounds}
          disabled={legsCount === 0}
          title={legsCount === 0 ? 'Add legs to overview journey' : 'Fit map to overview all legs'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-[#0E6466] hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap active:scale-95"
        >
          <MapPin className="w-3.5 h-3.5 text-[#0E6466]" />
          <span>Overview Route ({legsCount} {legsCount === 1 ? 'leg' : 'legs'})</span>
        </button>

        <button
          onClick={onResetRoute}
          disabled={legsCount === 0}
          title={legsCount === 0 ? 'Journey is already empty' : 'Clear all legs and start fresh'}
          className="flex items-center px-2.5 py-1.5 text-xs font-semibold text-stone-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap active:scale-95"
        >
          Clear Journey
        </button>
      </nav>

      {/* Zone 3: Primary Action & Desktop PWA Install */}
      <div className="flex items-center gap-3 shrink-0">
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            title="Install as native Mac/Windows/Linux desktop application"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0E6466] bg-[#0E6466]/10 hover:bg-[#0E6466]/20 rounded-lg transition-colors whitespace-nowrap"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Install Desktop App</span>
          </button>
        )}

        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0E6466] hover:bg-[#094749] active:scale-[0.98] rounded-xl shadow-sm transition-all whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
