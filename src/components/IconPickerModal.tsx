import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '../hooks/useModalA11y';
import { X, Search, Check, RotateCcw, Sparkles } from 'lucide-react';
import {
  TRAVELER_ICONS,
  TRAVELER_CATEGORIES,
  TravelerCategory,
  TravelerIconDefinition,
  getIconDefinition,
} from '../data/travelerIcons';
import { TransportMode } from '../types/travel';
import { TRAIL_COLOR_PRESETS, hexToRgba } from '../data/trailStyles';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconId?: string;
  currentMode: TransportMode;
  currentColor: string;
  currentTrailColor?: string;
  currentScale: number;
  onSelectIcon: (iconId: string) => void;
  onUpdateColor?: (color: string) => void;
  onUpdateTrailColor?: (color: string) => void;
  onUpdateScale?: (scale: number) => void;
}

const PRESET_COLORS = [
  '#F59E0B', // Amber Gold
  '#0E6466', // Savannah Teal
  '#DC2626', // Crimson Red
  '#2563EB', // Royal Sky
  '#16A34A', // Forest Green
  '#7C3AED', // Vivid Violet
  '#0F172A', // Obsidian Black
  '#FFFFFF', // Alpine White
];

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  currentIconId,
  currentMode,
  currentColor,
  currentTrailColor = '#F59E0B',
  currentScale,
  onSelectIcon,
  onUpdateColor,
  onUpdateTrailColor,
  onUpdateScale,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TravelerCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTempId, setActiveTempId] = useState<string>(
    currentIconId || getIconDefinition(undefined, currentMode).id
  );

  // Sync state if modal is reopened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTempId(currentIconId || getIconDefinition(undefined, currentMode).id);
    }
  }, [isOpen, currentIconId, currentMode]);

  const dialogRef = useModalA11y(isOpen, onClose);

  const activeIconDef: TravelerIconDefinition = useMemo(() => {
    return getIconDefinition(activeTempId, currentMode);
  }, [activeTempId, currentMode]);

  // Filtered icons
  const filteredIcons = useMemo(() => {
    return TRAVELER_ICONS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectIcon(activeTempId);
    onClose();
  };

  const handleResetToDefault = () => {
    const defaultDef = getIconDefinition(undefined, currentMode);
    setActiveTempId(defaultDef.id);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-picker-modal-title"
        className="bg-surface border border-hairline rounded-lg w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150 relative z-[101] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-hairline flex items-center justify-between bg-well shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2
                id="icon-picker-modal-title"
                className="text-sm sm:text-base font-bold text-ink tracking-tight"
              >
                Vehicle & Traveler Icon
              </h2>
              <p className="text-[11px] sm:text-xs text-ink2 line-clamp-1">
                Choose the modern avatar or vehicle representing this leg on the journey map
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-strong px-3.5 py-1.5 rounded-lg shadow-xs transition-all active:scale-[0.98]"
              title="Apply selected icon now"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apply</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close icon picker"
              className="p-1.5 sm:p-2 text-ink3 hover:text-ink rounded-lg hover:bg-well/50 transition-colors"
              title="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Preview Hero Strip */}
        <div className="p-4 bg-well border-b border-hairline flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              {/* Active Icon Bubble with Trail Track Preview */}
              <div className="relative w-16 h-16 rounded-lg flex items-center justify-center shadow-xs shrink-0 bg-surface border border-hairline ring-2 ring-accent/20 overflow-hidden">
                {/* Simulated route trail underneath */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 64 64">
                  <path
                    d="M 6 52 C 22 52, 28 16, 58 16"
                    fill="none"
                    stroke={hexToRgba(currentTrailColor, 0.35)}
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 6 52 C 22 52, 28 16, 58 16"
                    fill="none"
                    stroke={currentTrailColor}
                    strokeWidth="3.5"
                    strokeDasharray={currentMode === 'flight' ? '4 3' : currentMode === 'hike' ? '2 3' : 'none'}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="relative z-10">
                  {activeIconDef.renderSvg({
                    size: 34,
                    color: currentColor,
                    className: 'w-9 h-9',
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{activeIconDef.name}</span>
                  <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {activeIconDef.badge}
                  </span>
                </div>
                <p className="text-xs text-ink2 max-w-sm mt-0.5">{activeIconDef.tagline}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink2">
                    <span className="w-2.5 h-2.5 rounded-full border border-hairline" style={{ backgroundColor: currentColor }} />
                    Vehicle: <span className="font-mono font-medium text-ink">{currentColor}</span>
                  </span>
                  <span className="text-ink3">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink2">
                    <span className="w-2.5 h-2.5 rounded-full border border-hairline" style={{ backgroundColor: currentTrailColor }} />
                    Trail: <span className="font-mono font-medium text-ink">{currentTrailColor}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Scale Slider */}
            {onUpdateScale && (
              <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-lg border border-hairline shadow-2xs self-end sm:self-center">
                <span className="text-xs font-bold text-ink3">Scale</span>
                <input
                  type="range"
                  aria-label="Vehicle icon scale"
                  min="0.8"
                  max="2.0"
                  step="0.1"
                  value={currentScale}
                  onChange={(e) => onUpdateScale(parseFloat(e.target.value))}
                  className="w-14 h-1 accent-accent"
                />
                <span className="text-xs font-mono font-semibold text-ink w-7">
                  {currentScale.toFixed(1)}x
                </span>
              </div>
            )}
          </div>

          {/* Color Customization Row: Vehicle & Trail Colors */}
          <div className="pt-2.5 border-t border-hairline/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-surface/70 p-2.5 rounded-lg border border-hairline">
            {/* Vehicle Color Swatches */}
            {onUpdateColor && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-wider text-ink2">
                  Vehicle Accent Color
                </span>
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateColor(c)}
                      style={{ backgroundColor: c }}
                      title={`Vehicle: ${c}`}
                      aria-label={`Vehicle color ${c}`}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        currentColor.toLowerCase() === c.toLowerCase()
                          ? 'scale-120 border-ink ring-2 ring-accent/40 shadow-xs'
                          : 'border-hairline hover:scale-110'
                      }`}
                    />
                  ))}
                  <label className="relative w-6 h-6 rounded-full border border-hairline flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden bg-gradient-to-tr from-amber-400 via-rose-400 to-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2" title="Custom vehicle color">
                    <input
                      type="color"
                      value={currentColor}
                      aria-label="Custom vehicle color"
                      onChange={(e) => onUpdateColor(e.target.value)}
                      className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Trail Color Swatches */}
            {onUpdateTrailColor && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wider text-ink2">
                    Route Trail Color
                  </span>
                  {onUpdateColor && (
                    <button
                      onClick={() => onUpdateTrailColor(currentColor)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Match Vehicle
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {TRAIL_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      onClick={() => onUpdateTrailColor(p.hex)}
                      style={{ backgroundColor: p.hex }}
                      title={`Trail: ${p.name} (${p.hex})`}
                      aria-label={`Trail color ${p.name} (${p.hex})`}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        currentTrailColor.toLowerCase() === p.hex.toLowerCase()
                          ? 'scale-120 border-ink ring-2 ring-accent/40 shadow-xs'
                          : 'border-hairline hover:scale-110'
                      }`}
                    />
                  ))}
                  <label className="relative w-6 h-6 rounded-full border border-hairline flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden bg-gradient-to-tr from-cyan-400 via-amber-400 to-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2" title="Custom trail color">
                    <input
                      type="color"
                      value={currentTrailColor}
                      aria-label="Custom trail color"
                      onChange={(e) => onUpdateTrailColor(e.target.value)}
                      className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-hairline space-y-3 bg-surface">
          <div className="relative">
            <Search className="w-4 h-4 text-ink3 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search icons (e.g. Backpacker, 4x4, Catamaran, Jet, Runner, Balloon)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-well border border-hairline rounded-lg focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-ink3 hover:text-ink text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {TRAVELER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all text-xs ${
                  selectedCategory === cat.id
                    ? 'bg-accent text-white shadow-xs font-semibold'
                    : 'bg-well text-ink2 hover:bg-well hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-well">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredIcons.map((icon) => {
              const isSelected = activeTempId === icon.id;
              return (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => {
                    // Keyboard parity: pressing the already-selected tile applies it
                    if (activeTempId === icon.id) {
                      handleApply();
                    } else {
                      setActiveTempId(icon.id);
                    }
                  }}
                  onDoubleClick={handleApply}
                  title="Click to select, click again or double-click to apply"
                  aria-pressed={isSelected}
                  className={`relative p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-surface border-accent ring-2 ring-accent/60'
                      : 'bg-surface border-hairline hover:border-ink3'
                  }`}
                >
                  {/* Top row: Icon and Badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`w-12 h-12 rounded-md flex items-center justify-center transition-all ${
                        isSelected ? 'bg-accent/10' : 'bg-well'
                      }`}
                    >
                      {icon.renderSvg({
                        size: 28,
                        color: isSelected ? currentColor : '#F59E0B',
                        className: 'w-7 h-7',
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-well text-ink2">
                        {icon.badge}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name & Tagline */}
                  <div>
                    {/* span (not heading): headings are not allowed inside buttons */}
                    <span
                      className={`text-xs font-bold transition-colors ${
                        isSelected ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {icon.name}
                    </span>
                    <p className="text-[11px] text-ink2 mt-0.5 leading-snug line-clamp-2">
                      {icon.tagline}
                    </p>
                  </div>
                </button>
                );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <div className="p-8 text-center text-ink3 space-y-2">
              <Search className="w-8 h-8 mx-auto text-ink3" />
              <p className="text-xs font-semibold text-ink2">No matching traveler icons found</p>
              <p className="text-[11px] text-ink3">Try searching for &quot;hiker&quot;, &quot;4x4&quot;, &quot;boat&quot;, or &quot;plane&quot;</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-hairline bg-surface flex items-center justify-between gap-3 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-20">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink2 hover:text-ink px-3 py-2 rounded-lg hover:bg-well transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-ink2 hover:text-ink px-4 py-2 rounded-lg hover:bg-well transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-strong px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Icon</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
