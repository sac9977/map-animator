import React from 'react';
import { Play, Pause, RotateCcw, Video, Compass, Zap, ZoomIn } from 'lucide-react';
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
  legProgress,
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
    <footer className="h-20 bg-[#FFFFFF] border-t border-[#E6E1D7] px-6 flex items-center justify-between gap-6 z-30 shrink-0 shadow-[0_-2px_12px_-4px_rgba(30,41,59,0.04)]">
      {/* Play / Pause & Reset Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onTogglePlay}
          className="w-11 h-11 rounded-2xl bg-[#0E6466] hover:bg-[#094749] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
          title={isPlaying ? 'Pause Animation' : 'Play Animation'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5 text-[#F59E0B]" />
          )}
        </button>

        <button
          onClick={onReset}
          className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
          title="Replay from Beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Current Time / Total Time */}
        <div className="flex flex-col">
          <span className="text-xs font-bold text-stone-800 font-mono-numbers">
            {currentTimeFormatted} <span className="text-stone-400 font-normal">/ {totalTimeFormatted}</span>
          </span>
          <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
            {activeLeg ? `Leg ${activeLegIndex + 1}: ${activeLeg.mode.toUpperCase()}` : 'Ready'}
          </span>
        </div>
      </div>

      {/* Central Timeline Scrubber */}
      <div className="flex-1 max-w-2xl flex flex-col justify-center">
        {/* Scrubber slider */}
        <div className="relative flex items-center group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={totalProgress}
            onChange={(e) => onSeekTotal(parseFloat(e.target.value))}
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#0E6466]"
          />
        </div>

        {/* Leg Waypoint Segment Indicators along the timeline */}
        <div className="flex justify-between items-center mt-1 px-1 text-[10px] font-medium text-stone-400">
          <span>Start</span>
          {legs.map((leg, i) => (
            <span
              key={leg.id}
              className={`transition-colors ${
                i === activeLegIndex ? 'text-[#0E6466] font-bold' : 'text-stone-400'
              }`}
            >
              Leg {i + 1}
            </span>
          ))}
          <span>Finish</span>
        </div>
      </div>

      {/* Speed Multiplier & Dynamic Camera Zoom Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Dynamic Zooming Toggle (Item 10) */}
        <button
          onClick={onToggleAutoZoom}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            autoZoom
              ? 'bg-[#0E6466]/10 text-[#0E6466] ring-1 ring-[#0E6466]/30'
              : 'bg-stone-100 text-stone-500 hover:text-stone-800'
          }`}
          title="Dynamic Camera Choreography: Zooms in at starts and stops, pulls back during high-speed transit"
        >
          <ZoomIn className={`w-3.5 h-3.5 ${autoZoom ? 'text-[#F59E0B]' : ''}`} />
          <span>Dynamic Zoom {autoZoom ? 'ON' : 'OFF'}</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                playbackSpeed === speed
                  ? 'bg-white text-[#0E6466] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
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
