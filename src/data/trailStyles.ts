import { TransportMode } from '../types/travel';

export interface TrailColorPreset {
  name: string;
  hex: string;
  category: 'warm' | 'cool' | 'vibrant' | 'neutral';
  description: string;
}

export const TRAIL_COLOR_PRESETS: TrailColorPreset[] = [
  { name: 'Amber Gold', hex: '#F59E0B', category: 'warm', description: 'Safari savannah accent' },
  { name: 'Savannah Teal', hex: '#0E6466', category: 'cool', description: 'Deep expedition emerald' },
  { name: 'Sunset Coral', hex: '#EF4444', category: 'warm', description: 'High-contrast vibrant red' },
  { name: 'Sky Cyan', hex: '#06B6D4', category: 'cool', description: 'Aviation and coastal trail' },
  { name: 'Royal Blue', hex: '#2563EB', category: 'cool', description: 'Deep ocean maritime' },
  { name: 'Emerald Mint', hex: '#10B981', category: 'vibrant', description: 'Wilderness & alpine green' },
  { name: 'Vivid Violet', hex: '#8B5CF6', category: 'vibrant', description: 'Sunset mountain ridge' },
  { name: 'Neon Rose', hex: '#EC4899', category: 'vibrant', description: 'Electrified GPS trail' },
  { name: 'Alpine White', hex: '#FFFFFF', category: 'neutral', description: 'Glacier & satellite contrast' },
  { name: 'Stealth Slate', hex: '#1E293B', category: 'neutral', description: 'Dark topographic contour' },
];

/**
 * Converts a hex string (#RRGGBB or #RGB) into an rgba(...) CSS/Canvas color string
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(14, 100, 102, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    // Already an rgb/rgba string; return with alpha adjustment if possible
    return hex;
  }
  const cleanHex = hex.replace('#', '').trim();
  let r = 14;
  let g = 100;
  let b = 102;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  }

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * Returns the default trail color tailored to each transport mode
 */
export function getDefaultTrailColorForMode(mode: TransportMode): string {
  switch (mode) {
    case 'flight':
      return '#06B6D4'; // Sky Cyan
    case 'hike':
      return '#F59E0B'; // Amber Gold
    case 'boat':
      return '#0284C7'; // Deep Sky
    case 'train':
      return '#8B5CF6'; // Violet
    case 'bicycle':
      return '#10B981'; // Mint
    case 'motorcycle':
      return '#EF4444'; // Red
    case 'camper':
    case 'car':
    case 'suv':
    default:
      return '#0E6466'; // Savannah Teal
  }
}
