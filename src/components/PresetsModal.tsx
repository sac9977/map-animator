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
        className="bg-surface border border-hairline w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        <div className="px-6 py-4 border-b border-hairline bg-well flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="presets-modal-title" className="text-base font-bold text-ink">Curated Expeditions</h3>
              <p className="text-xs text-ink2">Load authentic journeys with flights, 4WD safaris, and wilderness treks</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close curated expeditions"
            className="p-1.5 text-ink3 hover:text-ink rounded-lg hover:bg-well/60 transition-colors"
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
              className="text-left w-full bg-well hover:bg-surface border border-hairline hover:border-accent p-4 rounded-lg cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                  {preset.title}
                </h4>
                <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                  {preset.legs.length} Legs
                </span>
              </div>

              <p className="text-xs text-ink2 mb-3">
                {preset.subtitle}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-ink2 pt-2 border-t border-hairline/60">
                <span className="font-semibold text-ink flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  {preset.homeBase.name.split('(')[0]}
                </span>
                {preset.legs.map((leg, i) => (
                  <React.Fragment key={leg.id}>
                    <ArrowRight className="w-3 h-3 text-ink3" />
                    <span className="bg-surface border border-hairline px-1.5 py-0.5 rounded text-ink">
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
