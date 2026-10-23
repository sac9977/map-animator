/**
 * WeatherOverlay Component
 * Displays historical temperature and precipitation comparative analytics
 * for the journey's origin (start point) and destination (final leg endpoint).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudSun,
  Thermometer,
  CloudRain,
  Mountain,
  Compass,
  ArrowRight,
  X,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Waypoint } from '../types/travel';
import {
  fetchHistoricalClimate,
  LocationClimateSummary,
  MonthlyClimateData,
  DailyWeatherData
} from '../services/weatherService';

interface WeatherOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  startPoint: Waypoint;
  endPoint: Waypoint;
}

type ViewMode = 'monthly' | 'daily';
type TempUnit = 'C' | 'F';
type PrecipUnit = 'mm' | 'in';

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  isOpen,
  onClose,
  startPoint,
  endPoint,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startClimate, setStartClimate] = useState<LocationClimateSummary | null>(null);
  const [endClimate, setEndClimate] = useState<LocationClimateSummary | null>(null);

  // User presentation settings
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [unit, setUnit] = useState<TempUnit>('C');
  const [activeSeries, setActiveSeries] = useState<'both' | 'start' | 'end'>('both');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isSameLocation =
    Math.abs(startPoint.lat - endPoint.lat) < 0.005 &&
    Math.abs(startPoint.lng - endPoint.lng) < 0.005;

  // Fetch climate data when modal opens or waypoints change
  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [startRes, endRes] = await Promise.all([
        fetchHistoricalClimate(
          startPoint.lat,
          startPoint.lng,
          startPoint.name,
          startPoint.country,
          startPoint.elevation
        ),
        isSameLocation
          ? Promise.resolve(null)
          : fetchHistoricalClimate(
              endPoint.lat,
              endPoint.lng,
              endPoint.name,
              endPoint.country,
              endPoint.elevation
            ),
      ]);

      setStartClimate(startRes);
      setEndClimate(isSameLocation ? startRes : endRes);
    } catch (err: unknown) {
      console.error('Failed to load historical weather:', err);
      setError('Unable to load full historical archive. Displaying regional estimates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWeatherData();
    }
  }, [isOpen, startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Unit conversion helpers
  const toTemp = (celsius: number): number => {
    if (unit === 'F') {
      return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
    }
    return Math.round(celsius * 10) / 10;
  };

  const toPrecip = (mm: number): number => {
    if (unit === 'F') {
      // Return inches
      return Math.round((mm / 25.4) * 100) / 100;
    }
    return Math.round(mm);
  };

  const precipUnitLabel = unit === 'F' ? 'in' : 'mm';
  const tempUnitLabel = `°${unit}`;

  // Compute elevation delta
  const elevationDelta = useMemo(() => {
    const startElev = startClimate?.elevation ?? startPoint.elevation ?? 0;
    const endElev = endClimate?.elevation ?? endPoint.elevation ?? 0;
    return endElev - startElev;
  }, [startClimate, endClimate, startPoint, endPoint]);

  // Climate recommendation / verdict
  const expeditionVerdict = useMemo(() => {
    if (!endClimate) return null;
    const wetMonths = endClimate.monthlyData
      .filter((m) => m.totalPrecipitation > 90)
      .map((m) => m.monthName);
    const dryComfortableMonths = endClimate.monthlyData
      .filter((m) => m.totalPrecipitation <= 60 && m.avgMaxTemp >= 16 && m.avgMaxTemp <= 30)
      .map((m) => m.monthName);

    let seasonAdvice = 'All-year accessible with temperate conditions.';
    if (dryComfortableMonths.length > 0) {
      seasonAdvice = `Prime expedition window: ${dryComfortableMonths.slice(0, 3).join(', ')} (clear skies, mild temperatures).`;
    } else if (wetMonths.length > 0) {
      seasonAdvice = `Rainy season peaks in ${wetMonths.slice(0, 2).join(' and ')}. Prepare waterproof expedition kit.`;
    }

    let elevationAdvice = '';
    if (elevationDelta > 800) {
      elevationAdvice = `Significant climb (+${elevationDelta}m). Expect noticeably cooler evenings and thinner air.`;
    } else if (elevationDelta < -800) {
      elevationAdvice = `Descent into lower basin (${elevationDelta}m). Temperatures will be substantially warmer.`;
    }

    return { seasonAdvice, elevationAdvice };
  }, [endClimate, elevationDelta]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#E6E1D7] w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-800 animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-5 bg-[#FFFFFF] border-b border-[#E6E1D7] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0E6466]/10 text-[#0E6466] flex items-center justify-center shadow-xs">
              <CloudSun className="w-5 h-5 text-[#0E6466]" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 tracking-tight">
                  Journey Weather & Climate Overlay
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0E6466]/10 text-[#0E6466]">
                  Open-Meteo Archive
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Historical temperature and precipitation analysis from origin to destination
              </p>
            </div>
          </div>

          {/* Quick Controls & Close */}
          <div className="flex items-center gap-3">
            {/* Units Toggle */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setUnit('C')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  unit === 'C'
                    ? 'bg-[#0E6466] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                °C, mm
              </button>
              <button
                onClick={() => setUnit('F')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  unit === 'F'
                    ? 'bg-[#0E6466] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                °F, in
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadWeatherData}
              disabled={loading}
              title="Refresh weather data"
              className="p-2 text-stone-500 hover:text-[#0E6466] rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Origin / Destination Waypoint Context Strip */}
        <div className="px-6 py-3.5 bg-[#FAF8F5] border-b border-[#E6E1D7] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Start point chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E6E1D7] shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E6466]" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-stone-400">Origin</span>
                <span className="font-semibold text-stone-800">
                  {startPoint.name} {startPoint.country ? `(${startPoint.country})` : ''}
                </span>
              </div>
              {startClimate?.elevation !== undefined && (
                <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded ml-1 font-mono">
                  {startClimate.elevation}m
                </span>
              )}
            </div>

            {!isSameLocation && (
              <>
                <ArrowRight className="w-4 h-4 text-stone-400" />
                {/* End point chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E6E1D7] shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-stone-400">Destination</span>
                    <span className="font-semibold text-stone-800">
                      {endPoint.name} {endPoint.country ? `(${endPoint.country})` : ''}
                    </span>
                  </div>
                  {endClimate?.elevation !== undefined && (
                    <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded ml-1 font-mono">
                      {endClimate.elevation}m
                    </span>
                  )}
                </div>
              </>
            )}

            {isSameLocation && (
              <span className="text-[11px] text-stone-500 italic bg-stone-100/80 px-2 py-1 rounded-lg">
                Single-point / Round-trip journey
              </span>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-stone-500">Timeline:</span>
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#E6E1D7] shadow-xs text-xs font-semibold">
              <button
                onClick={() => {
                  setViewMode('monthly');
                  setHoveredIndex(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-[#0E6466] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>12-Month Climate</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('daily');
                  setHoveredIndex(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  viewMode === 'daily'
                    ? 'bg-[#0E6466] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Recent 30 Days</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-500">
              <RefreshCw className="w-8 h-8 text-[#0E6466] animate-spin" />
              <p className="text-sm font-medium">Fetching historical meteorological archives...</p>
              <p className="text-xs text-stone-400">Aggregating temperature bounds and precipitation sum</p>
            </div>
          )}

          {!loading && startClimate && (
            <>
              {/* Climate Verdict / Expedition Packing Recommendation Card */}
              {expeditionVerdict && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0E6466]/8 via-amber-500/8 to-[#0E6466]/5 border border-[#0E6466]/20 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0E6466] text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E6466]">
                      Expedition Climate Assessment
                    </h4>
                    <p className="text-xs text-stone-700 leading-relaxed font-medium">
                      {expeditionVerdict.seasonAdvice}{' '}
                      {expeditionVerdict.elevationAdvice && (
                        <span className="text-amber-800 font-semibold">
                          {expeditionVerdict.elevationAdvice}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Chart Series Selector */}
              {!isSameLocation && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-[#0E6466]" />
                    Comparative Meteorological Charts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSeries('both')}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        activeSeries === 'both'
                          ? 'bg-stone-800 text-white border-stone-800'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      Compare Both
                    </button>
                    <button
                      onClick={() => setActiveSeries('start')}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeSeries === 'start'
                          ? 'bg-[#0E6466] text-white border-[#0E6466]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#0E6466]" />
                      {startPoint.name} Only
                    </button>
                    <button
                      onClick={() => setActiveSeries('end')}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeSeries === 'end'
                          ? 'bg-[#D97706] text-white border-[#D97706]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      {endPoint.name} Only
                    </button>
                  </div>
                </div>
              )}

              {/* Chart 1: Temperature Trajectory (SVG Responsive Chart) */}
              <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Historical Temperature Envelope ({tempUnitLabel})
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {viewMode === 'monthly'
                          ? 'Monthly average maximum and minimum bounds'
                          : 'Daily maximum and minimum temperatures over past 30 days'}
                      </p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs">
                    {(activeSeries === 'both' || activeSeries === 'start') && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#0E6466] rounded-full" />
                        <span className="text-stone-600 font-medium">{startPoint.name}</span>
                      </div>
                    )}
                    {!isSameLocation && (activeSeries === 'both' || activeSeries === 'end') && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#D97706] rounded-full" />
                        <span className="text-stone-600 font-medium">{endPoint.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SVG Temperature Graph */}
                <div className="relative pt-2 pb-1">
                  <TemperatureSvgChart
                    viewMode={viewMode}
                    startClimate={startClimate}
                    endClimate={endClimate}
                    activeSeries={activeSeries}
                    unit={unit}
                    hoveredIndex={hoveredIndex}
                    onHoverIndex={setHoveredIndex}
                    toTemp={toTemp}
                  />
                </div>
              </div>

              {/* Chart 2: Precipitation Volume & Rainy Days */}
              <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Precipitation Accumulation ({precipUnitLabel})
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {viewMode === 'monthly'
                          ? 'Monthly rainfall total and frequency of wet days'
                          : 'Daily precipitation measurements'}
                      </p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs">
                    {(activeSeries === 'both' || activeSeries === 'start') && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-[#0E6466]/80 rounded-xs" />
                        <span className="text-stone-600 font-medium">{startPoint.name}</span>
                      </div>
                    )}
                    {!isSameLocation && (activeSeries === 'both' || activeSeries === 'end') && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-[#D97706]/80 rounded-xs" />
                        <span className="text-stone-600 font-medium">{endPoint.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SVG Precipitation Bar Chart */}
                <div className="relative pt-2 pb-1">
                  <PrecipitationSvgChart
                    viewMode={viewMode}
                    startClimate={startClimate}
                    endClimate={endClimate}
                    activeSeries={activeSeries}
                    unit={unit}
                    hoveredIndex={hoveredIndex}
                    onHoverIndex={setHoveredIndex}
                    toPrecip={toPrecip}
                  />
                </div>
              </div>

              {/* Comparative Climate Summary Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Location Card */}
                <LocationSummaryCard
                  summary={startClimate}
                  label="Origin Location"
                  color="#0E6466"
                  unit={unit}
                  toTemp={toTemp}
                  toPrecip={toPrecip}
                />

                {/* End Location Card */}
                <LocationSummaryCard
                  summary={endClimate || startClimate}
                  label={isSameLocation ? 'Round-trip Waypoint' : 'Destination Location'}
                  color="#D97706"
                  unit={unit}
                  toTemp={toTemp}
                  toPrecip={toPrecip}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#E6E1D7] flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>
              Meteorological historical records sourced via Open-Meteo ECMWF / ERA5-Land Reanalysis.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0E6466] hover:bg-[#094749] text-white font-semibold transition-all shadow-xs active:scale-95"
          >
            Close Weather Overlay
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   SVG TEMPERATURE GRAPH SUBCOMPONENT
   ========================================================================= */

interface TempChartProps {
  viewMode: ViewMode;
  startClimate: LocationClimateSummary;
  endClimate: LocationClimateSummary | null;
  activeSeries: 'both' | 'start' | 'end';
  unit: TempUnit;
  hoveredIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
  toTemp: (c: number) => number;
}

const TemperatureSvgChart: React.FC<TempChartProps> = ({
  viewMode,
  startClimate,
  endClimate,
  activeSeries,
  unit,
  hoveredIndex,
  onHoverIndex,
  toTemp,
}) => {
  const isMonthly = viewMode === 'monthly';
  const startItems = isMonthly ? startClimate.monthlyData : startClimate.recentDaily;
  const endItems = endClimate ? (isMonthly ? endClimate.monthlyData : endClimate.recentDaily) : [];

  const count = startItems.length;
  if (count === 0) return null;

  // Calculate global min and max for chart scale
  let minVal = 999;
  let maxVal = -999;

  startItems.forEach((item) => {
    const minT = toTemp((item as MonthlyClimateData).avgMinTemp ?? (item as DailyWeatherData).minTemp);
    const maxT = toTemp((item as MonthlyClimateData).avgMaxTemp ?? (item as DailyWeatherData).maxTemp);
    if (minT < minVal) minVal = minT;
    if (maxT > maxVal) maxVal = maxT;
  });

  if (endItems.length > 0 && activeSeries !== 'start') {
    endItems.forEach((item) => {
      const minT = toTemp((item as MonthlyClimateData).avgMinTemp ?? (item as DailyWeatherData).minTemp);
      const maxT = toTemp((item as MonthlyClimateData).avgMaxTemp ?? (item as DailyWeatherData).maxTemp);
      if (minT < minVal) minVal = minT;
      if (maxT > maxVal) maxVal = maxT;
    });
  }

  // Add 10% breathing padding
  const range = Math.max(10, maxVal - minVal);
  const chartMin = Math.floor(minVal - range * 0.1);
  const chartMax = Math.ceil(maxVal + range * 0.1);
  const chartRange = chartMax - chartMin;

  // SVG dimensions
  const width = 860;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / (count - 1)) * plotWidth;
  const getY = (val: number) => paddingTop + plotHeight - ((val - chartMin) / chartRange) * plotHeight;

  // Generate SVG paths
  const generateLinePath = (items: (MonthlyClimateData | DailyWeatherData)[], isMax: boolean) => {
    return items
      .map((item, idx) => {
        const val = toTemp(
          isMax
            ? (item as MonthlyClimateData).avgMaxTemp ?? (item as DailyWeatherData).maxTemp
            : (item as MonthlyClimateData).avgMinTemp ?? (item as DailyWeatherData).minTemp
        );
        const x = getX(idx);
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const generateAreaPath = (items: (MonthlyClimateData | DailyWeatherData)[]) => {
    const maxPoints: [number, number][] = [];
    const minPoints: [number, number][] = [];

    items.forEach((item, idx) => {
      const maxVal = toTemp((item as MonthlyClimateData).avgMaxTemp ?? (item as DailyWeatherData).maxTemp);
      const minVal = toTemp((item as MonthlyClimateData).avgMinTemp ?? (item as DailyWeatherData).minTemp);
      maxPoints.push([getX(idx), getY(maxVal)]);
      minPoints.push([getX(idx), getY(minVal)]);
    });

    let path = `M ${maxPoints[0][0].toFixed(1)} ${maxPoints[0][1].toFixed(1)}`;
    for (let i = 1; i < maxPoints.length; i++) {
      path += ` L ${maxPoints[i][0].toFixed(1)} ${maxPoints[i][1].toFixed(1)}`;
    }
    for (let i = minPoints.length - 1; i >= 0; i--) {
      path += ` L ${minPoints[i][0].toFixed(1)} ${minPoints[i][1].toFixed(1)}`;
    }
    path += ' Z';
    return path;
  };

  // Grid tick intervals
  const yTicks = [
    chartMin,
    Math.round(chartMin + chartRange * 0.33),
    Math.round(chartMin + chartRange * 0.66),
    chartMax,
  ];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => onHoverIndex(null)}
      >
        <defs>
          <linearGradient id="startTempBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E6466" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0E6466" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="endTempBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tickVal, i) => {
          const y = getY(tickVal);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#E6E1D7"
                strokeWidth={tickVal === 0 ? 1.5 : 1}
                strokeDasharray={tickVal === 0 ? undefined : '3 3'}
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-stone-400 font-mono"
              >
                {tickVal}°
              </text>
            </g>
          );
        })}

        {/* Start Point Envelopes */}
        {(activeSeries === 'both' || activeSeries === 'start') && (
          <g>
            <path d={generateAreaPath(startItems)} fill="url(#startTempBand)" />
            <path
              d={generateLinePath(startItems, true)}
              fill="none"
              stroke="#0E6466"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <path
              d={generateLinePath(startItems, false)}
              fill="none"
              stroke="#0E6466"
              strokeWidth={1.4}
              strokeDasharray="4 2"
              strokeOpacity={0.7}
            />
          </g>
        )}

        {/* End Point Envelopes */}
        {endItems.length > 0 && (activeSeries === 'both' || activeSeries === 'end') && (
          <g>
            <path d={generateAreaPath(endItems)} fill="url(#endTempBand)" />
            <path
              d={generateLinePath(endItems, true)}
              fill="none"
              stroke="#D97706"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <path
              d={generateLinePath(endItems, false)}
              fill="none"
              stroke="#D97706"
              strokeWidth={1.4}
              strokeDasharray="4 2"
              strokeOpacity={0.7}
            />
          </g>
        )}

        {/* X-axis labels & vertical guide trigger lines */}
        {startItems.map((item, idx) => {
          const x = getX(idx);
          const label = isMonthly
            ? (item as MonthlyClimateData).monthName
            : idx % 3 === 0
            ? (item as DailyWeatherData).formattedDate
            : '';

          return (
            <g key={idx}>
              {label && (
                <text
                  x={x}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-stone-500 font-medium"
                >
                  {label}
                </text>
              )}
              {/* Invisible hover trigger strip */}
              <rect
                x={x - (plotWidth / count) / 2}
                y={paddingTop}
                width={plotWidth / count}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => onHoverIndex(idx)}
              />
            </g>
          );
        })}

        {/* Active hover crosshair and marker dots */}
        {hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < count && (
          <g>
            <line
              x1={getX(hoveredIndex)}
              y1={paddingTop}
              x2={getX(hoveredIndex)}
              y2={height - paddingBottom}
              stroke="#78716C"
              strokeWidth={1.2}
              strokeDasharray="2 2"
            />
            {/* Start Max / Min circles */}
            {(activeSeries === 'both' || activeSeries === 'start') && (
              <>
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(
                    toTemp(
                      (startItems[hoveredIndex] as MonthlyClimateData).avgMaxTemp ??
                        (startItems[hoveredIndex] as DailyWeatherData).maxTemp
                    )
                  )}
                  r={4.5}
                  fill="#0E6466"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(
                    toTemp(
                      (startItems[hoveredIndex] as MonthlyClimateData).avgMinTemp ??
                        (startItems[hoveredIndex] as DailyWeatherData).minTemp
                    )
                  )}
                  r={3.5}
                  fill="#0E6466"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </>
            )}
            {/* End Max / Min circles */}
            {endItems.length > 0 && (activeSeries === 'both' || activeSeries === 'end') && (
              <>
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(
                    toTemp(
                      (endItems[hoveredIndex] as MonthlyClimateData).avgMaxTemp ??
                        (endItems[hoveredIndex] as DailyWeatherData).maxTemp
                    )
                  )}
                  r={4.5}
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(
                    toTemp(
                      (endItems[hoveredIndex] as MonthlyClimateData).avgMinTemp ??
                        (endItems[hoveredIndex] as DailyWeatherData).minTemp
                    )
                  )}
                  r={3.5}
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </>
            )}
          </g>
        )}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < count && (
        <div
          className="absolute z-20 top-2 pointer-events-none bg-stone-900/95 text-white backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-xl border border-stone-700 space-y-1.5 transition-all"
          style={{
            left: `${Math.min(
              82,
              Math.max(12, ((getX(hoveredIndex) / width) * 100))
            )}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-stone-200 border-b border-stone-700/60 pb-1 text-[11px] flex items-center justify-between gap-3">
            <span>
              {isMonthly
                ? (startItems[hoveredIndex] as MonthlyClimateData).monthName
                : (startItems[hoveredIndex] as DailyWeatherData).formattedDate}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-mono">
              Temperature ({unit === 'C' ? '°C' : '°F'})
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            {(activeSeries === 'both' || activeSeries === 'start') && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#0E6466]" />
                  {startClimate.locationName}:
                </span>
                <span className="font-mono font-semibold text-teal-300">
                  {toTemp(
                    (startItems[hoveredIndex] as MonthlyClimateData).avgMaxTemp ??
                      (startItems[hoveredIndex] as DailyWeatherData).maxTemp
                  )}° / {toTemp(
                    (startItems[hoveredIndex] as MonthlyClimateData).avgMinTemp ??
                      (startItems[hoveredIndex] as DailyWeatherData).minTemp
                  )}°
                </span>
              </div>
            )}

            {endItems.length > 0 && (activeSeries === 'both' || activeSeries === 'end') && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                  {endClimate?.locationName}:
                </span>
                <span className="font-mono font-semibold text-amber-300">
                  {toTemp(
                    (endItems[hoveredIndex] as MonthlyClimateData).avgMaxTemp ??
                      (endItems[hoveredIndex] as DailyWeatherData).maxTemp
                  )}° / {toTemp(
                    (endItems[hoveredIndex] as MonthlyClimateData).avgMinTemp ??
                      (endItems[hoveredIndex] as DailyWeatherData).minTemp
                  )}°
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   SVG PRECIPITATION BAR CHART SUBCOMPONENT
   ========================================================================= */

interface PrecipChartProps {
  viewMode: ViewMode;
  startClimate: LocationClimateSummary;
  endClimate: LocationClimateSummary | null;
  activeSeries: 'both' | 'start' | 'end';
  unit: TempUnit;
  hoveredIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
  toPrecip: (mm: number) => number;
}

const PrecipitationSvgChart: React.FC<PrecipChartProps> = ({
  viewMode,
  startClimate,
  endClimate,
  activeSeries,
  unit,
  hoveredIndex,
  onHoverIndex,
  toPrecip,
}) => {
  const isMonthly = viewMode === 'monthly';
  const startItems = isMonthly ? startClimate.monthlyData : startClimate.recentDaily;
  const endItems = endClimate ? (isMonthly ? endClimate.monthlyData : endClimate.recentDaily) : [];

  const count = startItems.length;
  if (count === 0) return null;

  // Global max precipitation
  let maxPrecip = 0;
  startItems.forEach((item) => {
    const val = toPrecip(
      (item as MonthlyClimateData).totalPrecipitation ?? (item as DailyWeatherData).precipitation
    );
    if (val > maxPrecip) maxPrecip = val;
  });

  if (endItems.length > 0 && activeSeries !== 'start') {
    endItems.forEach((item) => {
      const val = toPrecip(
        (item as MonthlyClimateData).totalPrecipitation ?? (item as DailyWeatherData).precipitation
      );
      if (val > maxPrecip) maxPrecip = val;
    });
  }

  const chartMax = Math.max(10, Math.ceil(maxPrecip * 1.15));

  const width = 860;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / count) * plotWidth;
  const barSlotWidth = plotWidth / count;
  const singleBarWidth = Math.max(3, barSlotWidth * 0.36);

  const getY = (val: number) => paddingTop + plotHeight - (val / chartMax) * plotHeight;
  const getBarHeight = (val: number) => Math.max(0, (val / chartMax) * plotHeight);

  const yTicks = [0, Math.round(chartMax * 0.5), chartMax];
  const unitLabel = unit === 'F' ? 'in' : 'mm';

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => onHoverIndex(null)}
      >
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tickVal, i) => {
          const y = getY(tickVal);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#E6E1D7"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-stone-400 font-mono"
              >
                {tickVal}{unitLabel}
              </text>
            </g>
          );
        })}

        {/* Precipitation Column Bars */}
        {startItems.map((item, idx) => {
          const slotX = getX(idx);
          const startVal = toPrecip(
            (item as MonthlyClimateData).totalPrecipitation ?? (item as DailyWeatherData).precipitation
          );
          const startHeight = getBarHeight(startVal);
          const startY = getY(startVal);

          let endHeight = 0;
          let endY = paddingTop + plotHeight;
          if (endItems[idx]) {
            const endVal = toPrecip(
              (endItems[idx] as MonthlyClimateData).totalPrecipitation ??
                (endItems[idx] as DailyWeatherData).precipitation
            );
            endHeight = getBarHeight(endVal);
            endY = getY(endVal);
          }

          const label = isMonthly
            ? (item as MonthlyClimateData).monthName
            : idx % 3 === 0
            ? (item as DailyWeatherData).formattedDate
            : '';

          const isHovered = hoveredIndex === idx;

          return (
            <g key={idx}>
              {/* Month / Date Label */}
              {label && (
                <text
                  x={slotX + barSlotWidth / 2}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-stone-500 font-medium"
                >
                  {label}
                </text>
              )}

              {/* Start Location Bar */}
              {(activeSeries === 'both' || activeSeries === 'start') && (
                <rect
                  x={slotX + (activeSeries === 'both' ? 2 : barSlotWidth * 0.25)}
                  y={startY}
                  width={singleBarWidth}
                  height={startHeight}
                  rx={2}
                  fill="#0E6466"
                  opacity={isHovered ? 1 : 0.82}
                  className="transition-opacity"
                />
              )}

              {/* End Location Bar */}
              {endItems.length > 0 && (activeSeries === 'both' || activeSeries === 'end') && (
                <rect
                  x={
                    slotX +
                    (activeSeries === 'both'
                      ? 4 + singleBarWidth
                      : barSlotWidth * 0.25)
                  }
                  y={endY}
                  width={singleBarWidth}
                  height={endHeight}
                  rx={2}
                  fill="#D97706"
                  opacity={isHovered ? 1 : 0.82}
                  className="transition-opacity"
                />
              )}

              {/* Mouse hover capture strip */}
              <rect
                x={slotX}
                y={paddingTop}
                width={barSlotWidth}
                height={plotHeight}
                fill={isHovered ? '#78716C' : 'transparent'}
                opacity={isHovered ? 0.08 : 0}
                className="cursor-pointer"
                onMouseEnter={() => onHoverIndex(idx)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < count && (
        <div
          className="absolute z-20 top-2 pointer-events-none bg-stone-900/95 text-white backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-xl border border-stone-700 space-y-1.5 transition-all"
          style={{
            left: `${Math.min(
              82,
              Math.max(12, ((getX(hoveredIndex) / width) * 100))
            )}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-stone-200 border-b border-stone-700/60 pb-1 text-[11px] flex items-center justify-between gap-3">
            <span>
              {isMonthly
                ? (startItems[hoveredIndex] as MonthlyClimateData).monthName
                : (startItems[hoveredIndex] as DailyWeatherData).formattedDate}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-mono">
              Rainfall ({unitLabel})
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            {(activeSeries === 'both' || activeSeries === 'start') && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#0E6466]" />
                  {startClimate.locationName}:
                </span>
                <span className="font-mono font-semibold text-teal-300">
                  {toPrecip(
                    (startItems[hoveredIndex] as MonthlyClimateData).totalPrecipitation ??
                      (startItems[hoveredIndex] as DailyWeatherData).precipitation
                  )} {unitLabel}
                  {isMonthly && (
                    <span className="text-[10px] text-stone-400 font-normal ml-1">
                      ({(startItems[hoveredIndex] as MonthlyClimateData).rainyDays} rain days)
                    </span>
                  )}
                </span>
              </div>
            )}

            {endItems.length > 0 && (activeSeries === 'both' || activeSeries === 'end') && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                  {endClimate?.locationName}:
                </span>
                <span className="font-mono font-semibold text-amber-300">
                  {toPrecip(
                    (endItems[hoveredIndex] as MonthlyClimateData).totalPrecipitation ??
                      (endItems[hoveredIndex] as DailyWeatherData).precipitation
                  )} {unitLabel}
                  {isMonthly && (
                    <span className="text-[10px] text-stone-400 font-normal ml-1">
                      ({(endItems[hoveredIndex] as MonthlyClimateData).rainyDays} rain days)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   LOCATION METRIC SUMMARY CARD
   ========================================================================= */

interface LocationCardProps {
  summary: LocationClimateSummary;
  label: string;
  color: string;
  unit: TempUnit;
  toTemp: (c: number) => number;
  toPrecip: (mm: number) => number;
}

const LocationSummaryCard: React.FC<LocationCardProps> = ({
  summary,
  label,
  color,
  unit,
  toTemp,
  toPrecip,
}) => {
  const precipUnit = unit === 'F' ? 'in' : 'mm';
  const tempUnit = `°${unit}`;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-xs space-y-4">
      {/* Location Title Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              {label}
            </span>
            <h4 className="text-sm font-bold text-stone-900 tracking-tight">
              {summary.locationName}
              {summary.country ? `, ${summary.country}` : ''}
            </h4>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-xl">
          {summary.climateType}
        </span>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Annual Precipitation */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-blue-500" />
            Annual Rainfall
          </span>
          <p className="text-base font-bold text-stone-900 font-mono">
            {toPrecip(summary.annualPrecipitation)} {precipUnit}
          </p>
          <span className="text-[10px] text-stone-500">
            Peak: {summary.wettestMonth.month} ({toPrecip(summary.wettestMonth.precip)} {precipUnit})
          </span>
        </div>

        {/* Thermal Range */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-orange-500" />
            Thermal Extreme
          </span>
          <p className="text-base font-bold text-stone-900 font-mono">
            {toTemp(summary.hottestMonth.temp)}{tempUnit}{' '}
            <span className="text-xs font-normal text-stone-400">high</span>
          </p>
          <span className="text-[10px] text-stone-500">
            Low: {toTemp(summary.coldestMonth.temp)}{tempUnit} ({summary.coldestMonth.month})
          </span>
        </div>

        {/* Elevation */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
            <Mountain className="w-3 h-3 text-emerald-600" />
            Elevation
          </span>
          <p className="text-base font-bold text-stone-900 font-mono">
            {summary.elevation !== undefined ? `${summary.elevation} m` : 'Sea level'}
          </p>
          <span className="text-[10px] text-stone-500">
            {summary.elevation !== undefined && summary.elevation > 1500
              ? 'High-altitude expedition terrain'
              : 'Lowland / Maritime terrain'}
          </span>
        </div>

        {/* Coordinates */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-stone-500" />
            Coordinates
          </span>
          <p className="text-xs font-bold text-stone-800 font-mono pt-1">
            {summary.lat.toFixed(2)}°, {summary.lng.toFixed(2)}°
          </p>
          <span className="text-[10px] text-stone-500">
            Driest month: {summary.driestMonth.month}
          </span>
        </div>
      </div>
    </div>
  );
};
