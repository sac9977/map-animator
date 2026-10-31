/**
 * MapAnimator - Explorer Edition
 * Main Application Component
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapViewport } from './components/MapViewport';
import { TimelineController } from './components/TimelineController';
import { ExportModal, RESOLUTION_DIMS } from './components/ExportModal';
import { PresetsModal } from './components/PresetsModal';
import { WeatherOverlay } from './components/WeatherOverlay';
import { ElevationProfileViewer } from './components/ElevationProfileViewer';
import { JourneyLeg, AspectRatio, VideoResolution, Waypoint } from './types/travel';
import { PRESET_JOURNEYS, JourneyPreset } from './data/presetJourneys';
import { transitZoomFor } from './utils/cameraZoom';
import { calculateCatmullRomSpline, fetchRoadRoute } from './utils/geoRouting';
import { useModalA11y } from './hooks/useModalA11y';

/**
 * Clear-journey confirmation dialog (extracted so it can own its own a11y wiring).
 */
const ClearJourneyConfirmModal: React.FC<{
  legsCount: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ legsCount, onClose, onConfirm }) => {
  const dialogRef = useModalA11y(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-confirm-modal-title"
        className="bg-surface border border-hairline w-full max-w-md rounded-lg shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150 outline-none"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="clear-confirm-modal-title" className="text-base font-bold text-ink">Clear Entire Journey?</h3>
              <p className="text-xs text-ink2">Reset itinerary to a clean blank canvas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close without clearing"
            className="p-1.5 text-ink3 hover:text-ink rounded-lg hover:bg-well transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-ink2 leading-relaxed">
          This will remove all <strong className="text-ink">{legsCount} journey {legsCount === 1 ? 'leg' : 'legs'}</strong> and reset the route so you can start plotting your own expedition from scratch.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-hairline text-xs font-semibold text-ink hover:bg-well transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Clear Journey</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Blank start: no preset journeys auto-applied. The user picks their own
  // home base and plots everything; Presets remain available in the menu.
  const [homeBase, setHomeBase] = useState<Waypoint>({ id: 'home-blank', name: 'Set home base', lat: 20, lng: 0 });
  const [legs, setLegs] = useState<JourneyLeg[]>([]);

  // Playback & Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLegIndex, setActiveLegIndex] = useState<number>(0);
  const [legProgress, setLegProgress] = useState<number>(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoZoom, setAutoZoom] = useState<boolean>(true);
  // Export studio settings lifted here so the sidebar can preview the exact
  // zoom the video will render, and Auto legs can inherit the export default.
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [zoomOutBias, setZoomOutBias] = useState(0);
  const [zoomPreview, setZoomPreview] = useState<{
    lat: number; lng: number; zoomExport: number; shortSide: number; nonce: number;
  } | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(1);

  // Interactive Tools
  const [isAddingLeg, setIsAddingLeg] = useState<boolean>(false);
  const [isPickingLocation, setIsPickingLocation] = useState<'home' | number | null>(null);
  const [isDrawingTrekForLegIndex, setIsDrawingTrekForLegIndex] = useState<number | null>(null);
  const [trekDrawnPoints, setTrekDrawnPoints] = useState<[number, number][]>([]);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  // Animation Loop ref
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Calculate total journey duration in seconds
  const totalDurationSeconds = legs.reduce(
    (sum, leg) => sum + leg.durationSeconds + leg.pauseAtDestinationSeconds,
    0
  );

  // Calculate current elapsed time in seconds
  let currentElapsedSeconds = 0;
  for (let i = 0; i < activeLegIndex; i++) {
    currentElapsedSeconds += legs[i].durationSeconds + legs[i].pauseAtDestinationSeconds;
  }
  if (legs[activeLegIndex]) {
    currentElapsedSeconds += legProgress * legs[activeLegIndex].durationSeconds;
  }
  const totalProgress = totalDurationSeconds > 0 ? Math.min(1, currentElapsedSeconds / totalDurationSeconds) : 0;

  // Format seconds to MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Main Animation Tick
  const animationTick = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
    }
    const deltaMs = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    setCurrentTimeMs(timestamp);

    if (isPlaying && legs.length > 0) {
      const activeLeg = legs[activeLegIndex];
      if (activeLeg) {
        const legDuration = activeLeg.durationSeconds;
        // Dynamic Pacing Choreography (Item 10):
        // Slow speed during start/end zoom phases, speeded up during transit.
        // The two paces blend over a smoothstep window (±0.07 around the old
        // 0.15/0.85 thresholds) — an instant 0.7↔1.35 switch lands mid
        // departure/arrival sweep and reads as a camera jerk.
        const smoothstep = (t: number) => {
          const x = Math.min(1, Math.max(0, t));
          return x * x * (3 - 2 * x);
        };
        const blend =
          legProgress < 0.5
            ? smoothstep((legProgress - 0.08) / 0.14)
            : smoothstep((0.92 - legProgress) / 0.14);
        const speedFactor = playbackSpeed * (0.7 + (1.35 - 0.7) * blend);

        const deltaProgress = (deltaMs / 1000 / legDuration) * speedFactor;
        const nextProgress = legProgress + deltaProgress;

        if (nextProgress >= 1) {
          // Pause briefly at destination, then advance to next leg
          if (activeLegIndex < legs.length - 1) {
            setActiveLegIndex(prev => prev + 1);
            setLegProgress(0);
          } else {
            // Loop or finish
            setIsPlaying(false);
            setLegProgress(1);
          }
        } else {
          setLegProgress(nextProgress);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(animationTick);
  }, [isPlaying, legs, activeLegIndex, legProgress, playbackSpeed]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animationTick);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [animationTick]);

  // Handlers
  const handleTogglePlay = () => {
    if (!isPlaying && legProgress >= 1 && activeLegIndex === legs.length - 1) {
      // If at end, restart from leg 0
      setActiveLegIndex(0);
      setLegProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveLegIndex(0);
    setLegProgress(0);
  };

  const handleSeekTotal = (targetTotalProgress: number) => {
    const targetSeconds = targetTotalProgress * totalDurationSeconds;
    let accumulated = 0;
    for (let i = 0; i < legs.length; i++) {
      const legTotal = legs[i].durationSeconds + legs[i].pauseAtDestinationSeconds;
      if (targetSeconds <= accumulated + legTotal || i === legs.length - 1) {
        setActiveLegIndex(i);
        const insideSec = Math.max(0, targetSeconds - accumulated);
        setLegProgress(Math.min(1, insideSec / legs[i].durationSeconds));
        break;
      }
      accumulated += legTotal;
    }
  };

  const handleUpdateHomeBase = (base: Waypoint) => {
    setHomeBase(base);
    // If first leg exists, update its 'from'
    if (legs.length > 0) {
      setLegs(prev => [
        { ...prev[0], from: base },
        ...prev.slice(1),
      ]);
    }
  };

  const handleUpdateLeg = (index: number, updated: Partial<JourneyLeg>) => {
    setLegs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  };

  const handleAddLeg = (newLeg: JourneyLeg) => {
    setLegs(prev => [...prev, newLeg]);
  };

  // Live preview of a leg's transit framing: fly the map to the leg's path
  // midpoint at the exact zoom the video will use (rescaled to this viewport).
  const previewNonceRef = useRef(0);
  const handlePreviewLeg = (index: number) => {
    const leg = legs[index];
    if (!leg) return;
    const path = leg.cachedPath;
    const mid =
      path && path.length >= 2
        ? path[Math.round((path.length - 1) / 2)]
        : [leg.from.lat, leg.from.lng];
    const dims = RESOLUTION_DIMS[aspectRatio][resolution];
    setZoomPreview({
      lat: mid[0],
      lng: mid[1],
      zoomExport: transitZoomFor(leg, dims.width, dims.height, leg.zoomBias || zoomOutBias, 0, 256),
      shortSide: Math.min(dims.width, dims.height),
      nonce: ++previewNonceRef.current,
    });
  };

  const handleRemoveLeg = (index: number) => {
    setLegs(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Link previous leg to next leg if removing middle leg
      if (filtered.length > 0) {
        for (let i = 0; i < filtered.length; i++) {
          if (i === 0) {
            filtered[i].from = homeBase;
          } else {
            filtered[i].from = filtered[i - 1].to;
          }
        }
      }
      return filtered;
    });
    if (activeLegIndex >= legs.length - 1) {
      setActiveLegIndex(Math.max(0, legs.length - 2));
      setLegProgress(0);
    }
  };

  const handleFitBounds = () => {
    setIsPlaying(false);
    setFitBoundsTrigger(prev => prev + 1);
  };

  const handleRequestClearJourney = () => {
    if (legs.length === 0) return;
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearJourney = () => {
    setIsPlaying(false);
    setLegs([]);
    setActiveLegIndex(0);
    setLegProgress(0);
    setIsClearConfirmOpen(false);
    setIsAddingLeg(true); // Open leg builder so user can quickly add their first custom destination
  };

  const handleSelectPreset = (preset: JourneyPreset) => {
    setHomeBase(preset.homeBase);
    setLegs(preset.legs);
    setActiveLegIndex(0);
    setLegProgress(0);
    setIsPlaying(false);
    setTimeout(() => {
      setFitBoundsTrigger(prev => prev + 1);
    }, 120);
  };

  // Map Picking Handlers
  const handleLocationPicked = async (point: Waypoint) => {
    if (isPickingLocation === 'home') {
      handleUpdateHomeBase(point);
    } else if (typeof isPickingLocation === 'number') {
      const idx = isPickingLocation;
      if (idx < legs.length) {
        handleUpdateLeg(idx, { to: point });
      } else if (idx === legs.length) {
        const lastPoint = legs.length > 0 ? legs[legs.length - 1].to : homeBase;
        const path = await fetchRoadRoute(lastPoint, point);
        const newLeg: JourneyLeg = {
          id: `leg-${Date.now()}`,
          from: lastPoint,
          to: point,
          mode: 'suv',
          label: `Drive to ${point.name}`,
          vehicleColor: '#0E6466',
          vehicleScale: 1.1,
          showTrail: true,
          trailColor: '#0E6466',
          durationSeconds: 7,
          pauseAtDestinationSeconds: 2.5,
          cachedPath: path,
        };
        handleAddLeg(newLeg);
        setIsAddingLeg(false);
      }
    }
    setIsPickingLocation(null);
  };

  // Trek drawing handlers
  const handleStartDrawingTrek = (legIndex: number) => {
    setIsDrawingTrekForLegIndex(legIndex);
    const leg = legs[legIndex];
    if (leg && leg.cachedPath) {
      setTrekDrawnPoints(leg.cachedPath);
    } else {
      setTrekDrawnPoints([]);
    }
  };

  const handleTrekPointAdded = (legIndex: number, point: [number, number]) => {
    const nextPoints = [...trekDrawnPoints, point];
    setTrekDrawnPoints(nextPoints);
    if (nextPoints.length >= 2) {
      const spline = calculateCatmullRomSpline(nextPoints, 0.5, 20);
      handleUpdateLeg(legIndex, {
        cachedPath: spline,
        trekConfig: {
          sourceType: 'waypoints',
          splineTension: 0.5,
          trailPattern: 'bootprints',
        },
      });
    }
  };

  const handleFinishDrawingTrek = () => {
    setIsDrawingTrekForLegIndex(null);
    setTrekDrawnPoints([]);
  };

  // Destination point is final leg target, or homeBase if none
  const destinationPoint = legs.length > 0 ? legs[legs.length - 1].to : homeBase;

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-ink font-sans select-none overflow-hidden">
      {/* Top Bar Contract Navbar */}
      <Navbar
        onOpenExport={() => setIsExportOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onResetRoute={handleRequestClearJourney}
        onFitBounds={handleFitBounds}
        onAddLegClick={() => setIsAddingLeg(true)}
        legsCount={legs.length}
      />

      {/* Main Workspace split */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Itinerary / Leg Planner Sidebar */}
        <Sidebar
          homeBase={homeBase}
          legs={legs}
          currentLegIndex={activeLegIndex}
          isAddingLeg={isAddingLeg}
          onSetIsAddingLeg={setIsAddingLeg}
          onUpdateHomeBase={handleUpdateHomeBase}
          onUpdateLeg={handleUpdateLeg}
          onAddLeg={handleAddLeg}
          onRemoveLeg={handleRemoveLeg}
          onSelectLeg={(idx) => {
            setActiveLegIndex(idx);
            setLegProgress(0);
          }}
          onStartDrawingTrek={handleStartDrawingTrek}
          isDrawingTrekForLegIndex={isDrawingTrekForLegIndex}
          onStartPickingLocation={(target) => setIsPickingLocation(target)}
          isPickingLocation={isPickingLocation}
          exportDims={RESOLUTION_DIMS[aspectRatio][resolution]}
          zoomOutBias={zoomOutBias}
          onPreviewLeg={handlePreviewLeg}
        />

        {/* Central Map & Elevation Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <div className="flex-1 relative min-h-0">
            <MapViewport
              homeBase={homeBase}
              legs={legs}
              activeLegIndex={activeLegIndex}
              legProgress={legProgress}
              currentTimeMs={currentTimeMs}
              autoZoom={autoZoom}
              fitBoundsTrigger={fitBoundsTrigger}
              isPickingLocation={isPickingLocation}
              onLocationPicked={handleLocationPicked}
              isDrawingTrekForLegIndex={isDrawingTrekForLegIndex}
              onTrekPointAdded={handleTrekPointAdded}
              onFinishDrawingTrek={handleFinishDrawingTrek}
              onOpenWeather={() => setIsWeatherOpen(true)}
              zoomPreview={zoomPreview}
            />
          </div>

          {/* Elevation Profile Viewer displayed below the map */}
          <ElevationProfileViewer
            legs={legs}
            activeLegIndex={activeLegIndex}
            legProgress={legProgress}
            onSeekLegProgress={(prog) => {
              setLegProgress(prog);
            }}
            onSelectLeg={(idx) => {
              setActiveLegIndex(idx);
              setLegProgress(0);
            }}
            onUpdateLeg={handleUpdateLeg}
          />
        </div>
      </div>

      {/* Bottom Timeline Scrubber & Speed Controls */}
      <TimelineController
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        legs={legs}
        activeLegIndex={activeLegIndex}
        legProgress={legProgress}
        totalProgress={totalProgress}
        onSeekTotal={handleSeekTotal}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        autoZoom={autoZoom}
        onToggleAutoZoom={() => setAutoZoom(!autoZoom)}
        currentTimeFormatted={formatTime(currentElapsedSeconds)}
        totalTimeFormatted={formatTime(totalDurationSeconds)}
      />

      {/* Export Studio Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        homeBase={homeBase}
        legs={legs}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        resolution={resolution}
        setResolution={setResolution}
        zoomOutBias={zoomOutBias}
        setZoomOutBias={setZoomOutBias}
      />

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Weather & Climate Comparative Overlay */}
      <WeatherOverlay
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
        startPoint={homeBase}
        endPoint={destinationPoint}
      />

      {/* Clear Journey Confirmation Modal */}
      {isClearConfirmOpen && (
        <ClearJourneyConfirmModal
          legsCount={legs.length}
          onClose={() => setIsClearConfirmOpen(false)}
          onConfirm={handleConfirmClearJourney}
        />
      )}
    </div>
  );
}
