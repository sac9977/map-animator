import { haversineDistance, parseGPX, ParsedGPXResult } from './geoRouting';
import { JourneyLeg, Waypoint } from '../types/travel';

export interface ElevationPoint {
  distanceKm: number;
  elevationMeters: number;
}

export interface ElevationAnalysis {
  profile: ElevationPoint[];
  totalDistanceKm: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  averageGradePercent: number;
  maxGradePercent: number;
  source: 'gpx' | 'dem_api' | 'synthetic';
  waypoints?: { name: string; distanceKm: number; elevationMeters: number }[];
}

/**
 * Extract elevation data from GPX string
 */
export function extractElevationFromGPX(xmlText: string): ParsedGPXResult {
  return parseGPX(xmlText);
}

/**
 * Fetch real worldwide Copernicus terrain height from Open-Meteo Free Elevation API
 */
export async function fetchTerrainElevationForPath(
  coords: [number, number][]
): Promise<ElevationAnalysis | null> {
  if (!coords || coords.length === 0) return null;

  try {
    // Sample coordinates to max 80 points to respect URL length and API bandwidth
    const sampledCoords: [number, number][] = [];
    const step = Math.max(1, Math.ceil(coords.length / 80));
    for (let i = 0; i < coords.length; i += step) {
      sampledCoords.push(coords[i]);
    }
    if (sampledCoords[sampledCoords.length - 1] !== coords[coords.length - 1]) {
      sampledCoords.push(coords[coords.length - 1]);
    }

    const lats = sampledCoords.map((c) => c[0].toFixed(5)).join(',');
    const lngs = sampledCoords.map((c) => c[1].toFixed(5)).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Elevation API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.elevation || !Array.isArray(data.elevation) || data.elevation.length === 0) {
      throw new Error('No elevation array in response');
    }

    const rawElevations: number[] = data.elevation;
    let accumulatedDist = 0;
    let gain = 0;
    let loss = 0;
    let minEle = rawElevations[0];
    let maxEle = rawElevations[0];
    let maxGrade = 0;

    const profile: ElevationPoint[] = [
      {
        distanceKm: 0,
        elevationMeters: Math.round(rawElevations[0]),
      },
    ];

    for (let i = 1; i < sampledCoords.length; i++) {
      const prevCoord = sampledCoords[i - 1];
      const curCoord = sampledCoords[i];
      const segDist = haversineDistance(prevCoord[0], prevCoord[1], curCoord[0], curCoord[1]);
      accumulatedDist += segDist;

      const curEle = rawElevations[i] ?? rawElevations[i - 1];
      const prevEle = rawElevations[i - 1];
      const diff = curEle - prevEle;

      if (diff > 0) gain += diff;
      else if (diff < 0) loss += Math.abs(diff);

      minEle = Math.min(minEle, curEle);
      maxEle = Math.max(maxEle, curEle);

      if (segDist > 0.05) {
        const grade = Math.abs((diff / (segDist * 1000)) * 100);
        maxGrade = Math.max(maxGrade, grade);
      }

      profile.push({
        distanceKm: Math.round(accumulatedDist * 10) / 10,
        elevationMeters: Math.round(curEle),
      });
    }

    return {
      profile,
      totalDistanceKm: Math.round(accumulatedDist * 10) / 10,
      minElevationMeters: Math.round(minEle),
      maxElevationMeters: Math.round(maxEle),
      elevationGainMeters: Math.round(gain),
      elevationLossMeters: Math.round(loss),
      averageGradePercent: accumulatedDist > 0 ? Math.round((gain / (accumulatedDist * 1000)) * 100 * 10) / 10 : 0,
      maxGradePercent: Math.min(45, Math.round(maxGrade * 10) / 10),
      source: 'dem_api',
    };
  } catch (err) {
    console.warn('Failed to fetch DEM elevation from Open-Meteo, using fallback:', err);
    return null;
  }
}

/**
 * Generate synthetic realistic terrain profile between two points if no GPX or DEM is available
 */
export function generateSyntheticElevationProfile(
  from: Waypoint,
  to: Waypoint,
  path: [number, number][],
  mode: string
): ElevationAnalysis {
  let startEle = from.elevation ?? (mode === 'boat' ? 0 : 450);
  let endEle = to.elevation ?? (mode === 'boat' ? 0 : 750);

  // Flight cruise altitude profile
  if (mode === 'flight') {
    startEle = from.elevation ?? 800;
    endEle = to.elevation ?? 1200;
    const cruiseEle = 2895; // ~9,500 ft cruise
    const totalDist = Math.max(10, calculatePathDistance(path));
    const profile: ElevationPoint[] = [];
    const steps = Math.min(40, Math.max(15, path.length));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let ele = startEle;
      if (t < 0.25) {
        // Climb
        const climbT = t / 0.25;
        ele = startEle + (cruiseEle - startEle) * Math.sin((climbT * Math.PI) / 2);
      } else if (t < 0.75) {
        // Cruise with minor air drift
        ele = cruiseEle + Math.sin(t * Math.PI * 4) * 20;
      } else {
        // Descent
        const descT = (t - 0.75) / 0.25;
        ele = cruiseEle - (cruiseEle - endEle) * (1 - Math.cos((descT * Math.PI) / 2));
      }
      profile.push({
        distanceKm: Math.round(t * totalDist * 10) / 10,
        elevationMeters: Math.round(ele),
      });
    }

    return {
      profile,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      minElevationMeters: Math.min(startEle, endEle),
      maxElevationMeters: Math.round(cruiseEle),
      elevationGainMeters: Math.round(cruiseEle - startEle),
      elevationLossMeters: Math.round(cruiseEle - endEle),
      averageGradePercent: 4.2,
      maxGradePercent: 8.5,
      source: 'synthetic',
    };
  }

  // Ground / Trek / SUV profile
  const totalDist = Math.max(5, calculatePathDistance(path));
  const steps = Math.min(50, Math.max(20, path.length));
  const profile: ElevationPoint[] = [];

  let gain = 0;
  let loss = 0;
  let prevEle = startEle;
  let minEle = startEle;
  let maxEle = startEle;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Base interpolation
    const base = startEle + (endEle - startEle) * t;
    // Undulating terrain ridges
    const ridge1 = Math.sin(t * Math.PI * 3.5) * 85;
    const ridge2 = Math.cos(t * Math.PI * 7.2) * 45;
    const ele = Math.max(0, Math.round(base + ridge1 + ridge2));

    minEle = Math.min(minEle, ele);
    maxEle = Math.max(maxEle, ele);

    if (i > 0) {
      const diff = ele - prevEle;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }
    prevEle = ele;

    profile.push({
      distanceKm: Math.round(t * totalDist * 10) / 10,
      elevationMeters: ele,
    });
  }

  return {
    profile,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    minElevationMeters: minEle,
    maxElevationMeters: maxEle,
    elevationGainMeters: gain,
    elevationLossMeters: loss,
    averageGradePercent: totalDist > 0 ? Math.round((gain / (totalDist * 1000)) * 100 * 10) / 10 : 0,
    maxGradePercent: 12.8,
    source: 'synthetic',
  };
}

/**
 * Calculate total path distance in km
 */
export function calculatePathDistance(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineDistance(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return sum;
}

/**
 * Get elevation analysis for a specific Journey Leg
 */
export function getElevationAnalysisForLeg(leg: JourneyLeg): ElevationAnalysis {
  // 1. Check if leg has dedicated GPX elevation profile
  if (leg.trekConfig?.elevationProfile && leg.trekConfig.elevationProfile.length > 0) {
    const prof = leg.trekConfig.elevationProfile;
    const minEle = leg.trekConfig.minElevation ?? Math.min(...prof.map((p) => p.elevationMeters));
    const maxEle = leg.trekConfig.maxElevation ?? Math.max(...prof.map((p) => p.elevationMeters));
    const gain = leg.trekConfig.elevationGainMeters ?? 0;
    const loss = leg.trekConfig.elevationLossMeters ?? Math.max(0, maxEle - prof[prof.length - 1].elevationMeters);
    const dist = leg.trekConfig.totalDistanceKm ?? prof[prof.length - 1].distanceKm;

    return {
      profile: prof,
      totalDistanceKm: dist,
      minElevationMeters: minEle,
      maxElevationMeters: maxEle,
      elevationGainMeters: gain,
      elevationLossMeters: loss,
      averageGradePercent: dist > 0 ? Math.round((gain / (dist * 1000)) * 100 * 10) / 10 : 0,
      maxGradePercent: 16.5,
      source: 'gpx',
    };
  }

  // 2. Check if raw GPX points exist with elevation [lat, lng, ele]
  if (leg.trekConfig?.rawGpxPoints && leg.trekConfig.rawGpxPoints.length > 0) {
    const raw = leg.trekConfig.rawGpxPoints;
    let accDist = 0;
    let gain = 0;
    let loss = 0;
    let minEle = raw[0][2] ?? 1000;
    let maxEle = raw[0][2] ?? 1000;
    const prof: ElevationPoint[] = [];

    raw.forEach((pt, i) => {
      const ele = pt[2] ?? 1000;
      if (i > 0) {
        const seg = haversineDistance(raw[i - 1][0], raw[i - 1][1], pt[0], pt[1]);
        accDist += seg;
        const diff = ele - (raw[i - 1][2] ?? ele);
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
      }
      minEle = Math.min(minEle, ele);
      maxEle = Math.max(maxEle, ele);

      if (i === 0 || i === raw.length - 1 || prof.length === 0 || accDist - prof[prof.length - 1].distanceKm >= 0.2) {
        prof.push({
          distanceKm: Math.round(accDist * 10) / 10,
          elevationMeters: Math.round(ele),
        });
      }
    });

    return {
      profile: prof,
      totalDistanceKm: Math.round(accDist * 10) / 10,
      minElevationMeters: Math.round(minEle),
      maxElevationMeters: Math.round(maxEle),
      elevationGainMeters: Math.round(gain),
      elevationLossMeters: Math.round(loss),
      averageGradePercent: accDist > 0 ? Math.round((gain / (accDist * 1000)) * 100 * 10) / 10 : 0,
      maxGradePercent: 18.2,
      source: 'gpx',
    };
  }

  // 3. Synthetic realistic profile based on route
  return generateSyntheticElevationProfile(leg.from, leg.to, leg.cachedPath, leg.mode);
}

/**
 * Interpolate current elevation and slope at a given progress (0 to 1) along the profile
 */
export function interpolateCurrentElevation(
  profile: ElevationPoint[],
  progress: number
): {
  distanceKm: number;
  elevationMeters: number;
  gradePercent: number;
} {
  if (!profile || profile.length === 0) {
    return { distanceKm: 0, elevationMeters: 0, gradePercent: 0 };
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const maxDist = profile[profile.length - 1].distanceKm;
  const targetDist = clampedProgress * maxDist;

  // Find surrounding points
  let idx = 0;
  while (idx < profile.length - 1 && profile[idx + 1].distanceKm <= targetDist) {
    idx++;
  }

  if (idx >= profile.length - 1) {
    const last = profile[profile.length - 1];
    return { distanceKm: last.distanceKm, elevationMeters: last.elevationMeters, gradePercent: 0 };
  }

  const p0 = profile[idx];
  const p1 = profile[idx + 1];
  const segDist = p1.distanceKm - p0.distanceKm;
  const factor = segDist > 0 ? (targetDist - p0.distanceKm) / segDist : 0;

  const currentElevation = p0.elevationMeters + (p1.elevationMeters - p0.elevationMeters) * factor;
  const deltaElevation = p1.elevationMeters - p0.elevationMeters;
  const gradePercent = segDist > 0 ? Math.round((deltaElevation / (segDist * 1000)) * 100 * 10) / 10 : 0;

  return {
    distanceKm: Math.round(targetDist * 10) / 10,
    elevationMeters: Math.round(currentElevation),
    gradePercent,
  };
}

export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function kmToMiles(km: number): number {
  return Math.round(km * 0.621371 * 10) / 10;
}
