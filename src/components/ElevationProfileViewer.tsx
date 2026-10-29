import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * Users with reduced-motion enabled get a static tracker dot instead of the
 * SMIL pulse animation (SVG SMIL ignores the CSS media query, so this must be
 * gated at render time).
 */
export const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
import {
  Mountain,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  Maximize2,
  Minimize2,
  Layers,
  MapPin,
  RefreshCw,
  FileCode,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';
import { JourneyLeg } from '../types/travel';
import {
  ElevationAnalysis,
  ElevationPoint,
  getElevationAnalysisForLeg,
  interpolateCurrentElevation,
  fetchTerrainElevationForPath,
  extractElevationFromGPX,
  metersToFeet,
  kmToMiles,
} from '../utils/elevationExtractor';
import { SAMPLE_GPX_TRACKS, SampleGPXTrack } from '../data/sampleGPX';

interface ElevationProfileViewerProps {
  legs: JourneyLeg[];
  activeLegIndex: number;
  legProgress: number; // 0 to 1
  onSeekLegProgress: (progress: number) => void;
  onSelectLeg: (legIndex: number) => void;
  onUpdateLeg: (index: number, updated: Partial<JourneyLeg>) => void;
}

type ViewMode = 'active_leg' | 'entire_journey';
type HeightState = 'compact' | 'expanded' | 'collapsed';

export const ElevationProfileViewer: React.FC<ElevationProfileViewerProps> = ({
  legs,
  activeLegIndex,
  legProgress,
  onSeekLegProgress,
  onSelectLeg,
  onUpdateLeg,
}) => {
  const [heightState, setHeightState] = useState<HeightState>('compact');
  const [useImperial, setUseImperial] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('active_leg');
  const [isFetchingDEM, setIsFetchingDEM] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
    distanceKm: number;
    elevationMeters: number;
    gradePercent: number;
  } | null>(null);
  const [isGPXDropdownOpen, setIsGPXDropdownOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLeg = legs[activeLegIndex];

  // Compute elevation analysis for the active leg
  const activeLegAnalysis = useMemo<ElevationAnalysis | null>(() => {
    if (!activeLeg) return null;
    return getElevationAnalysisForLeg(activeLeg);
  }, [activeLeg]);

  // Compute composite elevation analysis for the entire journey (all legs stitched)
  const entireJourneyAnalysis = useMemo<ElevationAnalysis | null>(() => {
    if (legs.length === 0) return null;

    let accumulatedDist = 0;
    const combinedProfile: ElevationPoint[] = [];
    let minEle = Infinity;
    let maxEle = -Infinity;
    let totalGain = 0;
    let totalLoss = 0;

    legs.forEach((leg) => {
      const legAnalysis = getElevationAnalysisForLeg(leg);
      if (!legAnalysis || legAnalysis.profile.length === 0) return;

      const baseDist = accumulatedDist;
      legAnalysis.profile.forEach((pt, i) => {
        // Skip duplicate zero-distance points at leg boundaries
        if (i === 0 && combinedProfile.length > 0) return;
        const currentTotalDist = baseDist + pt.distanceKm;
        combinedProfile.push({
          distanceKm: Math.round(currentTotalDist * 10) / 10,
          elevationMeters: pt.elevationMeters,
        });
      });

      accumulatedDist += legAnalysis.totalDistanceKm;
      minEle = Math.min(minEle, legAnalysis.minElevationMeters);
      maxEle = Math.max(maxEle, legAnalysis.maxElevationMeters);
      totalGain += legAnalysis.elevationGainMeters;
      totalLoss += legAnalysis.elevationLossMeters;
    });

    if (combinedProfile.length === 0) return null;

    return {
      profile: combinedProfile,
      totalDistanceKm: Math.round(accumulatedDist * 10) / 10,
      minElevationMeters: isFinite(minEle) ? minEle : 0,
      maxElevationMeters: isFinite(maxEle) ? maxEle : 1000,
      elevationGainMeters: totalGain,
      elevationLossMeters: totalLoss,
      averageGradePercent: accumulatedDist > 0 ? Math.round((totalGain / (accumulatedDist * 1000)) * 100 * 10) / 10 : 0,
      maxGradePercent: 15,
      source: 'gpx',
    };
  }, [legs]);

  const currentAnalysis = viewMode === 'entire_journey' ? entireJourneyAnalysis : activeLegAnalysis;

  // Real-time interpolated elevation at current vehicle/hiker progress
  const liveStats = useMemo(() => {
    if (!activeLegAnalysis || activeLegAnalysis.profile.length === 0) {
      return { distanceKm: 0, elevationMeters: 0, gradePercent: 0 };
    }
    return interpolateCurrentElevation(activeLegAnalysis.profile, legProgress);
  }, [activeLegAnalysis, legProgress]);

  // Extract / fetch real DEM data from Open-Meteo
  const handleFetchRealDEM = async () => {
    if (!activeLeg || !activeLeg.cachedPath || activeLeg.cachedPath.length === 0) return;
    setIsFetchingDEM(true);
    const result = await fetchTerrainElevationForPath(activeLeg.cachedPath);
    setIsFetchingDEM(false);

    if (result) {
      onUpdateLeg(activeLegIndex, {
        trekConfig: {
          ...activeLeg.trekConfig,
          sourceType: 'gpx',
          totalDistanceKm: result.totalDistanceKm,
          elevationGainMeters: result.elevationGainMeters,
          elevationLossMeters: result.elevationLossMeters,
          minElevation: result.minElevationMeters,
          maxElevation: result.maxElevationMeters,
          elevationProfile: result.profile,
          pointCount: result.profile.length,
        },
      });
    }
  };

  // Load a GPX track directly into the current leg
  const handleLoadGPXText = (xml: string, fileName: string) => {
    const parsed = extractElevationFromGPX(xml);
    if (!parsed || parsed.points.length === 0) return;

    const path = parsed.points.map((p) => [p[0], p[1]] as [number, number]);
    const endWp = {
      id: `wp-gpx-end-${Date.now()}`,
      name: `${parsed.name} (Summit / Finish)`,
      lat: parsed.points[parsed.points.length - 1][0],
      lng: parsed.points[parsed.points.length - 1][1],
      elevation: parsed.points[parsed.points.length - 1][2],
    };

    onUpdateLeg(activeLegIndex, {
      cachedPath: path,
      to: endWp,
      label: `${parsed.name} (${parsed.totalDistanceKm} km)`,
      mode: 'hike',
      trailColor: '#D97706',
      vehicleColor: '#D97706',
      durationSeconds: Math.max(6, Math.min(14, Math.round(parsed.totalDistanceKm * 0.8))),
      trekConfig: {
        sourceType: 'gpx',
        gpxFileName: fileName,
        rawGpxPoints: parsed.points,
        trailPattern: 'bootprints',
        totalDistanceKm: parsed.totalDistanceKm,
        elevationGainMeters: parsed.elevationGainMeters,
        elevationLossMeters: parsed.elevationLossMeters,
        minElevation: parsed.minElevation,
        maxElevation: parsed.maxElevation,
        pointCount: parsed.pointCount,
        elevationProfile: parsed.elevationProfile,
      },
    });
    setIsGPXDropdownOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const xml = event.target?.result as string;
      if (xml) {
        handleLoadGPXText(xml, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // SVG Geometry Calculation
  const svgData = useMemo(() => {
    if (!currentAnalysis || currentAnalysis.profile.length < 2) return null;

    const profile = currentAnalysis.profile;
    const width = 1000;
    const height = heightState === 'expanded' ? 210 : 130;
    const padding = { top: 22, right: 36, bottom: 26, left: 52 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const maxDist = Math.max(1, currentAnalysis.totalDistanceKm);
    const minEle = Math.floor((currentAnalysis.minElevationMeters * 0.95) / 50) * 50;
    const maxEle = Math.ceil((currentAnalysis.maxElevationMeters * 1.05) / 50) * 50;
    const eleRange = Math.max(50, maxEle - minEle);

    const getX = (distKm: number) => padding.left + (distKm / maxDist) * plotWidth;
    const getY = (eleMeters: number) => padding.top + plotHeight - ((eleMeters - minEle) / eleRange) * plotHeight;

    // Build SVG Path
    const points = profile.map((pt) => ({
      x: getX(pt.distanceKm),
      y: getY(pt.elevationMeters),
      ...pt,
    }));

    // Area & Line Path string
    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Gentle curve between points
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      lineD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${lineD} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${
      padding.top + plotHeight
    } Z`;

    // Elevation Horizontal Grid Lines (4 steps)
    const gridLines = [];
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const ele = minEle + (eleRange / gridCount) * i;
      gridLines.push({
        y: getY(ele),
        elevationMeters: Math.round(ele),
      });
    }

    // Distance Vertical Grid Lines (5 steps)
    const distTicks = [];
    const distCount = 5;
    for (let i = 0; i <= distCount; i++) {
      const dist = (maxDist / distCount) * i;
      distTicks.push({
        x: getX(dist),
        distanceKm: Math.round(dist * 10) / 10,
      });
    }

    // Active Tracker Coordinates
    const trackerDist = (viewMode === 'entire_journey' ? 0 : legProgress) * maxDist;
    const trackerX = getX(trackerDist);
    const trackerY = getY(liveStats.elevationMeters);

    return {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
      maxDist,
      minEle,
      maxEle,
      getX,
      getY,
      lineD,
      areaD,
      gridLines,
      distTicks,
      trackerX,
      trackerY,
      trackerDist,
      points,
    };
  }, [currentAnalysis, heightState, viewMode, legProgress, liveStats]);

  // Handle Scrubbing & Hovering on SVG
  const handleSvgPointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>, isClick = false) => {
      if (!svgRef.current || !svgData || !currentAnalysis) return;
      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const svgScaleX = svgData.width / rect.width;
      const currentSvgX = pointerX * svgScaleX;

      const clampedX = Math.max(svgData.padding.left, Math.min(svgData.width - svgData.padding.right, currentSvgX));
      const fraction = (clampedX - svgData.padding.left) / svgData.plotWidth;
      const distKm = fraction * svgData.maxDist;

      const interp = interpolateCurrentElevation(currentAnalysis.profile, fraction);

      setHoverPosition({
        x: clampedX,
        y: svgData.getY(interp.elevationMeters),
        distanceKm: interp.distanceKm,
        elevationMeters: interp.elevationMeters,
        gradePercent: interp.gradePercent,
      });

      if (isClick || e.buttons === 1) {
        if (viewMode === 'active_leg') {
          onSeekLegProgress(fraction);
        }
      }
    },
    [svgData, currentAnalysis, viewMode, onSeekLegProgress]
  );

  // Formatter helpers
  const formatElevation = (m: number) => {
    if (useImperial) {
      return `${metersToFeet(m).toLocaleString()} ft`;
    }
    return `${Math.round(m).toLocaleString()} m`;
  };

  const formatDistance = (km: number) => {
    if (useImperial) {
      return `${kmToMiles(km)} mi`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Close GPX dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isGPXDropdownOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsGPXDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isGPXDropdownOpen]);

  // If collapsed to bottom strip
  if (heightState === 'collapsed') {
    return (
      <div className="w-full bg-surface/95 backdrop-blur-md border-t border-hairline px-4 py-1.5 flex items-center justify-between z-20 shrink-0 shadow-sm transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Mountain className="w-3.5 h-3.5 text-accent" />
            <span className="tracking-wide">Elevation</span>
          </div>

          <div className="h-3 w-px bg-hairline" />

          {activeLeg && (
            <span className="text-xs text-ink2 font-medium truncate max-w-xs">
              Leg {activeLegIndex + 1}: {activeLeg.label}
            </span>
          )}

          <div className="flex items-center gap-2 text-xs font-mono-numbers">
            <span className="text-accent font-bold">{formatElevation(liveStats.elevationMeters)}</span>
            {currentAnalysis && (
              <span className="text-ink3 text-[11px]">
                (Peak: {formatElevation(currentAnalysis.maxElevationMeters)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">            <button
              onClick={() => setHeightState('compact')}
              aria-label="Open elevation profile"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-well hover:bg-well text-ink text-xs font-semibold transition-colors"
              title="Expand Elevation Viewer"
            >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Open Profile</span>
          </button>
        </div>
      </div>
    );
  }

  const containerHeightClass = heightState === 'expanded' ? 'h-64' : 'h-48';

  return (
    <div
      ref={containerRef}
      className={`w-full bg-surface border-t border-hairline flex flex-col z-10 shrink-0 shadow-[0_-4px_16px_-4px_rgba(30,41,59,0.05)] transition-all duration-200 ${containerHeightClass}`}
    >
      {/* Hidden File Input for GPX upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".gpx,application/gpx+xml,text/xml"
        className="hidden"
      />

      {/* Elevation Profile Header Toolbar (single row, no wrap) */}
      <div className="h-10 px-3 border-b border-hairline bg-well flex items-center gap-2 shrink-0 flex-nowrap whitespace-nowrap">
        {/* Left: Title & Leg / Route selector */}
        <Mountain className="w-4 h-4 text-accent shrink-0" />
        <span className="text-[13px] font-semibold text-ink shrink-0">Elevation</span>

        <div className="flex items-center bg-hairline2/60 p-px rounded-md shrink-0">
          <button
            onClick={() => setViewMode('active_leg')}
            aria-pressed={viewMode === 'active_leg'}
            className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-colors ${
              viewMode === 'active_leg' ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-ink2 hover:text-ink'
            }`}
          >
            Leg {activeLegIndex + 1}
          </button>
          <button
            onClick={() => setViewMode('entire_journey')}
            aria-pressed={viewMode === 'entire_journey'}
            className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-colors ${
              viewMode === 'entire_journey' ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-ink2 hover:text-ink'
            }`}
          >
            Route
          </button>
        </div>

        {/* Center: live telemetry (collapses gracefully) */}
        <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden text-[11px] font-mono-numbers justify-end pl-1">
          <span className="flex items-center gap-1.5 text-accent shrink-0" title="Live altitude at the traveler position">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            {formatElevation(liveStats.elevationMeters)}
          </span>
          {currentAnalysis && (
            <>
              <span className="hidden lg:flex items-center gap-1 text-ink2" title="Cumulative elevation gain">
                <ArrowUpRight className="w-3 h-3" />
                <span className="text-emerald-600 font-semibold">+{formatElevation(currentAnalysis.elevationGainMeters)}</span>
              </span>
              <span className="hidden lg:flex items-center gap-1 text-ink2" title="Cumulative elevation loss">
                <ArrowDownRight className="w-3 h-3" />
                <span className="text-sky-500 font-semibold">-{formatElevation(currentAnalysis.elevationLossMeters)}</span>
              </span>
              <span className="hidden xl:flex items-center gap-1 text-ink2" title="Highest point of the leg">
                <Mountain className="w-3 h-3" />
                <span className="text-amber-600 font-semibold">{formatElevation(currentAnalysis.maxElevationMeters)}</span>
              </span>
              {currentAnalysis.source !== 'gpx' && (
                <span className="hidden 2xl:inline text-ink3">{currentAnalysis.source === 'dem_api' ? 'Copernicus DEM' : 'Topographic'}</span>
              )}
            </>
          )}
        </div>

        {/* Right: utilities */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => setIsGPXDropdownOpen(!isGPXDropdownOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isGPXDropdownOpen ? 'bg-hairline2/60 text-ink' : 'text-ink2 hover:text-ink hover:bg-hairline2/60'
              }`}
              title="Import GPX terrain or load a sample track"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>GPX</span>
              <ChevronDown className="w-3 h-3 text-ink3" />
            </button>

            {isGPXDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-hairline rounded-lg shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
{/* Upload own GPX */}
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsGPXDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-well text-ink font-medium text-left transition-colors"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-semibold text-ink">Upload GPX File</div>
                    <div className="text-xs text-ink3">Extract tracks, heights & waypoints</div>
                  </div>
                </button>

                {/* Fetch DEM for current path */}
                <button
                  onClick={() => {
                    handleFetchRealDEM();
                    setIsGPXDropdownOpen(false);
                  }}
                  disabled={isFetchingDEM}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-ink hover:text-emerald-900 font-medium text-left transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-600 ${isFetchingDEM ? 'animate-spin' : ''}`} />
                  <div>
                    <div className="font-semibold text-ink">Fetch Real Satellite DEM</div>
                    <div className="text-xs text-ink3">Copernicus 90m terrain elevation</div>
                  </div>
                </button>

                <div className="px-2 py-1.5 text-xs font-bold text-ink3 border-t border-hairline2 mt-1 mb-0.5">
                  Load Authentic GPX Track
                </div>

                {SAMPLE_GPX_TRACKS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadGPXText(sample.xml, `${sample.title}.gpx`)}
                    className="w-full flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-well text-ink text-left transition-colors"
                  >
                    <Mountain className="w-3.5 h-3.5 text-ink3 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">{sample.title}</div>
                      <div className="text-xs text-ink3 truncate">{sample.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Metric / Imperial toggle */}
          <button
            onClick={() => setUseImperial(!useImperial)}
            className="px-2 py-1 rounded-md text-[11px] font-medium text-ink2 hover:text-ink hover:bg-hairline2/60 font-mono-numbers transition-colors"
            title="Toggle metric (m/km) and imperial (ft/mi)"
          >
            {useImperial ? 'ft / mi' : 'm / km'}
          </button>

          <button
            onClick={() => setHeightState(heightState === 'expanded' ? 'compact' : 'expanded')}
            aria-label={heightState === 'expanded' ? 'Compact elevation view' : 'Expand elevation view'}
            className="p-1.5 rounded-md text-ink2 hover:text-ink hover:bg-hairline2/60 transition-colors"
          >
            {heightState === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setHeightState('collapsed')}
            aria-label="Collapse elevation profile"
            className="p-1.5 rounded-md text-ink2 hover:text-ink hover:bg-hairline2/60 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 w-full relative bg-surface overflow-hidden select-none">
        {svgData ? (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgData.width} ${svgData.height}`}
              preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair block"
              onPointerMove={(e) => handleSvgPointer(e, false)}
              onPointerDown={(e) => handleSvgPointer(e, true)}
              onPointerLeave={() => setHoverPosition(null)}
            >
              <defs>
                {/* Elevation Area Gradient */}
                <linearGradient id="elevationAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#D97706" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.02" />
                </linearGradient>

                {/* Elevation Line Gradient */}
                <linearGradient id="elevationLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="60%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="elevationGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--accent)" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Horizontal Altitude Gridlines & Left Y-Axis Labels */}
              {svgData.gridLines.map((grid, idx) => (
                <g key={`grid-y-${idx}`}>
                  <line
                    x1={svgData.padding.left}
                    y1={grid.y}
                    x2={svgData.width - svgData.padding.right}
                    y2={grid.y}
                    stroke="var(--hairline-2)"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 || idx === svgData.gridLines.length - 1 ? 'none' : '3 3'}
                  />
                  <text
                    x={svgData.padding.left - 6}
                    y={grid.y + 3.5}
                    textAnchor="end"
                    fill="var(--ink-3)"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {formatElevation(grid.elevationMeters)}
                  </text>
                </g>
              ))}

              {/* Vertical Distance Gridlines & Bottom X-Axis Labels */}
              {svgData.distTicks.map((tick, idx) => (
                <g key={`tick-x-${idx}`}>
                  <line
                    x1={tick.x}
                    y1={svgData.padding.top}
                    x2={tick.x}
                    y2={svgData.height - svgData.padding.bottom}
                    stroke="var(--hairline-2)"
                    strokeWidth="1"
                  />
                  <text
                    x={tick.x}
                    y={svgData.height - 8}
                    textAnchor="middle"
                    fill="var(--ink-3)"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {formatDistance(tick.distanceKm)}
                  </text>
                </g>
              ))}

              {/* Filled Elevation Area */}
              <path d={svgData.areaD} fill="url(#elevationAreaGradient)" />

              {/* Top Boundary Elevation Contour Stroke */}
              <path
                d={svgData.lineD}
                fill="none"
                stroke="url(#elevationLineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#elevationGlow)"
              />

              {/* Live Vehicle / Hiker Tracking Indicator on the Elevation Curve */}
              {viewMode === 'active_leg' && (
                <g className="transition-all duration-75">
                  {/* Vertical Guideline */}
                  <line
                    x1={svgData.trackerX}
                    y1={svgData.padding.top}
                    x2={svgData.trackerX}
                    y2={svgData.height - svgData.padding.bottom}
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.85"
                  />

                  {/* Pulsing Outer Radar Ring */}
                  <circle cx={svgData.trackerX} cy={svgData.trackerY} r="9" fill="var(--accent)" fillOpacity="0.2">
                    {!PREFERS_REDUCED_MOTION && (
                      <>
                        <animate attributeName="r" values="6;13;6" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="fill-opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
                      </>
                    )}
                  </circle>

                  {/* Outer White Border Circle */}
                  <circle
                    cx={svgData.trackerX}
                    cy={svgData.trackerY}
                    r="5.5"
                    fill="var(--surface)"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                  />

                  {/* Center Dot */}
                  <circle cx={svgData.trackerX} cy={svgData.trackerY} r="2.5" fill="#F59E0B" />
                </g>
              )}

              {/* Hover Inspection Crosshair and Point */}
              {hoverPosition && (
                <g>
                  {/* Vertical Crosshair */}
                  <line
                    x1={hoverPosition.x}
                    y1={svgData.padding.top}
                    x2={hoverPosition.x}
                    y2={svgData.height - svgData.padding.bottom}
                    stroke="#D97706"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  {/* Point Marker */}
                  <circle
                    cx={hoverPosition.x}
                    cy={hoverPosition.y}
                    r="4.5"
                    fill="#D97706"
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Box */}
            {hoverPosition && (
              <div
                className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-black/85 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] font-mono-numbers backdrop-blur-xs flex items-center gap-2 border border-white/15"
                style={{
                  left: `${(hoverPosition.x / svgData.width) * 100}%`,
                  top: `${(hoverPosition.y / svgData.height) * 100}%`,
                }}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400">{formatElevation(hoverPosition.elevationMeters)}</span>
                    <span className="text-ink3 text-xs">({formatDistance(hoverPosition.distanceKm)})</span>
                  </div>
                  <span className="text-xs text-stone-300 font-sans">
                    Slope:{' '}
                    <strong className={hoverPosition.gradePercent > 0 ? 'text-amber-300' : 'text-stone-300'}>
                      {hoverPosition.gradePercent > 0 ? `+${hoverPosition.gradePercent}%` : `${hoverPosition.gradePercent}%`}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty / Prompt State */
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div className="max-w-md flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <Mountain className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ink tracking-wide">
                No GPX Terrain Track Loaded
              </h4>
              <p className="text-xs text-ink2 mt-1 mb-3">
                Extract terrain height data from a GPX file or load one of our authentic mountain expeditions to inspect the elevation profile below the map.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .GPX</span>
                </button>

                <button
                  onClick={() => handleLoadGPXText(SAMPLE_GPX_TRACKS[0].xml, `${SAMPLE_GPX_TRACKS[0].title}.gpx`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kilimanjaro Summit (5,895m)</span>
                </button>

                <button
                  onClick={handleFetchRealDEM}
                  disabled={isFetchingDEM}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-well hover:bg-well text-ink text-xs font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingDEM ? 'animate-spin' : ''}`} />
                  <span>Fetch Real Satellite DEM</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen-reader live region: announces DEM extraction start/finish */}
      <div role="status" aria-live="polite" className="sr-only">
        {isFetchingDEM
          ? 'Fetching real satellite terrain elevation data...'
          : currentAnalysis?.source === 'dem_api'
            ? 'Real satellite terrain elevation data loaded.'
            : ''}
      </div>
    </div>
  );
};
