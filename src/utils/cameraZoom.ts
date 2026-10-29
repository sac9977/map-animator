import { TransportMode, Waypoint } from '../types/travel';

// Camera framing shared by MapViewport (live preview / playback) and the
// video export, so what you see while setting up a leg is exactly what the
// rendered video shows.

// Web-Mercator helpers (same projection the Leaflet map uses, so tiles align
// exactly with route geometry drawn on the export canvas)
export const lngToGlobalPx = (lng: number, worldSize: number) => ((lng + 180) / 360) * worldSize;
export const latToGlobalPx = (lat: number, worldSize: number) => {
  const s = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)));
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize;
};

// Export camera choreography — close-up at starts/stops, smoothstep easing.
// Transit framing is NOT a fixed zoom: it auto-fits each leg's geographic
// span, so hikes stay tight and long flights pull way out.
export const CLOSE_ZOOM_FLIGHT = 9.5;
export const CLOSE_ZOOM_GROUND = 11.5;
// Hike/trek legs cover a short range: the map scale never needs the transit
// pull-back, so the camera holds a tight, steady framing the whole leg.
export const HIKE_ZOOM = 12.0;

export const legSpanWorldPx = (from: Waypoint, to: Waypoint, worldSize: number) =>
  Math.hypot(
    lngToGlobalPx(to.lng, worldSize) - lngToGlobalPx(from.lng, worldSize),
    latToGlobalPx(to.lat, worldSize) - latToGlobalPx(from.lat, worldSize)
  );

// Resolved transit zoom for a leg: pick the zoom that fits the leg's span
// into ~60% of the viewport's short side, trimmed by `bias` (zoom levels;
// negative tightens, positive widens), never tighter than the close-up.
// Hikes hold one steady framing (the trim shifts it) with no pull-back arcs.
export const transitZoomFor = (
  leg: { mode: TransportMode; from: Waypoint; to: Waypoint },
  W: number,
  H: number,
  bias: number,
  closeShift: number,
  worldSize: number
) => {
  const close = Math.max(
    2,
    (leg.mode === 'flight' ? CLOSE_ZOOM_FLIGHT : CLOSE_ZOOM_GROUND) - closeShift
  );
  const span0 = legSpanWorldPx(leg.from, leg.to, worldSize);
  const fit = Math.log2((Math.min(W, H) * 0.6) / Math.max(span0, 1e-6));
  if (leg.mode === 'hike') {
    const over = Math.max(2, Math.min(fit - bias, close));
    return Math.max(2, Math.min(HIKE_ZOOM - closeShift, over + 3) - bias);
  }
  return Math.max(2, Math.min(fit - bias, close));
};
