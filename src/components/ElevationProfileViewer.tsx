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
      <div className="w-full bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E6E1D7] px-4 py-1.5 flex items-center justify-between z-20 shrink-0 shadow-sm transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <Mountain className="w-3.5 h-3.5 text-[#0E6466]" />
            <span className="tracking-wide">ELEVATION PROFILE</span>
          </div>

          <div className="h-3 w-px bg-stone-300" />

          {activeLeg && (
            <span className="text-xs text-stone-600 font-medium truncate max-w-xs">
              Leg {activeLegIndex + 1}: {activeLeg.label}
            </span>
          )}

          <div className="flex items-center gap-2 text-xs font-mono-numbers">
            <span className="text-[#0E6466] font-bold">{formatElevation(liveStats.elevationMeters)}</span>
            {currentAnalysis && (
              <span className="text-stone-400 text-[11px]">
                (Peak: {formatElevation(currentAnalysis.maxElevationMeters)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">            <button
              onClick={() => setHeightState('compact')}
              aria-label="Open elevation profile"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
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
      className={`w-full bg-[#FFFFFF] border-t border-[#E6E1D7] flex flex-col z-10 shrink-0 shadow-[0_-4px_16px_-4px_rgba(30,41,59,0.05)] transition-all duration-200 ${containerHeightClass}`}
    >
      {/* Hidden File Input for GPX upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".gpx,application/gpx+xml,text/xml"
        className="hidden"
      />

      {/* Elevation Profile Header Toolbar */}
      <div className="h-10 px-4 border-b border-[#F0EBE1] bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Title & Source Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 tracking-wide uppercase">
            <Mountain className="w-4 h-4 text-[#0E6466]" />
            <span>Elevation Profile</span>
          </div>

          {/* Leg Indicator / Selector */}
          <div className="flex items-center bg-stone-200/60 p-0.5 rounded-lg text-[11px] font-medium text-stone-600">
            <button
              onClick={() => setViewMode('active_leg')}
              aria-pressed={viewMode === 'active_leg'}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                viewMode === 'active_leg'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'hover:text-stone-900 text-stone-500'
              }`}
            >
              Leg {activeLegIndex + 1}
            </button>
            <button
              onClick={() => setViewMode('entire_journey')}
              aria-pressed={viewMode === 'entire_journey'}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                viewMode === 'entire_journey'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'hover:text-stone-900 text-stone-500'
              }`}
            >
              Entire Route
            </button>
          </div>

          {/* Source tag */}
          {currentAnalysis && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                currentAnalysis.source === 'gpx'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : currentAnalysis.source === 'dem_api'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {currentAnalysis.source === 'gpx'
                ? 'GPX Terrain Track'
                : currentAnalysis.source === 'dem_api'
                ? 'Copernicus 90m DEM'
                : 'Topographical Profile'}
            </span>
          )}
        </div>

        {/* Center: Live Telemetry Badges */}
        <div className="flex items-center gap-3 text-xs font-mono-numbers overflow-x-auto no-scrollbar py-0.5">
          {/* Current Altitude (Live synced!) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E6466]/10 text-[#0E6466] border border-[#0E6466]/20">
            <span className="w-2 h-2 rounded-full bg-[#0E6466] animate-pulse" />
            <span className="text-[10px] uppercase font-sans font-bold text-[#0E6466]">Live Alt:</span>
            <span className="font-bold text-xs">{formatElevation(liveStats.elevationMeters)}</span>
          </div>

          {currentAnalysis && (
            <>
              {/* Total Ascent */}
              <div
                className="flex items-center gap-1 text-emerald-700 font-semibold"
                title="Cumulative Elevation Gain"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-sans text-stone-400">Gain:</span>
                <span>+{formatElevation(currentAnalysis.elevationGainMeters)}</span>
              </div>

              {/* Total Descent */}
              <div
                className="flex items-center gap-1 text-sky-700 font-semibold"
                title="Cumulative Elevation Loss"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-sans text-stone-400">Loss:</span>
                <span>-{formatElevation(currentAnalysis.elevationLossMeters)}</span>
              </div>

              {/* Peak Summit */}
              <div className="flex items-center gap-1 text-amber-800 font-semibold" title="Peak Max Elevation">
                <Mountain className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] uppercase font-sans text-stone-400">Peak:</span>
                <span>{formatElevation(currentAnalysis.maxElevationMeters)}</span>
              </div>

              {/* Live Grade / Slope */}
              <div className="flex items-center gap-1 text-stone-600 font-semibold" title="Instantaneous Slope Grade">
                <Gauge className="w-3 h-3 text-stone-400" />
                <span className="text-[10px] uppercase font-sans text-stone-400">Grade:</span>
                <span className={liveStats.gradePercent > 0 ? 'text-amber-700' : 'text-stone-700'}>
                  {liveStats.gradePercent > 0 ? `+${liveStats.gradePercent}%` : `${liveStats.gradePercent}%`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: GPX menu, Unit Switcher, View Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* GPX Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsGPXDropdownOpen(!isGPXDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-200/70 transition-colors"
              title="Import GPX Terrain or Select Authentic Sample Track"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" />
              <span>GPX Options</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {isGPXDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#E6E1D7] rounded-2xl shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
                  Extract Terrain from GPX
                </div>

                {/* Upload own GPX */}
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsGPXDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-amber-50 text-stone-700 hover:text-amber-900 font-medium text-left transition-colors"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-semibold text-stone-800">Upload GPX File</div>
                    <div className="text-[10px] text-stone-400">Extract tracks, heights & waypoints</div>
                  </div>
                </button>

                {/* Fetch DEM for current path */}
                <button
                  onClick={() => {
                    handleFetchRealDEM();
                    setIsGPXDropdownOpen(false);
                  }}
                  disabled={isFetchingDEM}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 font-medium text-left transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-600 ${isFetchingDEM ? 'animate-spin' : ''}`} />
                  <div>
                    <div className="font-semibold text-stone-800">Fetch Real Satellite DEM</div>
                    <div className="text-[10px] text-stone-400">Copernicus 90m terrain elevation</div>
                  </div>
                </button>

                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-t border-stone-100 mt-1 mb-0.5">
                  Load Authentic GPX Track
                </div>

                {SAMPLE_GPX_TRACKS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadGPXText(sample.xml, `${sample.title}.gpx`)}
                    className="w-full flex items-start gap-2 px-2.5 py-1.5 rounded-xl hover:bg-stone-50 text-stone-700 text-left transition-colors"
                  >
                    <Mountain className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-800 truncate">{sample.title}</div>
                      <div className="text-[10px] text-stone-400 truncate">{sample.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Metric / Imperial toggle */}
          <button
            onClick={() => setUseImperial(!useImperial)}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            title="Toggle between Metric (m/km) and Imperial (ft/mi)"
          >
            {useImperial ? 'ft / mi' : 'm / km'}
          </button>

          {/* Expand / Minimize toggle */}
          <button
            onClick={() => setHeightState(heightState === 'expanded' ? 'compact' : 'expanded')}
            aria-label={heightState === 'expanded' ? 'Compact elevation view' : 'Expand elevation view'}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            title={heightState === 'expanded' ? 'Compact View' : 'Expanded View'}
          >
            {heightState === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Collapse bar */}
          <button
            onClick={() => setHeightState('collapsed')}
            aria-label="Collapse elevation profile"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            title="Collapse Elevation Profile"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 w-full relative bg-[#FDFBF7] overflow-hidden select-none">
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
                  <stop offset="0%" stopColor="#0E6466" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#D97706" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.02" />
                </linearGradient>

                {/* Elevation Line Gradient */}
                <linearGradient id="elevationLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0E6466" />
                  <stop offset="60%" stopColor="#0E6466" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="elevationGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0E6466" floodOpacity="0.3" />
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
                    stroke="#E5DFD3"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 || idx === svgData.gridLines.length - 1 ? 'none' : '3 3'}
                  />
                  <text
                    x={svgData.padding.left - 6}
                    y={grid.y + 3.5}
                    textAnchor="end"
                    fill="#78716C"
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
                    stroke="#EFE9DC"
                    strokeWidth="1"
                  />
                  <text
                    x={tick.x}
                    y={svgData.height - 8}
                    textAnchor="middle"
                    fill="#78716C"
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
                    stroke="#0E6466"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.85"
                  />

                  {/* Pulsing Outer Radar Ring */}
                  <circle cx={svgData.trackerX} cy={svgData.trackerY} r="9" fill="#0E6466" fillOpacity="0.2">
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
                    fill="#FFFFFF"
                    stroke="#0E6466"
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
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Box */}
            {hoverPosition && (
              <div
                className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-stone-900/90 text-white px-2.5 py-1.5 rounded-xl shadow-xl text-[11px] font-mono-numbers backdrop-blur-xs flex items-center gap-2 border border-stone-700"
                style={{
                  left: `${(hoverPosition.x / svgData.width) * 100}%`,
                  top: `${(hoverPosition.y / svgData.height) * 100}%`,
                }}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400">{formatElevation(hoverPosition.elevationMeters)}</span>
                    <span className="text-stone-400 text-[10px]">({formatDistance(hoverPosition.distanceKm)})</span>
                  </div>
                  <span className="text-[10px] text-stone-300 font-sans">
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
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Mountain className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                No GPX Terrain Track Loaded
              </h4>
              <p className="text-xs text-stone-500 mt-1 mb-3">
                Extract terrain height data from a GPX file or load one of our authentic mountain expeditions to inspect the elevation profile below the map.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E6466] hover:bg-[#094749] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .GPX</span>
                </button>

                <button
                  onClick={() => handleLoadGPXText(SAMPLE_GPX_TRACKS[0].xml, `${SAMPLE_GPX_TRACKS[0].title}.gpx`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kilimanjaro Summit (5,895m)</span>
                </button>

                <button
                  onClick={handleFetchRealDEM}
                  disabled={isFetchingDEM}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
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
