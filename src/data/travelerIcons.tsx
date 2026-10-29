import React, { useEffect, useRef } from 'react';
import { TransportMode } from '../types/travel';
import { drawIconGlyphToCanvas } from '../utils/vehicleDrawers';

export type TravelerCategory = 'all' | 'human' | 'overland' | 'aviation' | 'watercraft' | 'rail' | 'cycling';

export interface TravelerIconDefinition {
  id: string;
  name: string;
  category: TravelerCategory;
  defaultMode: TransportMode;
  tagline: string;
  description: string;
  badge: string;
  renderSvg: (props: { className?: string; color?: string; size?: number }) => React.ReactNode;
}

/**
 * Monochrome Shaded Top-Down Design System (Apple-style):
 * Canvas glyphs are LIVE-RENDERED from the exact same draw functions that
 * animate sprites on the map (see utils/vehicleDrawers.ts), so the icon
 * picker, sidebar and exported video all show pixel-identical vehicles:
 * - Every sprite renders in shades of ONE hue — the user's chosen color
 * - Hierarchy: deep-shade glazing, dark-shade outline, pure-color accents,
 *   light-tint body panels; neutral dark ground shadow
 * - Object-space gradient shading: lit edge + shaded edge on every panel
 */

/**
 * Small React component that paints one icon glyph onto a canvas.
 * Redrawn whenever the icon, color or size changes.
 */
const CanvasIconGlyph = React.memo(function CanvasIconGlyph({
  iconId,
  color = '#F59E0B',
  size = 24,
}: {
  iconId: string;
  color?: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawIconGlyphToCanvas(canvasRef.current, iconId, color, size);
    }
  }, [iconId, color, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden="true"
    />
  );
});

/**
 * renderSvg implementation shared by every icon definition.
 * Kept on the legacy name so all call sites keep working unchanged.
 */
function createCanvasGlyph(iconId: string) {
  return ({ className: _className = 'w-5 h-5', color = '#F59E0B', size = 24 }: { className?: string; color?: string; size?: number }) =>
    <CanvasIconGlyph iconId={iconId} color={color} size={size} />;
}
export const TRAVELER_ICONS: TravelerIconDefinition[] = [
  // ==========================================
  // AVIATION & FLIGHT (Matches user reference design)
  // ==========================================
  {
    id: 'plane-jet',
    name: 'Modern Jetliner',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Swept-wing commercial long-haul airliner',
    description: 'Top-down commercial jet with swept wings, twin engine nacelles, and cockpit arc.',
    badge: 'Popular',
    renderSvg: createCanvasGlyph('plane-jet'),
  },
  {
    id: 'plane-bush',
    name: 'Safari Bush Plane',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'High-wing Cessna Caravan utility workhorse',
    description: 'Iconic African bush aircraft with straight high wings, observation windows, and turboprop.',
    badge: 'Bush',
    renderSvg: createCanvasGlyph('plane-bush'),
  },
  {
    id: 'plane-twin',
    name: 'Twin-Engine Turboprop',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Twin Otter / King Air regional hopper',
    description: 'High-aspect wing with dual turboprop engines and T-tail empennage.',
    badge: 'Regional',
    renderSvg: createCanvasGlyph('plane-twin'),
  },
  {
    id: 'helicopter',
    name: 'Expedition Helicopter',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Modern streamlined rotorcraft (Airbus / Bell style)',
    description: 'Top-down teardrop cabin with rotating 4-blade rotor, landing skids, and tail rotor.',
    badge: 'Aerial',
    renderSvg: createCanvasGlyph('helicopter'),
  },
  {
    id: 'hot-air-balloon',
    name: 'Sunrise Safari Balloon',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Serengeti dawn hot air balloon flight',
    description: 'Top-down concentric balloon envelope with alternating duotone segments and burner.',
    badge: 'Iconic',
    renderSvg: createCanvasGlyph('hot-air-balloon'),
  },

  // ==========================================
  // OVERLAND & ROAD VEHICLES (Top-down CAD silhouettes)
  // ==========================================
  {
    id: 'suv-expedition',
    name: 'Overland Safari 4x4',
    category: 'overland',
    defaultMode: 'suv',
    tagline: 'Modern Defender / Land Cruiser with roof tent & gear',
    description: 'Top-down architectural 4WD silhouette with bold outline, roof rack, and rear spare tire.',
    badge: 'Featured',
    renderSvg: createCanvasGlyph('suv-expedition'),
  },
  {
    id: 'suv-rover',
    name: 'Modern Luxury SUV',
    category: 'overland',
    defaultMode: 'suv',
    tagline: 'Sleek aerodynamic touring crossover / Range Rover',
    description: 'Top-down luxury SUV with panoramic black glass roof and aerodynamic curves.',
    badge: 'Sleek',
    renderSvg: createCanvasGlyph('suv-rover'),
  },
  {
    id: 'camper-van',
    name: 'Adventure Vanlife 4x4',
    category: 'overland',
    defaultMode: 'camper',
    tagline: 'Sprinter 4x4 campervan with solar panels',
    description: 'Top-down camper van with pop-up roof and rooftop solar arrays.',
    badge: 'Vanlife',
    renderSvg: createCanvasGlyph('camper-van'),
  },
  {
    id: 'car-sedan',
    name: 'Electric Grand Tourer',
    category: 'overland',
    defaultMode: 'car',
    tagline: 'Modern fastback electric tourer / Taycan silhouette',
    description: 'Top-down aerodynamic fastback sports sedan with panoramic glass and front lightbar.',
    badge: 'Modern',
    renderSvg: createCanvasGlyph('car-sedan'),
  },
  {
    id: 'vintage-4x4',
    name: 'Classic Heritage 4x4',
    category: 'overland',
    defaultMode: 'suv',
    tagline: 'Canvas-top classic safari Defender 90',
    description: 'Top-down heritage 4x4 with open canvas roll cage and front bumper guard.',
    badge: 'Heritage',
    renderSvg: createCanvasGlyph('vintage-4x4'),
  },
  {
    id: 'motorcycle-adv',
    name: 'Adventure Dual-Sport',
    category: 'overland',
    defaultMode: 'motorcycle',
    tagline: 'Enduro adventure bike with aluminum panniers',
    description: 'Top-down motorcycle with front rally beak, handlebars, fuel tank, and twin side panniers.',
    badge: 'Agile',
    renderSvg: createCanvasGlyph('motorcycle-adv'),
  },

  // ==========================================
  // HUMAN & TREKKERS (Top-down Explorer Beacons)
  // ==========================================
  {
    id: 'hiker-modern',
    name: 'Modern Explorer',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Technical backcountry trekker with carbon poles & pack',
    description: 'Top-down explorer beacon with jacket, technical backpack, and dual trekking poles.',
    badge: 'Popular',
    renderSvg: createCanvasGlyph('hiker-modern'),
  },
  {
    id: 'trail-runner',
    name: 'Trail Runner',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Fastpacking athlete with hydration vest',
    description: 'Top-down athletic runner with hydration vest and dynamic cadence.',
    badge: 'Athletic',
    renderSvg: createCanvasGlyph('trail-runner'),
  },
  {
    id: 'mountaineer',
    name: 'Alpine Mountaineer',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Technical climber with ice axe & heavy pack',
    description: 'Top-down alpine climber with technical helmet, rucksack, and forward ice axe.',
    badge: 'Alpine',
    renderSvg: createCanvasGlyph('mountaineer'),
  },
  {
    id: 'desert-nomad',
    name: 'Safari Ranger / Scout',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Expedition field guide with walking staff',
    description: 'Top-down safari ranger with campaign hat, field staff, and utility vest.',
    badge: 'Field',
    renderSvg: createCanvasGlyph('desert-nomad'),
  },
  {
    id: 'wanderer',
    name: 'Minimalist Traveler',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Clean urban explorer with daypack',
    description: 'Top-down minimalist traveler with clean geometry and directional indicator.',
    badge: 'Minimal',
    renderSvg: createCanvasGlyph('wanderer'),
  },

  // ==========================================
  // WATERCRAFT & MARITIME (Naval Top-down)
  // ==========================================
  {
    id: 'boat-catamaran',
    name: 'Expedition Catamaran',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Twin-hull coastal & open-sea catamaran',
    description: 'Top-down naval catamaran with twin wave-piercing hulls and bridge deck salon.',
    badge: 'Popular',
    renderSvg: createCanvasGlyph('boat-catamaran'),
  },
  {
    id: 'boat-yacht',
    name: 'Modern Ocean Yacht',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Sculpted motor yacht with teak deck',
    description: 'Top-down motor yacht with pointed razor bow, teak deck, and flybridge.',
    badge: 'Luxury',
    renderSvg: createCanvasGlyph('boat-yacht'),
  },
  {
    id: 'boat-speedboat',
    name: 'Zodiac / RIB Speedboat',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Fast inflatable expedition collar tender',
    description: 'Top-down deep-V hull with thick inflatable collar tube and twin outboards.',
    badge: 'Agile',
    renderSvg: createCanvasGlyph('boat-speedboat'),
  },
  {
    id: 'boat-sailboat',
    name: 'Ocean Sloop / Sailboat',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Single-hull offshore sailing yacht',
    description: 'Top-down sailing hull with teak cockpit, mast, and mainsail boom.',
    badge: 'Sail',
    renderSvg: createCanvasGlyph('boat-sailboat'),
  },

  // ==========================================
  // RAIL & TRANSIT (Top-down Train Locomotives)
  // ==========================================
  {
    id: 'train-bullet',
    name: 'High-Speed Bullet Train',
    category: 'rail',
    defaultMode: 'train',
    tagline: 'Aerodynamic Shinkansen needle nose',
    description: 'Top-down aerodynamic bullet train with needle nose and dual livery stripes.',
    badge: 'Fast',
    renderSvg: createCanvasGlyph('train-bullet'),
  },
  {
    id: 'train-scenic',
    name: 'Glacier Panorama Express',
    category: 'rail',
    defaultMode: 'train',
    tagline: 'Alpine scenic rail with curved glass dome roofs',
    description: 'Top-down mountain rail car with panoramic observation glass windows.',
    badge: 'Scenic',
    renderSvg: createCanvasGlyph('train-scenic'),
  },

  // ==========================================
  // CYCLING & BIKES (Top-down Precision Frames)
  // ==========================================
  {
    id: 'bike-gravel',
    name: 'Gravel Bikepacking Rig',
    category: 'cycling',
    defaultMode: 'bicycle',
    tagline: 'Drop-bar adventure bike with frame bags',
    description: 'Top-down bicycle with drop handlebars, frame bag, and front/rear wheels.',
    badge: 'Bikepack',
    renderSvg: createCanvasGlyph('bike-gravel'),
  },
  {
    id: 'bike-ebike',
    name: 'Modern Commuter E-Bike',
    category: 'cycling',
    defaultMode: 'bicycle',
    tagline: 'Clean urban bicycle with integrated battery',
    description: 'Top-down city bicycle with flat bars and integrated frame battery.',
    badge: 'Urban',
    renderSvg: createCanvasGlyph('bike-ebike'),
  },
];

export const TRAVELER_CATEGORIES: { id: TravelerCategory; label: string }[] = [
  { id: 'all', label: 'All Icons' },
  { id: 'aviation', label: 'Aviation' },
  { id: 'overland', label: 'Overland & Road' },
  { id: 'human', label: 'Human & Trek' },
  { id: 'watercraft', label: 'Watercraft' },
  { id: 'rail', label: 'Rail Transit' },
  { id: 'cycling', label: 'Cycling' },
];

/**
 * Find icon definition by ID with sensible fallback for any transport mode
 */
export function getIconDefinition(iconId?: string, fallbackMode?: TransportMode): TravelerIconDefinition {
  if (iconId) {
    const found = TRAVELER_ICONS.find((icon) => icon.id === iconId);
    if (found) return found;
  }

  // Fallback map based on TransportMode
  const modeFallbackMap: Record<TransportMode, string> = {
    flight: 'plane-jet',
    suv: 'suv-expedition',
    car: 'car-sedan',
    camper: 'camper-van',
    motorcycle: 'motorcycle-adv',
    train: 'train-bullet',
    boat: 'boat-catamaran',
    hike: 'hiker-modern',
    bicycle: 'bike-gravel',
  };

  const defaultId = fallbackMode ? modeFallbackMap[fallbackMode] || 'plane-jet' : 'plane-jet';
  return TRAVELER_ICONS.find((i) => i.id === defaultId) || TRAVELER_ICONS[0];
}

export function getDefaultIconIdForMode(mode: TransportMode): string {
  switch (mode) {
    case 'flight':
      return 'plane-jet';
    case 'suv':
      return 'suv-expedition';
    case 'car':
      return 'car-sedan';
    case 'camper':
      return 'camper-van';
    case 'motorcycle':
      return 'motorcycle-adv';
    case 'train':
      return 'train-bullet';
    case 'boat':
      return 'boat-catamaran';
    case 'hike':
      return 'hiker-modern';
    case 'bicycle':
      return 'bike-gravel';
    default:
      return 'suv-expedition';
  }
}
