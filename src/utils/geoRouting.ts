import { Waypoint } from '../types/travel';

/**
 * Degrees to Radians
 */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Radians to Degrees
 */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Great-circle distance between two points in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bearing from point 1 to point 2 in degrees (0 = North, 90 = East)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/**
 * Great-circle intermediate point calculation (geodesic slerp)
 * Fraction f from 0 to 1
 */
export function calculateIntermediateGeodesicPoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  f: number
): [number, number] {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (δ < 1e-6) {
    return [lat1, lon1];
  }

  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);

  return [toDeg(φ), toDeg(λ)];
}

/**
 * Generates an array of points along a Great Circle geodesic arc with altitude
 */
export function calculateFlightPath(
  from: Waypoint,
  to: Waypoint,
  numSteps = 120
): [number, number][] {
  const path: [number, number][] = [];
  const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng);
  const steps = Math.max(30, Math.min(numSteps, Math.round(distance / 20)));

  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const pt = calculateIntermediateGeodesicPoint(
      from.lat,
      from.lng,
      to.lat,
      to.lng,
      f
    );
    path.push(pt);
  }

  return path;
}

/**
 * Fetch road route using OpenStreetMap OSRM routing engine
 */
export async function fetchRoadRoute(
  from: Waypoint,
  to: Waypoint
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0] && data.routes[0].geometry) {
        const coords = data.routes[0].geometry.coordinates as [number, number][];
        // GeoJSON is [lng, lat] -> convert to Leaflet [lat, lng]
        return coords.map(([lng, lat]) => [lat, lng]);
      }
    }
  } catch (err) {
    console.warn('OSRM routing request failed or timed out, applying smooth road fallback', err);
  }

  // Graceful fallback: Curved road-like interpolation with natural deviation
  return generateCurvedTerrainPath(from, to, 40);
}

/**
 * Natural Catmull-Rom Spline generator for off-road wilderness hikes and treks
 */
export function calculateCatmullRomSpline(
  points: [number, number][],
  tension = 0.5,
  stepsPerSegment = 16
): [number, number][] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    // Generate gentle intermediate natural waypoints
    const [p0, p1] = points;
    const dist = haversineDistance(p0[0], p0[1], p1[0], p1[1]);
    const numSub = Math.max(8, Math.min(32, Math.round(dist * 2)));
    const res: [number, number][] = [];
    for (let i = 0; i <= numSub; i++) {
      const t = i / numSub;
      // Add subtle mountain switchback lateral curve
      const lateralDeviation = Math.sin(t * Math.PI) * 0.003 * Math.sin(t * Math.PI * 4);
      const lat = p0[0] + (p1[0] - p0[0]) * t + lateralDeviation;
      const lng = p0[1] + (p1[1] - p0[1]) * t + lateralDeviation * 0.7;
      res.push([lat, lng]);
    }
    return res;
  }

  const result: [number, number][] = [];
  const pts = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    for (let j = 0; j < stepsPerSegment; j++) {
      const t = j / stepsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      const lat =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

      const lng =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      result.push([lat, lng]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Generate a curved terrain path with natural contours
 */
export function generateCurvedTerrainPath(
  from: Waypoint,
  to: Waypoint,
  steps = 30
): [number, number][] {
  const result: [number, number][] = [];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  
  // Perpendicular offset for road curve simulation
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const curveFactor = 0.12;
  const ctrlLat = midLat - dLng * curveFactor;
  const ctrlLng = midLng + dLat * curveFactor;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier
    const lat =
      (1 - t) * (1 - t) * from.lat +
      2 * (1 - t) * t * ctrlLat +
      t * t * to.lat;
    const lng =
      (1 - t) * (1 - t) * from.lng +
      2 * (1 - t) * t * ctrlLng +
      t * t * to.lng;
    result.push([lat, lng]);
  }
  return result;
}

/**
 * Maritime routing with obstacle avoidance (steering around continents, capes, islands)
 */
interface MaritimeWaypoint {
  name: string;
  lat: number;
  lng: number;
}

// Major maritime navigation choke points and open sea corridors
const MARITIME_CORRIDORS: MaritimeWaypoint[] = [
  { name: 'Gibraltar West', lat: 35.95, lng: -6.2 },
  { name: 'Gibraltar East', lat: 36.1, lng: -4.5 },
  { name: 'Sicily Channel', lat: 37.3, lng: 11.5 },
  { name: 'Suez North', lat: 31.3, lng: 32.3 },
  { name: 'Suez South', lat: 29.8, lng: 32.55 },
  { name: 'Bab el Mandeb', lat: 12.6, lng: 43.3 },
  { name: 'Arabian Sea Corridor', lat: 14.0, lng: 55.0 },
  { name: 'Malacca North', lat: 5.5, lng: 97.5 },
  { name: 'Singapore Strait', lat: 1.25, lng: 104.0 },
  { name: 'English Channel West', lat: 49.5, lng: -4.5 },
  { name: 'English Channel East', lat: 51.0, lng: 1.5 },
  { name: 'Panama Atlantic', lat: 9.35, lng: -79.9 },
  { name: 'Panama Pacific', lat: 8.9, lng: -79.55 },
  { name: 'Cape of Good Hope South', lat: -34.8, lng: 18.5 },
  { name: 'Zanzibar Channel Mid', lat: -6.0, lng: 39.4 },
  { name: 'Dar es Salaam Port Approach', lat: -6.8, lng: 39.35 },
  { name: 'Mombasa Ocean Corridor', lat: -4.1, lng: 39.8 },
];

export function calculateSeaRoute(
  from: Waypoint,
  to: Waypoint
): [number, number][] {
  // Check if route passes near known corridors or needs coastal steering
  const dist = haversineDistance(from.lat, from.lng, to.lat, to.lng);
  
  // Find intermediate maritime waypoint if needed
  const intermediateWaypoints: MaritimeWaypoint[] = [];

  // If sailing between Indian Ocean / East Africa islands (e.g. Tanzania coast to Zanzibar)
  if (from.lat < 0 && from.lat > -10 && to.lat < 0 && to.lat > -10 && from.lng > 38 && to.lng > 38) {
    // Local island hopping route (e.g. Dar es Salaam / Bagamoyo to Zanzibar / Pemba)
    const midPoint: [number, number] = [
      (from.lat + to.lat) / 2 + 0.05,
      (from.lng + to.lng) / 2 + 0.08,
    ];
    return calculateCatmullRomSpline([[from.lat, from.lng], midPoint, [to.lat, to.lng]], 0.4, 24);
  }

  // Check if corridor insertion is helpful
  for (const corridor of MARITIME_CORRIDORS) {
    const dFrom = haversineDistance(from.lat, from.lng, corridor.lat, corridor.lng);
    const dTo = haversineDistance(to.lat, to.lng, corridor.lat, corridor.lng);
    if (dFrom + dTo < dist * 1.35 && dFrom > 80 && dTo > 80) {
      intermediateWaypoints.push(corridor);
    }
  }

  if (intermediateWaypoints.length > 0) {
    const allPts: [number, number][] = [
      [from.lat, from.lng],
      ...intermediateWaypoints.map(w => [w.lat, w.lng] as [number, number]),
      [to.lat, to.lng],
    ];
    return calculateCatmullRomSpline(allPts, 0.4, 30);
  }

  // Open water route with curved ocean swell path
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  // Gentle sea curve
  const curve = Math.min(0.15, 20 / (dist + 50));
  const oceanCtrl: [number, number] = [
    midLat - dLng * curve,
    midLng + dLat * curve,
  ];

  return calculateCatmullRomSpline([[from.lat, from.lng], oceanCtrl, [to.lat, to.lng]], 0.5, 30);
}

export interface ParsedGPXResult {
  points: [number, number, number?][];
  name: string;
  totalDistanceKm: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  minElevation?: number;
  maxElevation?: number;
  pointCount: number;
  waypoints: { name: string; lat: number; lng: number; elevation?: number }[];
  elevationProfile: { distanceKm: number; elevationMeters: number }[];
}

/**
 * Robust GPX XML Parser
 * Handles tracks (<trkpt>), routes (<rtept>), and waypoints (<wpt>)
 */
export function parseGPX(xmlText: string): ParsedGPXResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Track name
  const trkName =
    xmlDoc.querySelector('trk > name')?.textContent ||
    xmlDoc.querySelector('name')?.textContent ||
    'Wilderness Mountain Trek';

  const rawPoints: [number, number, number?][] = [];

  // 1. Try <trkpt>
  let ptNodes: NodeListOf<Element> = xmlDoc.querySelectorAll('trkpt');
  // 2. Fallback to <rtept>
  if (ptNodes.length === 0) {
    ptNodes = xmlDoc.querySelectorAll('rtept');
  }
  // 3. Fallback to <wpt>
  if (ptNodes.length === 0) {
    ptNodes = xmlDoc.querySelectorAll('wpt');
  }

  let totalDist = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minEle: number | undefined;
  let maxEle: number | undefined;
  let prevLat: number | null = null;
  let prevLng: number | null = null;
  let prevEle: number | null = null;

  const elevationProfile: { distanceKm: number; elevationMeters: number }[] = [];

  ptNodes.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    const eleNode = pt.querySelector('ele');
    const ele = eleNode ? parseFloat(eleNode.textContent || '0') : undefined;

    if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
      rawPoints.push([lat, lon, ele]);

      if (prevLat !== null && prevLng !== null) {
        const segDist = haversineDistance(prevLat, prevLng, lat, lon);
        totalDist += segDist;

        if (ele !== undefined && prevEle !== null) {
          const delta = ele - prevEle;
          if (delta > 0) {
            elevationGain += delta;
          } else if (delta < 0) {
            elevationLoss += Math.abs(delta);
          }
        }
      }

      if (ele !== undefined) {
        minEle = minEle === undefined ? ele : Math.min(minEle, ele);
        maxEle = maxEle === undefined ? ele : Math.max(maxEle, ele);

        // Sample elevation profile points at reasonable distance intervals
        if (
          elevationProfile.length === 0 ||
          totalDist - elevationProfile[elevationProfile.length - 1].distanceKm >= 0.15
        ) {
          elevationProfile.push({
            distanceKm: Math.round(totalDist * 10) / 10,
            elevationMeters: Math.round(ele),
          });
        }
      }

      prevLat = lat;
      prevLng = lon;
      if (ele !== undefined) prevEle = ele;
    }
  });

  // Ensure last point is always in elevation profile
  if (rawPoints.length > 0) {
    const lastPt = rawPoints[rawPoints.length - 1];
    const lastEle = lastPt[2];
    if (lastEle !== undefined) {
      const roundedDist = Math.round(totalDist * 10) / 10;
      if (
        elevationProfile.length === 0 ||
        elevationProfile[elevationProfile.length - 1].distanceKm !== roundedDist
      ) {
        elevationProfile.push({
          distanceKm: roundedDist,
          elevationMeters: Math.round(lastEle),
        });
      }
    }
  }

  // Extract named waypoints (campsites, summits, huts)
  const waypoints: { name: string; lat: number; lng: number; elevation?: number }[] = [];
  const wptNodes = xmlDoc.querySelectorAll('wpt');
  wptNodes.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    const name = wpt.querySelector('name')?.textContent || 'Waypoint';
    const eleNode = wpt.querySelector('ele');
    const ele = eleNode ? parseFloat(eleNode.textContent || '0') : undefined;

    if (!isNaN(lat) && !isNaN(lon)) {
      waypoints.push({ name, lat, lng: lon, elevation: ele !== undefined && !isNaN(ele) ? Math.round(ele) : undefined });
    }
  });

  // Downsample if rawPoints is extremely dense (> 600 points) to optimize 60 FPS animation
  let finalPoints = rawPoints;
  if (rawPoints.length > 600) {
    const step = Math.ceil(rawPoints.length / 500);
    finalPoints = rawPoints.filter((_, idx) => idx === 0 || idx === rawPoints.length - 1 || idx % step === 0);
  }

  return {
    points: finalPoints,
    name: trkName.trim(),
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    elevationGainMeters: Math.round(elevationGain),
    elevationLossMeters: Math.round(elevationLoss),
    minElevation: minEle !== undefined ? Math.round(minEle) : undefined,
    maxElevation: maxEle !== undefined ? Math.round(maxEle) : undefined,
    pointCount: rawPoints.length,
    waypoints,
    elevationProfile,
  };
}

/**
 * Geocode place search via OpenStreetMap Nominatim
 */
export async function searchPlaceOSM(query: string): Promise<Waypoint[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=6&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (res.ok) {
      const items = await res.json();
      return items.map((item: any) => ({
        id: `osm-${item.place_id || Math.random().toString(36).substring(7)}`,
        name: item.name || item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        country: item.address?.country || '',
      }));
    }
  } catch (err) {
    console.warn('Nominatim geocode failed', err);
  }
  return [];
}
