import React, { useState, useRef, useEffect } from 'react';
import {
  Plane,
  TrainFront,
  Sailboat,
  Caravan,
  Car,
  Truck,
  Ship,
  Footprints,
  Bike,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MapPin,
  Search,
  Upload,
  Layers,
  Sparkles,
  Route,
  ArrowRight,
  Crosshair,
  Mountain,
  FileText,
  TrendingUp,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Palette,
  AlertTriangle,
  X,
} from 'lucide-react';
import { JourneyLeg, TransportMode, Waypoint } from '../types/travel';
import { transitZoomFor } from '../utils/cameraZoom';
import { searchAirports } from '../data/airports';
import {
  searchPlaceOSM,
  parseGPX,
  fetchRoadRoute,
  calculateFlightPath,
  calculateSeaRoute,
  calculateCatmullRomSpline,
  ParsedGPXResult,
} from '../utils/geoRouting';
import { SAMPLE_GPX_TRACKS, SampleGPXTrack } from '../data/sampleGPX';
import { IconPickerModal } from './IconPickerModal';
import { getIconDefinition, getDefaultIconIdForMode } from '../data/travelerIcons';
import { TRAIL_COLOR_PRESETS, hexToRgba, getDefaultTrailColorForMode } from '../data/trailStyles';

interface SidebarProps {
  homeBase: Waypoint;
  legs: JourneyLeg[];
  currentLegIndex: number;
  isAddingLeg: boolean;
  onSetIsAddingLeg: (isAdding: boolean) => void;
  onUpdateHomeBase: (base: Waypoint) => void;
  onUpdateLeg: (index: number, updated: Partial<JourneyLeg>) => void;
  onAddLeg: (newLeg: JourneyLeg) => void;
  onRemoveLeg: (index: number) => void;
  onSelectLeg: (index: number) => void;
  onStartDrawingTrek: (legIndex: number) => void;
  isDrawingTrekForLegIndex: number | null;
  onStartPickingLocation: (target: 'home' | number) => void;
  isPickingLocation: 'home' | number | null;
  exportDims?: { width: number; height: number };
  zoomOutBias?: number;
  onPreviewLeg?: (index: number) => void;
}

const TRANSPORT_MODES: { mode: TransportMode; label: string; shortLabel: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }[] = [
  { mode: 'flight', label: 'Flight', shortLabel: 'Flight', icon: Plane },
  { mode: 'suv', label: 'Safari 4WD', shortLabel: 'Safari', icon: Truck },
  { mode: 'car', label: 'Road Car', shortLabel: 'Road', icon: Car },
  { mode: 'camper', label: 'Camper Van', shortLabel: 'Camper', icon: Caravan },
  { mode: 'motorcycle', label: 'Motorcycle', shortLabel: 'Moto', icon: Bike },
  { mode: 'train', label: 'Train', shortLabel: 'Train', icon: TrainFront },
  { mode: 'boat', label: 'Ship / Boat', shortLabel: 'Boat', icon: Sailboat },
  { mode: 'hike', label: 'Trek / Hike', shortLabel: 'Trek', icon: Footprints },
  { mode: 'bicycle', label: 'Bicycle', shortLabel: 'Bike', icon: Bike },
];

const PRESET_COLORS = [
  '#F59E0B', // Amber Gold
  '#0E6466', // Savannah Teal
  '#DC2626', // Crimson Red
  '#2563EB', // Sky Blue
  '#16A34A', // Forest Green
  '#7C3AED', // Royal Violet
  '#0F172A', // Obsidian Black
  '#FFFFFF', // Alpine White
];

export const Sidebar: React.FC<SidebarProps> = ({
  homeBase,
  legs,
  currentLegIndex,
  isAddingLeg,
  onSetIsAddingLeg,
  onUpdateHomeBase,
  onUpdateLeg,
  onAddLeg,
  onRemoveLeg,
  onSelectLeg,
  onStartDrawingTrek,
  isDrawingTrekForLegIndex,
  onStartPickingLocation,
  isPickingLocation,
  exportDims,
  zoomOutBias,
  onPreviewLeg,
}) => {
  const setIsAddingLeg = onSetIsAddingLeg;
  const destInputRef = useRef<HTMLInputElement>(null);

  const [isHomeSearchOpen, setIsHomeSearchOpen] = useState(false);
  const [homeQuery, setHomeQuery] = useState('');
  // Search staleness guards: each keystroke fires an async search, so an
  // older, slower response can otherwise overwrite the results of a newer
  // query (the "picked the wrong place" bug).
  const homeSearchSeqRef = useRef(0);
  const destSearchSeqRef = useRef(0);
  const [homeResults, setHomeResults] = useState<Waypoint[]>([]);
  const [isSearchingHome, setIsSearchingHome] = useState(false);

  // Dedicated GPX Importer panel state
  const [showGPXPanel, setShowGPXPanel] = useState(false);
  const [isDraggingGPX, setIsDraggingGPX] = useState(false);
  const [gpxSuccessMessage, setGpxSuccessMessage] = useState<string | null>(null);
  const [gpxErrorMessage, setGpxErrorMessage] = useState<string | null>(null);
  const gpxFileInputRef = useRef<HTMLInputElement>(null);

  // New leg creator state
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<Waypoint[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [newLegMode, setNewLegMode] = useState<TransportMode>('suv');
  const [newLegIconId, setNewLegIconId] = useState<string>('suv-expedition');
  const [newLegVehicleColor, setNewLegVehicleColor] = useState<string>('#0E6466');
  const [newLegTrailColor, setNewLegTrailColor] = useState<string>('#F59E0B');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [iconPickerLegIndex, setIconPickerLegIndex] = useState<number | 'new' | null>(null);

  // Auto-focus destination search input when leg creator opens
  useEffect(() => {
    if (isAddingLeg) {
      const timer = setTimeout(() => {
        destInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isAddingLeg]);

  // Point of departure for the upcoming leg
  const departurePoint = legs.length > 0 ? legs[legs.length - 1].to : homeBase;

  // Curated quick-pick destinations for rapid 1-click addition
  const popularSuggestions = [
    { name: 'Serengeti National Park', lat: -2.3333, lng: 34.8333, country: 'Tanzania' },
    { name: 'Zanzibar Airport (ZNZ)', lat: -6.222, lng: 39.225, country: 'Tanzania', airportCode: 'ZNZ' },
    { name: 'Kilimanjaro Airport (JRO)', lat: -3.429, lng: 37.074, country: 'Tanzania', airportCode: 'JRO' },
    { name: 'Ngorongoro Conservation Area', lat: -3.242, lng: 35.487, country: 'Tanzania' },
    { name: 'Nairobi Airport (NBO)', lat: -1.319, lng: 36.926, country: 'Kenya', airportCode: 'NBO' },
    { name: 'Mombasa Coastal Port', lat: -4.043, lng: 39.668, country: 'Kenya' },
  ];

  // Search home locations (debounced; stale responses are dropped)
  const handleSearchHome = async (query: string) => {
    setHomeQuery(query);
    const seq = ++homeSearchSeqRef.current;
    if (query.trim().length < 2) {
      setHomeResults([]);
      return;
    }
    await new Promise(r => setTimeout(r, 350));
    if (seq !== homeSearchSeqRef.current) return;
    setIsSearchingHome(true);
    const airports = searchAirports(query).map(a => ({
      id: `apt-${a.iata.toLowerCase()}`,
      name: `${a.city} (${a.iata})`,
      lat: a.lat,
      lng: a.lng,
      country: a.country,
      detail: a.name,
      airportCode: a.iata,
    }));
    const places = await searchPlaceOSM(query);
    if (seq !== homeSearchSeqRef.current) return;
    setHomeResults([...airports, ...places]);
    setIsSearchingHome(false);
  };

  // Search leg destination locations (debounced; stale responses are dropped)
  const handleSearchDest = async (query: string) => {
    setDestQuery(query);
    const seq = ++destSearchSeqRef.current;
    if (query.trim().length < 2) {
      setDestResults([]);
      return;
    }
    await new Promise(r => setTimeout(r, 350));
    if (seq !== destSearchSeqRef.current) return;
    setIsSearchingDest(true);
    const airports = searchAirports(query).map(a => ({
      id: `apt-${a.iata.toLowerCase()}`,
      name: `${a.city} (${a.iata})`,
      lat: a.lat,
      lng: a.lng,
      country: a.country,
      airportCode: a.iata,
    }));
    const places = await searchPlaceOSM(query);
    if (seq !== destSearchSeqRef.current) return;
    setDestResults([...airports, ...places]);
    setIsSearchingDest(false);
  };

  // Add a newly confirmed leg
  const handleConfirmNewLeg = async (destination: Waypoint) => {
    setIsCalculatingRoute(true);
    const lastPoint = legs.length > 0 ? legs[legs.length - 1].to : homeBase;

    let path: [number, number][] = [];
    if (newLegMode === 'flight') {
      path = calculateFlightPath(lastPoint, destination);
    } else if (newLegMode === 'boat') {
      path = calculateSeaRoute(lastPoint, destination);
    } else if (newLegMode === 'hike') {
      path = calculateCatmullRomSpline([[lastPoint.lat, lastPoint.lng], [destination.lat, destination.lng]], 0.5, 30);
    } else {
      path = await fetchRoadRoute(lastPoint, destination);
    }

    const fallbackVehicleColor =
      newLegMode === 'flight' ? '#F59E0B' : newLegMode === 'hike' ? '#D97706' : newLegMode === 'boat' ? '#06B6D4' : '#0E6466';

    const newLeg: JourneyLeg = {
      id: `leg-${Date.now()}`,
      from: lastPoint,
      to: destination,
      mode: newLegMode,
      label: `${newLegMode.toUpperCase()} to ${destination.name}`,
      vehicleColor: newLegVehicleColor || fallbackVehicleColor,
      vehicleScale: 1.1,
      showTrail: true,
      trailColor: newLegTrailColor || getDefaultTrailColorForMode(newLegMode),
      durationSeconds: 7,
      pauseAtDestinationSeconds: 2.5,
      cachedPath: path,
      trekConfig: newLegMode === 'hike' ? {
        sourceType: 'auto',
        trailPattern: 'bootprints',
        splineTension: 0.5,
      } : undefined,
      customIconId: newLegIconId,
    };

    onAddLeg(newLeg);
    setIsAddingLeg(false);
    setDestQuery('');
    setDestResults([]);
    setIsCalculatingRoute(false);
  };

  // Process GPX text into a new or updated Trek leg
  const processGPXData = (xmlText: string, filename: string, targetLegIndex?: number) => {
    const parsed: ParsedGPXResult = parseGPX(xmlText);
    if (!parsed.points || parsed.points.length < 2) {
      // Announced via a live region instead of a blocking alert()
      setGpxErrorMessage('The selected GPX file does not contain valid track points (<trkpt> or <rtept>).');
      return;
    }

    const firstPt = parsed.points[0];
    const lastPt = parsed.points[parsed.points.length - 1];
    const path: [number, number][] = parsed.points.map(p => [p[0], p[1]]);

    const startWp: Waypoint = {
      id: `gpx-start-${Date.now()}`,
      name: `${parsed.name} (Start)`,
      lat: firstPt[0],
      lng: firstPt[1],
      elevation: firstPt[2],
    };

    const endWp: Waypoint = {
      id: `gpx-end-${Date.now()}`,
      name: `${parsed.name} (Finish)`,
      lat: lastPt[0],
      lng: lastPt[1],
      elevation: lastPt[2],
    };

    const trekConfig = {
      sourceType: 'gpx' as const,
      gpxFileName: filename,
      rawGpxPoints: parsed.points,
      trailPattern: 'bootprints' as const,
      totalDistanceKm: parsed.totalDistanceKm,
      elevationGainMeters: parsed.elevationGainMeters,
      elevationLossMeters: parsed.elevationLossMeters,
      minElevation: parsed.minElevation,
      maxElevation: parsed.maxElevation,
      pointCount: parsed.pointCount,
      elevationProfile: parsed.elevationProfile,
    };

    if (typeof targetLegIndex === 'number' && targetLegIndex < legs.length) {
      // Update existing leg
      onUpdateLeg(targetLegIndex, {
        cachedPath: path,
        to: endWp,
        label: `${parsed.name} (${parsed.totalDistanceKm} km)`,
        trekConfig,
      });
      onSelectLeg(targetLegIndex);
    } else {
      // Add as a new hiking leg
      const lastPoint = legs.length > 0 ? legs[legs.length - 1].to : startWp;
      const newLeg: JourneyLeg = {
        id: `leg-gpx-${Date.now()}`,
        from: legs.length > 0 ? lastPoint : startWp,
        to: endWp,
        mode: 'hike',
        label: `${parsed.name} (${parsed.totalDistanceKm} km)`,
        vehicleColor: '#D97706',
        vehicleScale: 1.1,
        showTrail: true,
        trailColor: '#D97706',
        durationSeconds: Math.max(6, Math.min(14, Math.round(parsed.totalDistanceKm * 0.8))),
        pauseAtDestinationSeconds: 3,
        cachedPath: path,
        trekConfig,
        customIconId: 'hiker-modern',
      };
      onAddLeg(newLeg);
      onSelectLeg(legs.length);
    }

    setGpxSuccessMessage(`Loaded "${parsed.name}" (${parsed.totalDistanceKm} km · ${parsed.pointCount} GPS points)`);
    setTimeout(() => setGpxSuccessMessage(null), 4000);
    setShowGPXPanel(false);
  };

  // Upload GPX from file input
  const handleGPXFileInput = (e: React.ChangeEvent<HTMLInputElement>, targetLegIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const xml = event.target?.result as string;
      if (xml) {
        processGPXData(xml, file.name, targetLegIndex);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Drop GPX file
  const handleGPXDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingGPX(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.gpx') || file.type.includes('xml') || file.type === '')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const xml = event.target?.result as string;
        if (xml) {
          processGPXData(xml, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  // Load a built-in sample GPX
  const handleLoadSampleGPX = (sample: SampleGPXTrack) => {
    processGPXData(sample.xml, `${sample.title}.gpx`);
  };

  // Recalculate route when mode changes
  const handleChangeMode = async (index: number, mode: TransportMode) => {
    const leg = legs[index];
    let newPath = leg.cachedPath;
    if (mode === 'flight') {
      newPath = calculateFlightPath(leg.from, leg.to);
    } else if (mode === 'boat') {
      newPath = calculateSeaRoute(leg.from, leg.to);
    } else if (mode === 'hike') {
      if (!leg.trekConfig || leg.trekConfig.sourceType !== 'gpx') {
        newPath = calculateCatmullRomSpline([[leg.from.lat, leg.from.lng], [leg.to.lat, leg.to.lng]], 0.5, 30);
      }
    } else {
      newPath = await fetchRoadRoute(leg.from, leg.to);
    }

    onUpdateLeg(index, {
      mode,
      cachedPath: newPath,
      label: `${mode.toUpperCase()} to ${leg.to.name}`,
      customIconId: getDefaultIconIdForMode(mode),
    });
  };

  return (
    <aside className="w-[340px] h-[calc(100vh-52px)] bg-app border-r border-hairline2 flex flex-col shrink-0 overflow-hidden z-10">
      {/* Header Info Banner matching safari ticket design */}
      <div className="p-3 border-b border-hairline2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink2">Itinerary</span>
          <span className="text-xs font-semibold text-ink2 font-mono-numbers">
            {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
          </span>
        </div>

        {/* Home Base Card */}
        <div className="bg-surface border border-hairline rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink leading-tight truncate max-w-[190px]">
                  {homeBase.name}
                </p>
                <p className="text-[10px] text-ink3">Home base</p>
              </div>
            </div>

            <button
              onClick={() => setIsHomeSearchOpen(!isHomeSearchOpen)}
              className="text-xs font-semibold text-accent hover:underline"
            >
              {isHomeSearchOpen ? 'Close' : 'Change'}
            </button>
          </div>

          {/* Home Base Change Search Dropdown */}
          {isHomeSearchOpen && (
            <div className="mt-3 pt-3 border-t border-hairline2">
              <div className="relative">
                <Search className="w-4 h-4 text-ink3 absolute left-3 top-2.5" />
                <input
                  type="text"
                  aria-label="Search for a new home base (city or airport code)"
                  placeholder="Search city, airport code (e.g. JRO, JFK)..."
                  value={homeQuery}
                  onChange={(e) => handleSearchHome(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-well border border-hairline rounded-lg"
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => onStartPickingLocation('home')}
                  className={`text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    isPickingLocation === 'home'
                      ? 'bg-accent text-white font-bold'
                      : 'text-ink2 bg-well hover:bg-well'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{isPickingLocation === 'home' ? 'Click map now...' : 'Pick on Map'}</span>
                </button>
                {isSearchingHome && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="text-xs text-ink3 animate-pulse"
                  >
                    Searching...
                  </span>
                )}
              </div>

              {homeResults.length > 0 && (
                <div className="mt-2 max-h-36 overflow-y-auto border border-hairline rounded-lg bg-surface shadow-sm divide-y divide-hairline2">
                  {homeResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onUpdateHomeBase(result);
                        setIsHomeSearchOpen(false);
                        setHomeResults([]);
                        setHomeQuery('');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-well text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink truncate block">{result.name}</span>
                        {(result.detail || result.country) && (
                          <span className="text-[10px] text-ink3 truncate block">
                            {[result.detail, result.country].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      {result.airportCode && (
                        <span className="text-xs bg-well text-accent font-mono px-1.5 py-0.5 rounded">
                          {result.airportCode}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Primary Actions: Add Journey Leg & Import GPX */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingLeg(!isAddingLeg)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-colors ${
              isAddingLeg ? 'text-ink bg-well hover:bg-hairline2' : 'text-white bg-accent hover:bg-accent-strong'
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform ${isAddingLeg ? 'rotate-45' : ''}`} />
            <span>{isAddingLeg ? 'Close Leg Builder' : 'Add Journey Leg'}</span>
          </button>

          <button
            onClick={() => setShowGPXPanel(!showGPXPanel)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-medium transition-colors ${
              showGPXPanel ? 'bg-well text-ink' : 'text-ink2 bg-well hover:bg-hairline2 hover:text-ink'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>GPX Track</span>
          </button>
        </div>

        {/* Success toast after GPX parsed (announced via live region) */}
        {gpxSuccessMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate font-medium">{gpxSuccessMessage}</span>
          </div>
        )}

        {/* GPX parse error (announced immediately via live region) */}
        {gpxErrorMessage && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-xs flex items-start gap-2 animate-in fade-in"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium flex-1">{gpxErrorMessage}</span>
            <button
              type="button"
              onClick={() => setGpxErrorMessage(null)}
              aria-label="Dismiss error"
              className="text-red-400 hover:text-red-700 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expandable GPX Importer & Parser Drawer */}
        {showGPXPanel && (
          <div className="bg-surface border border-accent/30 rounded-lg p-3 shadow-md space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-amber-500" />
                <span>GPX Hiking Track Parser</span>
              </span>
              <button
                onClick={() => setShowGPXPanel(false)}
                className="text-ink3 hover:text-ink text-xs"
              >
                Close
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingGPX(true);
              }}
              onDragLeave={() => setIsDraggingGPX(false)}
              onDrop={handleGPXDrop}
              onClick={() => gpxFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                isDraggingGPX
                  ? 'border-accent bg-accent/10 scale-[1.01]'
                  : 'border-hairline hover:border-accent bg-well hover:bg-surface'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-1.5 text-accent" />
              <p className="text-xs font-bold text-ink">
                Drop your .GPX file here or click to browse
              </p>
              <p className="text-[11px] text-ink2 mt-0.5">
                Supports Garmin, Strava, AllTrails, Apple Watch & handheld GPS files
              </p>
              <input
                ref={gpxFileInputRef}
                type="file"
                accept=".gpx"
                onChange={(e) => handleGPXFileInput(e)}
                className="hidden"
              />
            </button>

            {/* Or load sample GPX */}
            <div>
              <p className="text-xs font-bold text-ink3 mb-1.5">
                Or Try Sample Expedition Tracks:
              </p>
              <div className="space-y-1.5">
                {SAMPLE_GPX_TRACKS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSampleGPX(sample)}
                    className="w-full text-left p-2 rounded-lg bg-well hover:bg-accent/5 border border-hairline hover:border-accent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-semibold text-ink group-hover:text-accent block">
                        {sample.title}
                      </span>
                      <span className="text-xs text-ink2">{sample.location}</span>
                    </div>
                    <span className="text-xs font-bold text-accent bg-surface px-2 py-0.5 rounded border border-hairline">
                      Load
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legs List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* NEW EXPEDITION LEG BUILDER (Shown prominently at top when isAddingLeg is true) */}
        {isAddingLeg && (
          <div className="bg-surface border-2 border-accent rounded-lg p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 ring-2 ring-accent/20">
            <div className="flex items-center justify-between pb-2 border-b border-hairline2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-xs">
                  +
                </span>
                <div>
                  <span className="text-xs font-bold text-accent block">
                    New Expedition Leg 0{legs.length + 1}
                  </span>
                  <span className="text-xs text-ink2">
                    Departing from: <strong className="text-ink">{departurePoint.name.split('(')[0]}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddingLeg(false)}
                className="text-xs font-semibold text-ink3 hover:text-ink px-2 py-1 rounded-lg hover:bg-well transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Transport Mode Selection */}
            <div>
              <p className="text-xs font-bold text-ink2 mb-1.5">
                Mode of Transport
              </p>
              <div className="grid grid-cols-5 gap-1 p-1 bg-well rounded-lg mb-1.5">
                {TRANSPORT_MODES.slice(0, 5).map(({ mode, icon: Icon, label, shortLabel }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setNewLegMode(mode);
                      setNewLegIconId(getDefaultIconIdForMode(mode));
                    }}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-[7px] transition-colors ${
                      newLegMode === mode
                        ? 'bg-accent text-white'
                        : 'text-ink2 hover:text-ink hover:bg-hairline2/40'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] mb-0.5" strokeWidth={1.9} />
                    <span className="text-[10px] leading-none font-medium">{shortLabel}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-well rounded-lg mb-2">
                {TRANSPORT_MODES.slice(5).map(({ mode, icon: Icon, label, shortLabel }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setNewLegMode(mode);
                      setNewLegIconId(getDefaultIconIdForMode(mode));
                    }}
                    className={`flex flex-col items-center justify-center py-1 rounded-[7px] transition-colors ${
                      newLegMode === mode
                        ? 'bg-accent text-white'
                        : 'text-ink2 hover:text-ink hover:bg-hairline2/40'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] mb-0.5" strokeWidth={1.9} />
                    <span className="text-[10px] leading-none font-medium">{shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Active Vehicle & Trail Style for this new leg */}
              {(() => {
                const iconDef = getIconDefinition(newLegIconId, newLegMode);
                return (
                  <div className="p-2 rounded-md bg-well space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0">
                          {iconDef.renderSvg({ size: 24, color: newLegVehicleColor, className: 'w-6 h-6' })}
                        </div>
                        <div className="text-left min-w-0">
                          <span className="text-[13px] font-medium text-ink block leading-tight truncate">
                            {iconDef.name} <span className="text-[10px] text-ink3 font-normal">· {iconDef.badge}</span>
                          </span>
                          <span className="text-[11px] text-ink3 truncate block">Custom map icon</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIconPickerLegIndex('new')}
                        className="text-xs font-semibold text-accent hover:underline whitespace-nowrap shrink-0"
                      >
                        Change
                      </button>
                    </div>

                    {/* Quick Trail Color for new leg */}
                    <div className="pt-1.5 border-t border-hairline/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Route className="w-3 h-3 text-accent" />
                        <span className="text-xs font-bold text-ink2">Trail:</span>
                        <div className="flex items-center gap-1">
                          {TRAIL_COLOR_PRESETS.slice(0, 5).map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setNewLegTrailColor(p.hex)}
                              style={{ backgroundColor: p.hex }}
                              title={p.name}
                              className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                                newLegTrailColor === p.hex ? 'scale-125 border-ink ring-1 ring-accent/40' : 'border-hairline'
                              }`}
                            />
                          ))}
                          <label className="relative w-6 h-6 rounded-full border border-hairline flex items-center justify-center cursor-pointer overflow-hidden bg-gradient-to-tr from-cyan-400 via-amber-400 to-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2" title="Custom Trail Color">
                            <input
                              type="color"
                              value={newLegTrailColor}
                              aria-label="Custom trail color for new leg"
                              onChange={(e) => setNewLegTrailColor(e.target.value)}
                              className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                            />
                          </label>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-ink3">{newLegTrailColor}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Destination Search Box */}
            <div>
              <p className="text-xs font-bold text-ink2 mb-1.5">
                Destination Point
              </p>
              <div className="relative">
                <Search className="w-4 h-4 text-ink3 absolute left-3 top-2.5" />
                <input
                  ref={destInputRef}
                  type="text"
                  aria-label="Search destination point"
                  placeholder="Type city, national park, airport (e.g. Serengeti, ZNZ)..."
                  value={destQuery}
                  onChange={(e) => handleSearchDest(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-well border border-hairline rounded-lg focus:bg-surface transition-all font-medium"
                />
              </div>
            </div>

            {/* Quick 1-Click Suggestion Chips */}
            <div>
              <span className="text-xs text-ink3 block mb-1">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {popularSuggestions.map((sug) => (
                  <button
                    key={sug.name}
                    onClick={() =>
                      handleConfirmNewLeg({
                        id: `sug-${Date.now()}-${sug.name.slice(0, 3)}`,
                        name: sug.name,
                        lat: sug.lat,
                        lng: sug.lng,
                        country: sug.country,
                        airportCode: sug.airportCode,
                      })
                    }
                    className="text-xs bg-well hover:bg-accent/10 hover:text-accent text-ink px-2 py-1 rounded-lg border border-hairline transition-colors font-medium"
                  >
                    + {sug.name.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Or Click to Pick on Map */}
            <button
              onClick={() => onStartPickingLocation(legs.length)}
              className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isPickingLocation === legs.length
                  ? 'bg-accent text-white animate-pulse'
                  : 'bg-well hover:bg-accent/10 text-ink hover:text-accent border border-hairline'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>
                {isPickingLocation === legs.length ? 'Click location on map...' : 'Or Pick Destination on Map'}
              </span>
            </button>

            {isSearchingDest && (
              <p role="status" aria-live="polite" className="text-[11px] text-ink3 animate-pulse text-center">
                Searching airports & OpenStreetMap...
              </p>
            )}

            {isCalculatingRoute && (
              <p role="status" aria-live="polite" className="text-[11px] text-accent font-semibold animate-pulse text-center">
                Calculating authentic route path...
              </p>
            )}

            {/* Search results dropdown */}
            {destResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-hairline rounded-lg bg-surface divide-y divide-hairline2 shadow-sm">
                {destResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleConfirmNewLeg(result)}
                    className="w-full text-left px-3 py-2 hover:bg-well text-xs flex items-center justify-between group transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-ink block truncate">{result.name}</span>
                      <span className="text-xs text-ink3 truncate block">
                        {[result.detail, result.country].filter(Boolean).join(' · ') || result.lat.toFixed(2) + '°, ' + result.lng.toFixed(2) + '°'}
                      </span>
                    </div>
                    {result.airportCode && (
                      <span className="text-xs bg-well text-accent font-mono px-1.5 py-0.5 rounded">
                        {result.airportCode}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state when journey has 0 legs */}
        {legs.length === 0 && !isAddingLeg && (
          <div className="bg-well border border-dashed border-hairline rounded-lg p-6 text-center space-y-3 animate-in fade-in">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Your Journey is Empty</p>
              <p className="text-[11px] text-ink2 mt-0.5">
                Add your first destination or import a GPX hiking track above to start animating.
              </p>
            </div>
            <button
              onClick={() => setIsAddingLeg(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold shadow-xs hover:bg-accent-strong transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Leg</span>
            </button>
          </div>
        )}

        {legs.map((leg, index) => {
          const isSelected = currentLegIndex === index;
          const isTrekMode = leg.mode === 'hike';
          const isDrawingThis = isDrawingTrekForLegIndex === index;
          const trekStats = leg.trekConfig;
          // Exact zoom level the video will use for this leg's transit —
          // shown next to the slider and previewed on the live map.
          const legBias = leg.zoomBias || 0;
          const exportZoom =
            exportDims != null
              ? transitZoomFor(leg, exportDims.width, exportDims.height, legBias || (zoomOutBias ?? 0), 0, 256)
              : null;

          return (
            <div
              key={leg.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onSelectLeg(index)}
              onKeyDown={(e) => {
                // Whole-card trigger: the card contains nested controls, so it
                // can't be a native <button> — give it identical keyboard semantics.
                if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                  e.preventDefault();
                  onSelectLeg(index);
                }
              }}
              className={`bg-surface border transition-all cursor-pointer ${
                isSelected
                  ? 'border-hairline ring-2 ring-accent/50 rounded-lg p-3 space-y-2.5'
                  : 'border-transparent hover:bg-hairline2/40 rounded-md px-3 py-2'
              }`}
            >
              {/* Leg row (always visible) */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold font-mono-numbers shrink-0 ${
                    isSelected ? 'bg-accent text-white' : 'bg-well text-ink2'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink truncate leading-tight">
                    {leg.to.name.split('(')[0]}
                  </p>
                  <p className="text-[10px] text-ink3 truncate font-mono-numbers">
                    {leg.from.name.split('(')[0].trimEnd()} · {leg.durationSeconds}s
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLeg(index);
                  }}
                  title="Remove this leg"
                  aria-label={`Remove leg ${index + 1}`}
                  className="p-1 text-ink3 hover:text-danger rounded-md hover:bg-danger/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {isSelected && (
              <>
              {/* Transport Mode Selector Tabs */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-well rounded-md mb-2">
                {TRANSPORT_MODES.slice(0, 5).map(({ mode, icon: Icon, label, shortLabel }) => (
                  <button
                    key={mode}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeMode(index, mode);
                    }}
                    title={label}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-[7px] transition-colors ${
                      leg.mode === mode
                        ? 'bg-accent text-white'
                        : 'text-ink2 hover:text-ink hover:bg-hairline2/40'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] mb-0.5" strokeWidth={1.9} />
                    <span className="text-[10px] leading-none font-medium">{shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Second row of transport modes */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-well rounded-lg mb-3">
                {TRANSPORT_MODES.slice(5).map(({ mode, icon: Icon, label, shortLabel }) => (
                  <button
                    key={mode}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeMode(index, mode);
                    }}
                    title={label}
                    className={`flex flex-col items-center justify-center py-1 rounded-[7px] transition-colors ${
                      leg.mode === mode
                        ? 'bg-accent text-white'
                        : 'text-ink2 hover:text-ink hover:bg-hairline2/40'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] mb-0.5" strokeWidth={1.9} />
                    <span className="text-[10px] leading-none font-medium">{shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Modern Vehicle / Traveler Icon Selector */}
              {(() => {
                const iconDef = getIconDefinition(leg.customIconId, leg.mode);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIconPickerLegIndex(index);
                    }}
                    className="w-full text-left mb-2 p-1.5 pr-2.5 rounded-md bg-well hover:bg-hairline2/50 transition-colors flex items-center justify-between cursor-pointer group"
                    title="Change vehicle or traveler icon"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${leg.mode === 'hike' ? '' : 'drop-shadow-sm'}`}>
                        {iconDef.renderSvg({
                          size: 24,
                          color: leg.vehicleColor,
                          className: 'w-6 h-6',
                        })}
                      </div>
                      <div className="text-left min-w-0">
                        <span className="text-[13px] font-medium text-ink group-hover:text-accent leading-tight truncate block">
                          {iconDef.name} <span className="text-[10px] text-ink3 font-normal">· {iconDef.badge}</span>
                        </span>
                        <span className="text-[11px] text-ink3 block truncate max-w-[200px]">
                          {iconDef.tagline}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-ink3 group-hover:text-ink shrink-0" />
                  </button>
                );
              })()}

              {/* Specific Trek / Hike Mode Details & GPX Telemetry */}
              {isTrekMode && (
                <div className="bg-well border border-hairline rounded-lg p-3 mb-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-ink flex items-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5 text-amber-500" />
                      <span>Wilderness Hiking Track</span>
                    </p>
                    {trekStats?.sourceType === 'gpx' && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 font-semibold px-1.5 py-0.5 rounded font-mono-numbers">
                        GPX Track
                      </span>
                    )}
                  </div>

                  {/* GPX Telemetry Badges if available */}
                  {trekStats && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                      {trekStats.totalDistanceKm !== undefined && (
                        <div className="bg-surface/90 p-1.5 rounded-lg border border-hairline">
                          <span className="text-ink3 block text-xs font-semibold">Distance</span>
                          <span className="font-bold text-ink font-mono-numbers">
                            {trekStats.totalDistanceKm} km
                          </span>
                        </div>
                      )}
                      {trekStats.elevationGainMeters !== undefined && trekStats.elevationGainMeters > 0 && (
                        <div className="bg-surface/90 p-1.5 rounded-lg border border-hairline">
                          <span className="text-ink3 block text-xs font-semibold">Elev Gain</span>
                          <span className="font-bold text-accent font-mono-numbers">
                            +{trekStats.elevationGainMeters}m
                          </span>
                        </div>
                      )}
                      {trekStats.minElevation !== undefined && trekStats.maxElevation !== undefined && (
                        <div className="bg-surface/90 p-1.5 rounded-lg border border-hairline col-span-2 flex justify-between items-center">
                          <span className="text-ink3 text-xs">Altitude Range:</span>
                          <span className="font-semibold text-ink font-mono-numbers">
                            {trekStats.minElevation}m → {trekStats.maxElevation}m
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Elevation Profile Sparkline */}
                  {trekStats?.elevationProfile && trekStats.elevationProfile.length > 2 && (
                    <ElevationProfileSparkline profile={trekStats.elevationProfile} />
                  )}

                  {/* Action buttons for GPX upload or interactive terrain drawing */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-surface border border-hairline hover:border-accent rounded-lg text-[11px] font-semibold text-ink cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3 h-3 text-accent" />
                      <span>{trekStats?.gpxFileName ? 'Replace GPX' : 'Upload GPX'}</span>
                      <input
                        type="file"
                        accept=".gpx"
                        onChange={(e) => handleGPXFileInput(e, index)}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDrawingTrek(index);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs ${
                        isDrawingThis
                          ? 'bg-accent text-white font-bold ring-2 ring-accent/50'
                          : 'bg-surface border border-hairline text-ink hover:border-accent'
                      }`}
                    >
                      <Crosshair className="w-3 h-3 text-accent" />
                      <span>{isDrawingThis ? 'Click on Map...' : 'Draw on Map'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Route Trail & Vehicle Styling Section */}
              <div className="pt-2.5 border-t border-hairline/70 space-y-2.5 text-xs">
                {/* 1. Trail Line Color & Style Controls */}
                <div className="bg-well p-2.5 rounded-lg border border-hairline space-y-1.5">
                  <div className="flex items-center justify-between whitespace-nowrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-ink shrink-0">Trail</span>
                      <span
                        className="w-3 h-3 rounded-full border border-hairline inline-block shrink-0"
                        style={{ backgroundColor: leg.trailColor || '#F59E0B' }}
                      />
                      <span className="font-mono-numbers text-[10px] text-ink3 truncate">
                        {leg.mode === 'flight' ? 'Flight arc' : leg.mode === 'hike' ? 'Trek dots' : 'Road'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateLeg(index, { trailColor: leg.vehicleColor });
                        }}
                        className="text-[11px] font-medium text-accent hover:underline whitespace-nowrap"
                        title="Match trail color with vehicle accent"
                      >
                        Match
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateLeg(index, { showTrail: leg.showTrail === false ? true : false });
                        }}
                        aria-pressed={leg.showTrail !== false}
                        className={`p-1 rounded-[5px] transition-colors ${
                          leg.showTrail !== false ? 'text-accent bg-accent/10' : 'text-ink3 hover:bg-hairline2/60'
                        }`}
                        title={leg.showTrail !== false ? 'Hide animated trail path on map' : 'Show animated trail path on map'}
                      >
                        {leg.showTrail !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Trail Color Swatches + Custom Color Picker */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {TRAIL_COLOR_PRESETS.map((p) => {
                      const isSelected = (leg.trailColor || '#F59E0B').toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateLeg(index, { trailColor: p.hex });
                          }}
                          style={{ backgroundColor: p.hex }}
                          title={`Trail: ${p.name} (${p.hex})`}
                          aria-label={`Trail color ${p.name} (${p.hex})`}
                          className={`w-4 h-4 rounded-full border transition-all ${
                            isSelected
                              ? 'scale-125 border-ink ring-2 ring-accent/40 shadow-xs'
                              : 'border-hairline hover:scale-110'
                          }`}
                        />
                      );
                    })}

                    {/* Custom Hex Color Picker */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-6 h-6 rounded-full border border-hairline flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden bg-gradient-to-tr from-cyan-400 via-amber-400 to-indigo-500 shadow-2xs focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                      title="Custom Trail Hex Color"
                    >
                      <input
                        type="color"
                        value={leg.trailColor || '#F59E0B'}
                        aria-label="Custom trail color"
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateLeg(index, { trailColor: e.target.value });
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>

                  {/* Mini Trail Preview Strip */}
                  <div className="pt-1 flex items-center justify-between text-xs text-ink3 border-t border-hairline/50 mt-1">
                    <span className="font-mono text-xs text-ink2 font-medium">
                      {leg.trailColor || '#F59E0B'}
                    </span>
                    <div className="flex-1 max-w-[130px] mx-2 h-2.5 flex items-center">
                      <svg width="100%" height="8" className="overflow-visible">
                        <line
                          x1="0"
                          y1="4"
                          x2="100%"
                          y2="4"
                          stroke={hexToRgba(leg.trailColor || '#F59E0B', 0.35)}
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <line
                          x1="0"
                          y1="4"
                          x2="100%"
                          y2="4"
                          stroke={leg.trailColor || '#F59E0B'}
                          strokeWidth="2.5"
                          strokeDasharray={leg.mode === 'flight' ? '6 4' : leg.mode === 'hike' ? '3 3' : 'none'}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 2. Vehicle Accent & Animation Duration Row */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  {/* Vehicle Accent Color */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-ink2 whitespace-nowrap">
                      Vehicle color
                    </span>
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.slice(0, 6).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateLeg(index, { vehicleColor: color });
                          }}
                          style={{ backgroundColor: color }}
                          title={`Vehicle: ${color}`}
                          aria-label={`Vehicle color ${color}`}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                            leg.vehicleColor === color ? 'scale-125 border-ink ring-1 ring-ink/30' : 'border-hairline hover:scale-110'
                          }`}
                        />
                      ))}
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-6 h-6 rounded-full border border-hairline flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden bg-gradient-to-tr from-amber-400 via-rose-400 to-teal-500 shadow-2xs focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                        title="Custom Vehicle Color"
                      >
                        <input
                          type="color"
                          value={leg.vehicleColor}
                          aria-label="Custom vehicle color"
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateLeg(index, { vehicleColor: e.target.value });
                          }}
                          className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Duration Slider */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-ink2 whitespace-nowrap font-mono-numbers">
                      {leg.durationSeconds}s
                    </span>
                    <input
                      type="range"
                      aria-label={`Journey duration, leg ${leg.to.name.split('(')[0]}`}
                      min="3"
                      max="18"
                      step="1"
                      value={leg.durationSeconds}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateLeg(index, { durationSeconds: parseFloat(e.target.value) });
                      }}
                      className="w-20 accent-accent h-1"
                    />
                  </div>
                </div>

                {/* 3. Transit Zoom Trim Row */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <span className="text-xs font-semibold text-ink2 whitespace-nowrap">
                    Transit zoom
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        legBias ? 'text-accent' : 'text-ink3'
                      }`}
                    >
                      {exportZoom != null
                        ? `${legBias ? `${legBias > 0 ? '+' : ''}${legBias.toFixed(2)} · ` : 'Auto · '}z${exportZoom.toFixed(1)}`
                        : legBias
                          ? `${legBias > 0 ? '+' : ''}${legBias.toFixed(2)}`
                          : 'Auto'}
                    </span>
                    <input
                      type="range"
                      min={-3}
                      max={3}
                      step={0.25}
                      value={legBias}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateLeg(index, { zoomBias: Number(e.target.value) });
                        onPreviewLeg?.(index);
                      }}
                      aria-label={`Transit zoom adjustment, leg ${index + 1} to ${leg.to.name}; 0 fits the leg's distance automatically`}
                      className="w-20 accent-accent h-1"
                    />
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          );
        })}

        {/* Bottom Quick Add Next Leg Button (when builder is closed) */}
        {!isAddingLeg && (
          <button
            onClick={() => setIsAddingLeg(true)}
            className="w-full py-3.5 border-2 border-dashed border-accent/40 hover:border-accent bg-accent/5 hover:bg-accent/10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-accent transition-all group shadow-2xs"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform text-accent" />
            <span>Add Next Journey Leg</span>
          </button>
        )}
      </div>

      {/* Modern Traveler & Vehicle Icon Picker Dialog */}
      {iconPickerLegIndex !== null && (
        <IconPickerModal
          isOpen={true}
          onClose={() => setIconPickerLegIndex(null)}
          currentIconId={
            iconPickerLegIndex === 'new'
              ? newLegIconId
              : legs[iconPickerLegIndex]?.customIconId
          }
          currentMode={
            iconPickerLegIndex === 'new'
              ? newLegMode
              : legs[iconPickerLegIndex]?.mode || 'suv'
          }
          currentColor={
            iconPickerLegIndex === 'new'
              ? newLegVehicleColor
              : legs[iconPickerLegIndex]?.vehicleColor || '#0E6466'
          }
          currentTrailColor={
            iconPickerLegIndex === 'new'
              ? newLegTrailColor
              : legs[iconPickerLegIndex]?.trailColor || '#F59E0B'
          }
          currentScale={
            iconPickerLegIndex === 'new'
              ? 1.1
              : legs[iconPickerLegIndex]?.vehicleScale || 1.1
          }
          onSelectIcon={(iconId) => {
            if (iconPickerLegIndex === 'new') {
              setNewLegIconId(iconId);
            } else if (typeof iconPickerLegIndex === 'number') {
              onUpdateLeg(iconPickerLegIndex, { customIconId: iconId });
            }
          }}
          onUpdateColor={(color) => {
            if (iconPickerLegIndex === 'new') {
              setNewLegVehicleColor(color);
            } else if (typeof iconPickerLegIndex === 'number') {
              onUpdateLeg(iconPickerLegIndex, { vehicleColor: color });
            }
          }}
          onUpdateTrailColor={(color) => {
            if (iconPickerLegIndex === 'new') {
              setNewLegTrailColor(color);
            } else if (typeof iconPickerLegIndex === 'number') {
              onUpdateLeg(iconPickerLegIndex, { trailColor: color });
            }
          }}
          onUpdateScale={(scale) => {
            if (typeof iconPickerLegIndex === 'number') {
              onUpdateLeg(iconPickerLegIndex, { vehicleScale: scale });
            }
          }}
        />
      )}
    </aside>
  );
};

/**
 * Mini elevation sparkline component
 */
function ElevationProfileSparkline({
  profile,
}: {
  profile: { distanceKm: number; elevationMeters: number }[];
}) {
  if (!profile || profile.length < 2) return null;
  const minEle = Math.min(...profile.map((p) => p.elevationMeters));
  const maxEle = Math.max(...profile.map((p) => p.elevationMeters));
  const span = Math.max(1, maxEle - minEle);
  const width = 280;
  const height = 36;

  const pointsStr = profile
    .map((p, i) => {
      const x = (i / (profile.length - 1)) * width;
      const y = height - ((p.elevationMeters - minEle) / span) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="mt-2 p-2 bg-surface rounded-lg border border-hairline">
      <div className="flex justify-between text-xs text-ink3 font-mono-numbers mb-1">
        <span>Min {minEle}m</span>
        <span className="font-bold text-accent">Elevation Profile</span>
        <span>Max {maxEle}m</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E6466" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0E6466" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${pointsStr} ${width},${height}`} fill="url(#eleGrad)" />
        <polyline
          points={pointsStr}
          fill="none"
          stroke="#0E6466"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
