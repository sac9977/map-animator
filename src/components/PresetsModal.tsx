import React from 'react';
import { X, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { PRESET_JOURNEYS, JourneyPreset } from '../data/presetJourneys';
import { useModalA11y } from '../hooks/useModalA11y';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: JourneyPreset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const dialogRef = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presets-modal-title"
        className="bg-[#FFFFFF] border border-[#E6E1D7] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        <div className="px-6 py-4 border-b border-[#E6E1D7] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0E6466] text-[#F59E0B] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="presets-modal-title" className="text-base font-bold text-stone-900">Curated Expeditions</h3>
              <p className="text-xs text-stone-500">Load authentic journeys with flights, 4WD safaris, and wilderness treks</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close curated expeditions"
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {PRESET_JOURNEYS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="text-left w-full bg-[#FAF8F5] hover:bg-white border border-[#E6E1D7] hover:border-[#0E6466] p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-bold text-stone-900 group-hover:text-[#0E6466] transition-colors">
                  {preset.title}
                </h4>
                <span className="text-[11px] font-semibold text-[#0E6466] bg-[#0E6466]/10 px-2 py-0.5 rounded-md">
                  {preset.legs.length} Legs
                </span>
              </div>

              <p className="text-xs text-stone-600 mb-3">
                {preset.subtitle}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-stone-500 pt-2 border-t border-stone-200/60">
                <span className="font-semibold text-stone-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#0E6466]" />
                  {preset.homeBase.name.split('(')[0]}
                </span>
                {preset.legs.map((leg, i) => (
                  <React.Fragment key={leg.id}>
                    <ArrowRight className="w-3 h-3 text-stone-400" />
                    <span className="bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-700">
                      {leg.mode.toUpperCase()}: {leg.to.name.split('(')[0]}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
