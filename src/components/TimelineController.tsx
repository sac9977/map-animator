import React from 'react';
import { Play, Pause, RotateCcw, ZoomIn } from 'lucide-react';
import { JourneyLeg } from '../types/travel';

interface TimelineControllerProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  legs: JourneyLeg[];
  activeLegIndex: number;
  legProgress: number; // 0 to 1
  totalProgress: number; // 0 to 1
  onSeekTotal: (progress: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  autoZoom: boolean;
  onToggleAutoZoom: () => void;
  currentTimeFormatted: string;
  totalTimeFormatted: string;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 4];

export const TimelineController: React.FC<TimelineControllerProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  legs,
  activeLegIndex,
  totalProgress,
  onSeekTotal,
  playbackSpeed,
  onChangeSpeed,
  autoZoom,
  onToggleAutoZoom,
  currentTimeFormatted,
  totalTimeFormatted,
}) => {
  const activeLeg = legs[activeLegIndex];

  return (
    <footer className="h-16 bg-surface/80 backdrop-blur-xl border-t border-hairline2 px-4 flex items-center justify-between gap-5 z-30 shrink-0">
      {/* Transport controls & readout */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          className="w-9 h-9 rounded-full bg-accent hover:bg-accent-strong text-white flex items-center justify-center active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={onReset}
          aria-label="Replay from beginning"
          className="w-8 h-8 rounded-full bg-well hover:bg-hairline2 text-ink2 hover:text-ink flex items-center justify-center transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col leading-tight hidden sm:flex">
          <span className="text-[13px] font-semibold text-ink font-mono-numbers">
            {currentTimeFormatted} <span className="text-ink3 font-normal">/ {totalTimeFormatted}</span>
          </span>
          <span className="text-[11px] text-ink3 font-mono-numbers">
            {activeLeg ? `Leg ${activeLegIndex + 1} · ${activeLeg.mode}` : 'Ready'}
          </span>
        </div>
      </div>

      {/* Scrubber */}
      <div className="flex-1 max-w-2xl flex flex-col justify-center">
        <div className="relative flex items-center group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={totalProgress}
            aria-label="Journey timeline scrubber"
            onChange={(e) => onSeekTotal(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-between items-center mt-1 px-0.5 text-[10px] font-medium text-ink3 font-mono-numbers">
          <span>Start</span>
          {legs.map((leg, i) => (
            <span key={leg.id} className={i === activeLegIndex ? 'text-accent font-semibold' : ''}>
              Leg {i + 1}
            </span>
          ))}
          <span>Finish</span>
        </div>
      </div>

      {/* Camera zoom & speed */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleAutoZoom}
          aria-pressed={autoZoom}
          title="Dynamic camera choreography: zooms in at starts and stops, pulls back during transit"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            autoZoom ? 'text-accent bg-accent/10' : 'text-ink2 hover:bg-hairline2'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{autoZoom ? 'Dynamic zoom' : 'Static camera'}</span>
        </button>

        <div
          className="flex items-center bg-well p-0.5 rounded-md"
          role="radiogroup"
          aria-label="Playback speed"
        >
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              role="radio"
              aria-checked={playbackSpeed === speed}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-[5px] transition-all font-mono-numbers ${
                playbackSpeed === speed
                  ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                  : 'text-ink2 hover:text-ink'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};
