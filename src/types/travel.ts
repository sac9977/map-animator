/**
 * Core Travel & Animation Types
 */

export type TransportMode =
  | 'flight'
  | 'car'
  | 'suv'
  | 'camper'
  | 'motorcycle'
  | 'train'
  | 'boat'
  | 'bicycle'
  | 'hike';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
  /** Secondary place context for disambiguation (state/region/type), e.g. "Uttarakhand · town" */
  detail?: string;
  airportCode?: string; // e.g. "JRO", "JFK"
  elevation?: number; // meters
}

export interface TrekConfiguration {
  sourceType: 'auto' | 'gpx' | 'waypoints' | 'osm_trail';
  gpxFileName?: string;
  rawGpxPoints?: [number, number, number?][]; // [lat, lng, elevation?]
  splineTension?: number;
  trailPattern?: 'dotted' | 'dashed' | 'bootprints';
  elevationProfile?: { distanceKm: number; elevationMeters: number }[];
  totalDistanceKm?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  minElevation?: number;
  maxElevation?: number;
  pointCount?: number;
}

export interface FlightInfo {
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  cruiseAltitudeFeet?: number;
}

export interface JourneyLeg {
  id: string;
  from: Waypoint;
  to: Waypoint;
  mode: TransportMode;
  label: string;
  vehicleColor: string;
  vehicleScale: number;
  showTrail: boolean;
  trailColor: string;
  durationSeconds: number; // Duration of animation for this leg
  pauseAtDestinationSeconds: number; // Cinematic dwell at arrival
  cachedPath: [number, number][]; // [lat, lng] array
  trekConfig?: TrekConfiguration;
  flightInfo?: FlightInfo;
  customIconId?: string; // Specific modern icon ID chosen by user
  zoomBias?: number; // Transit zoom-out trim in zoom levels; 0/undefined = Auto distance-fit
}

export type MapTileStyle = 'cinematic-voyager' | 'osm' | 'opentopomap' | 'outdoor' | 'satellite';

export interface AnimationSettings {
  autoZoom: boolean;
  minZoom: number;
  maxZoom: number;
  speedMultiplier: number;
  showWeatherBadge: boolean;
  showTrails: boolean;
  showVehicleShadow: boolean;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';
export type VideoResolution = '4K' | '1080p' | '720p';

export interface VideoExportConfig {
  aspectRatio: AspectRatio;
  resolution: VideoResolution;
  fps: 30 | 60;
  quality: 'high' | 'medium';
}

export interface WeatherCondition {
  tempCelsius: number;
  condition: 'Sunny' | 'Partly Cloudy' | 'Clear Sky' | 'Mountain Breeze' | 'Savannah Heat';
  icon: 'sun' | 'cloud-sun' | 'wind' | 'compass';
  timeOfDay: string;
}
