import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Sun, Compass } from 'lucide-react';
import { JourneyLeg, MapTileStyle, Waypoint } from '../types/travel';
import { drawAnimatedVehicle } from '../utils/vehicleDrawers';
import { calculateBearing, toRad } from '../utils/geoRouting';
import { MapLayer } from './MapLayer';

interface MapViewportProps {
  homeBase: Waypoint;
  legs: JourneyLeg[];
  activeLegIndex: number;
  legProgress: number; // 0 to 1
  currentTimeMs: number;
  autoZoom: boolean;
  fitBoundsTrigger?: number;
  isPickingLocation: 'home' | number | null;
  onLocationPicked: (point: Waypoint) => void;
  isDrawingTrekForLegIndex: number | null;
  onTrekPointAdded: (legIndex: number, point: [number, number]) => void;
  onFinishDrawingTrek: () => void;
  onOpenWeather?: () => void;
}

export const MapViewport: React.FC<MapViewportProps> = ({
  homeBase,
  legs,
  activeLegIndex,
  legProgress,
  currentTimeMs,
  autoZoom,
  fitBoundsTrigger = 0,
  isPickingLocation,
  onLocationPicked,
  isDrawingTrekForLegIndex,
  onTrekPointAdded,
  onFinishDrawingTrek,
  onOpenWeather,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Default to High-Contrast Cinematic Voyager
  const [activeTileStyle, setActiveTileStyle] = useState<MapTileStyle>('cinematic-voyager');

  const isUserInteractingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const drawOverlayRef = useRef<() => void>(() => {});

  // Initialize Leaflet Map with smooth fractional zooming
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = homeBase.lat;
    const initialLng = homeBase.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 8,
      zoomControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
      zoomAnimationThreshold: 8,
      zoomSnap: 0, // Continuous fractional zooming (removes jarring discrete integer snapping)
      zoomDelta: 0.5, // Smooth 0.5 step on zoom buttons
      wheelPxPerZoomLevel: 140, // Controlled, gentle wheel & trackpad response
      wheelDebounceTime: 30,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track user drag so auto-camera doesn't fight manual navigation
    map.on('dragstart', () => {
      isUserInteractingRef.current = true;
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
    });
    map.on('dragend', () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = window.setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1200);
    });

    // Synchronize canvas hardware transform with Leaflet zoom animations
    const handleZoomAnim = (e: L.ZoomAnimEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !mapRef.current) return;
      const currentZoom = mapRef.current.getZoom();
      const scale = mapRef.current.getZoomScale(e.zoom, currentZoom);
      const origin = mapRef.current.latLngToContainerPoint(e.center);

      canvas.style.transformOrigin = `${origin.x}px ${origin.y}px`;
      canvas.style.transition = 'transform 0.25s cubic-bezier(0,0,0.25,1)';
      canvas.style.transform = `scale(${scale})`;
    };

    const handleZoomEnd = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.transition = 'none';
      canvas.style.transform = 'none';
      drawOverlayRef.current();
    };

    map.on('zoomanim', handleZoomAnim);
    map.on('zoomend', handleZoomEnd);
    map.on('move', () => drawOverlayRef.current());
    map.on('resize', () => drawOverlayRef.current());

    mapRef.current = map;
    setMapInstance(map);

    return () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Handle Map Clicks for picking location or drawing trek
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation !== null) {
        onLocationPicked({
          id: `wp-${Date.now()}`,
          name: `Location (${e.latlng.lat.toFixed(2)}°, ${e.latlng.lng.toFixed(2)}°)`,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      } else if (isDrawingTrekForLegIndex !== null) {
        onTrekPointAdded(isDrawingTrekForLegIndex, [e.latlng.lat, e.latlng.lng]);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isPickingLocation, isDrawingTrekForLegIndex, onLocationPicked, onTrekPointAdded]);

  // Fit map viewport smoothly to encapsulate entire journey route
  const fitRouteBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const coords: [number, number][] = [[homeBase.lat, homeBase.lng]];
    legs.forEach((leg) => {
      coords.push([leg.to.lat, leg.to.lng]);
      if (leg.cachedPath && leg.cachedPath.length > 0) {
        const step = Math.max(1, Math.floor(leg.cachedPath.length / 40));
        for (let i = 0; i < leg.cachedPath.length; i += step) {
          coords.push(leg.cachedPath[i]);
        }
      }
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => L.latLng(c[0], c[1])));
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [homeBase, legs]);

  // Fit bounds when requested
  useEffect(() => {
    if (fitBoundsTrigger > 0) {
      fitRouteBounds();
    }
  }, [fitBoundsTrigger, fitRouteBounds]);

  // Butter-Smooth Cinematic Camera Choreography & Auto-Zoom
  // Smoothly glides vehicle position and fractional zoom at 60fps without jarring step jumps
  useEffect(() => {
    if (!autoZoom || !mapRef.current || legs.length === 0 || isUserInteractingRef.current) return;
    const currentLeg = legs[activeLegIndex];
    if (!currentLeg || !currentLeg.cachedPath || currentLeg.cachedPath.length === 0) return;

    const path = currentLeg.cachedPath;
    const floatIdx = legProgress * (path.length - 1);
    const idxLow = Math.floor(floatIdx);
    const idxHigh = Math.min(path.length - 1, idxLow + 1);
    const fraction = floatIdx - idxLow;

    const p1 = path[idxLow];
    const p2 = path[idxHigh];

    // Smooth sub-pixel interpolated coordinate exactly tracking the vehicle
    const currentLat = p1[0] + (p2[0] - p1[0]) * fraction;
    const currentLng = p1[1] + (p2[1] - p1[1]) * fraction;

    // Smooth continuous target zoom with cubic smoothstep curve
    const isFlight = currentLeg.mode === 'flight';
    const closeZoom = isFlight ? 9.5 : 12.8;
    const overviewZoom = isFlight ? 5.5 : 8.2;

    let targetZoom = overviewZoom;
    if (legProgress < 0.22) {
      // Departure: smoothly pull back with smoothstep easing
      const t = legProgress / 0.22;
      const ease = t * t * (3 - 2 * t);
      targetZoom = closeZoom - ease * (closeZoom - overviewZoom);
    } else if (legProgress > 0.78) {
      // Arrival: smoothly glide in with smoothstep easing
      const t = (legProgress - 0.78) / 0.22;
      const ease = t * t * (3 - 2 * t);
      targetZoom = overviewZoom + ease * (closeZoom - overviewZoom);
    }

    // Direct 60fps frame positioning with no conflicting CSS transition aborts
    mapRef.current.setView([currentLat, currentLng], targetZoom, { animate: false });
  }, [activeLegIndex, legProgress, autoZoom, legs]);

  // Synchronize Canvas with Leaflet Map
  const drawOverlay = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.x, size.y);

    // 1. Draw Home Base Pin
    const homePx = map.latLngToContainerPoint([homeBase.lat, homeBase.lng]);
    drawWaypointMarker(ctx, homePx.x, homePx.y, homeBase.name, '#0E6466', true);

    // 2. Draw All Legs (Past legs solid, active leg animating up to progress, future legs faint)
    legs.forEach((leg, idx) => {
      if (!leg.cachedPath || leg.cachedPath.length < 2) return;

      const isPast = idx < activeLegIndex;
      const isActive = idx === activeLegIndex;
      const isFuture = idx > activeLegIndex;

      // Draw route line
      ctx.save();
      const points = leg.cachedPath.map(coord => map.latLngToContainerPoint(coord));

      if (leg.mode === 'flight') {
        // Flight Great-Circle Arc styling
        ctx.strokeStyle = isPast
          ? 'rgba(56, 189, 248, 0.45)'
          : isActive
          ? 'rgba(56, 189, 248, 0.95)'
          : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 6]);
      } else if (leg.mode === 'hike') {
        // Dotted Safari / Mountain Trek styling (matching user design cue)
        ctx.strokeStyle = isPast
          ? 'rgba(217, 119, 6, 0.5)'
          : isActive
          ? '#F59E0B'
          : 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 6]);
      } else {
        // Road / Sea styling
        ctx.strokeStyle = isPast
          ? 'rgba(14, 100, 102, 0.5)'
          : isActive
          ? leg.trailColor
          : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 4.5;
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      const count = isActive
        ? Math.max(2, Math.floor(points.length * legProgress))
        : isPast
        ? points.length
        : points.length;

      points.slice(0, count).forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();

      // Destination Pin
      const destPx = map.latLngToContainerPoint([leg.to.lat, leg.to.lng]);
      drawWaypointMarker(ctx, destPx.x, destPx.y, leg.to.name, leg.vehicleColor, false, idx + 1);
    });

    // 3. Draw Active Animated Vehicle
    if (legs.length > 0 && activeLegIndex < legs.length) {
      const activeLeg = legs[activeLegIndex];
      const path = activeLeg.cachedPath;
      if (path && path.length >= 2) {
        const floatIdx = legProgress * (path.length - 1);
        const idxLow = Math.floor(floatIdx);
        const idxHigh = Math.min(path.length - 1, idxLow + 1);
        const fraction = floatIdx - idxLow;

        const p1 = path[idxLow];
        const p2 = path[idxHigh];

        // Interpolated coordinate
        const currentLat = p1[0] + (p2[0] - p1[0]) * fraction;
        const currentLng = p1[1] + (p2[1] - p1[1]) * fraction;
        const currentPx = map.latLngToContainerPoint([currentLat, currentLng]);

        // Calculate heading bearing
        const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
        const angleRad = toRad(bearing - 90); // Canvas 0 rad is along positive X-axis

        // Flight altitude parabolic curve
        let altitudeRatio = 0;
        if (activeLeg.mode === 'flight') {
          altitudeRatio = Math.sin(legProgress * Math.PI);
        }

        drawAnimatedVehicle({
          ctx,
          x: currentPx.x,
          y: currentPx.y,
          angleRad,
          mode: activeLeg.mode,
          color: activeLeg.vehicleColor,
          scale: activeLeg.vehicleScale,
          altitudeRatio,
          timeMs: currentTimeMs,
          showTrail: activeLeg.showTrail,
          trailColor: activeLeg.trailColor,
        });
      }
    }

    ctx.restore();
  }, [homeBase, legs, activeLegIndex, legProgress, currentTimeMs]);

  // Keep drawOverlayRef updated for Leaflet event handlers
  useEffect(() => {
    drawOverlayRef.current = drawOverlay;
  });

  // Re-render canvas overlay whenever playback, progress, or route changes
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  return (
    <div className="relative flex-1 h-[calc(100vh-64px)] overflow-hidden bg-[#E2DBD0]">
      {/* Leaflet Map DOM Node */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* High-Contrast Cinematic Voyager MapLayer Swapper */}
      <MapLayer
        map={mapInstance}
        activeStyle={activeTileStyle}
        onStyleChange={setActiveTileStyle}
      />

      {/* Atmospheric Bone & Teal Color Tint Overlay for Cinematic Voyager */}
      {activeTileStyle === 'cinematic-voyager' && (
        <div className="leaflet-cinematic-overlay-tint" />
      )}

      {/* Transparent Canvas Animation Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Floating Safari Weather Card */}
      <button
        onClick={onOpenWeather}
        type="button"
        title="Open Journey Weather & Climate Analysis"
        className="absolute top-4 right-4 z-20 bg-white/95 hover:bg-white backdrop-blur-md border border-[#E6E1D7] hover:border-[#0E6466]/40 rounded-2xl p-3 shadow-lg flex items-center gap-3 transition-all hover:shadow-xl active:scale-95 text-left group cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#F59E0B] group-hover:scale-105 transition-transform">
          <Sun className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-stone-900 font-mono-numbers">27°</span>
            <span className="text-xs font-semibold text-stone-500">Sunny</span>
            <span className="text-[10px] text-[#0E6466] font-bold bg-[#0E6466]/10 px-1.5 py-0.5 rounded-md ml-1 opacity-80 group-hover:opacity-100">
              Climate
            </span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium">Voyager Imagery · Click for Historical Data</p>
        </div>
      </button>

      {/* Banner when user is drawing a wilderness trek or picking a location */}
      {(isDrawingTrekForLegIndex !== null || isPickingLocation !== null) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#0E6466] text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <Compass className="w-4 h-4 text-[#F59E0B] animate-spin" />
          <span className="text-xs font-semibold">
            {isDrawingTrekForLegIndex !== null
              ? 'Click anywhere on terrain to place trek waypoints. Click Done when finished.'
              : 'Click on the map to set location coordinates.'}
          </span>
          {isDrawingTrekForLegIndex !== null && (
            <button
              onClick={onFinishDrawingTrek}
              className="px-3 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-stone-900 text-xs font-bold rounded-lg shadow-sm"
            >
              Done Drawing
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Draw custom tactile waypoint pin
 */
function drawWaypointMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  isHome: boolean,
  legIndex?: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Soft pin shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer pin circle
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, -10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Pin inner accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();

  // Label banner with warm bone background
  ctx.fillStyle = 'rgba(250, 248, 245, 0.95)';
  ctx.strokeStyle = '#E2DBD0';
  ctx.lineWidth = 1;
  const shortName = label.split('(')[0].trim();
  const textWidth = ctx.measureText(shortName).width;
  ctx.beginPath();
  ctx.roundRect(-textWidth / 2 - 6, 8, textWidth + 12, 18, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shortName, 0, 17);

  ctx.restore();
}
