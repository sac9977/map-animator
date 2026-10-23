import React from 'react';
import { TransportMode } from '../types/travel';

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
 * Top-Down Bold-Duotone Design System (as shown in reference):
 * - Solid crisp dark outline (#0F172A, strokeWidth 1.8-2, rounded joints)
 * - Light neutral primary body (#F8FAFC / #F1F5F9)
 * - Dynamic accent fill (the app's Amber Gold / Savannah Teal / user leg color)
 * - High-contrast cockpit/windshield/detail cutouts (#0F172A)
 */
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Left & Right Swept Wings */}
          <path
            d="M13.5 12L3.5 16.5v2.2l10-3.2v-5.5z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M18.5 12l10 4.5v2.2l-10-3.2v-5.5z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Underslung Engine Nacelles */}
          <rect
            x="7.5"
            y="13.5"
            width="3"
            height="7"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <rect
            x="21.5"
            y="13.5"
            width="3"
            height="7"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />

          {/* Tail Horizontal Stabilizers */}
          <path
            d="M14.5 24l-5 2.5v1.8l5-2.2v-2.1z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M17.5 24l5 2.5v1.8l-5-2.2v-2.1z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Main Fuselage */}
          <path
            d="M16 3c-2.2 0-2.8 2.5-2.8 5.5v13.5l1.5 4.5c.4 1 1.8 1 2.6 0l1.5-4.5V8.5C18.8 5.5 18.2 3 16 3z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Cockpit Window Crescent Arc */}
          <path
            d="M14.5 7.5c.8-1.2 2.2-1.2 3 0"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    },
  },
  {
    id: 'plane-bush',
    name: 'Safari Bush Plane',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'High-wing Cessna Caravan utility workhorse',
    description: 'Iconic African bush aircraft with straight high wings, observation windows, and turboprop.',
    badge: 'Bush',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Main High Wing */}
          <rect
            x="3"
            y="11.5"
            width="26"
            height="5"
            rx="2"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />

          {/* Tailplane */}
          <rect
            x="10"
            y="25.5"
            width="12"
            height="3.5"
            rx="1.2"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />

          {/* Fuselage */}
          <path
            d="M16 4.5c-2 0-2.5 2-2.5 5v14l1.3 4.2c.4.8 1.8.8 2.4 0l1.3-4.2V9.5c0-3-.5-5-2.5-5z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />

          {/* Cockpit Arc */}
          <path
            d="M14.5 8.5c.8-1 2.2-1 3 0"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Nose Propeller Disc */}
          <ellipse
            cx="16"
            cy="4"
            rx="5.5"
            ry="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.7"
          />
          <circle cx="16" cy="4" r="1.3" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'plane-twin',
    name: 'Twin-Engine Turboprop',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Twin Otter / King Air regional hopper',
    description: 'High-aspect wing with dual turboprop engines and T-tail empennage.',
    badge: 'Regional',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Main Wing with Accent Panels */}
          <rect
            x="2.5"
            y="12"
            width="27"
            height="4.5"
            rx="1.5"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />

          {/* Twin Engine Cowlings */}
          <rect
            x="8.5"
            y="9.5"
            width="3.5"
            height="8"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
          />
          <rect
            x="20"
            y="9.5"
            width="3.5"
            height="8"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
          />
          <circle cx="10.2" cy="9.5" r="1.2" fill="#0F172A" />
          <circle cx="21.7" cy="9.5" r="1.2" fill="#0F172A" />

          {/* Tailplane */}
          <rect
            x="11"
            y="26"
            width="10"
            height="3"
            rx="1"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.9"
          />

          {/* Fuselage */}
          <path
            d="M16 4c-1.8 0-2.4 2-2.4 5.5v14l1.2 4.2c.4.8 1.8.8 2.4 0l1.2-4.2V9.5C18.4 6 17.8 4 16 4z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M14.8 8.5c.7-.8 1.7-.8 2.4 0"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
    },
  },
  {
    id: 'helicopter',
    name: 'Expedition Helicopter',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Modern streamlined rotorcraft (Airbus / Bell style)',
    description: 'Top-down teardrop cabin with rotating 4-blade rotor, landing skids, and tail rotor.',
    badge: 'Aerial',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Landing Skids */}
          <line x1="8" y1="9" x2="8" y2="21" stroke="#0F172A" strokeWidth="1.9" strokeLinecap="round" />
          <line x1="24" y1="9" x2="24" y2="21" stroke="#0F172A" strokeWidth="1.9" strokeLinecap="round" />
          <line x1="8" y1="12" x2="11" y2="12" stroke="#0F172A" strokeWidth="1.7" />
          <line x1="8" y1="18" x2="11" y2="18" stroke="#0F172A" strokeWidth="1.7" />
          <line x1="21" y1="12" x2="24" y2="12" stroke="#0F172A" strokeWidth="1.7" />
          <line x1="21" y1="18" x2="24" y2="18" stroke="#0F172A" strokeWidth="1.7" />

          {/* Tail Boom & Tail Rotor */}
          <path d="M16 19v9" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12.5" y1="28" x2="19.5" y2="28" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="28" r="1.5" fill={accent} stroke="#0F172A" strokeWidth="1.5" />

          {/* Teardrop Fuselage */}
          <path
            d="M16 6c-3.5 0-5 3.5-5 8.5 0 4 2.5 6.5 5 6.5s5-2.5 5-6.5c0-5-1.5-8.5-5-8.5z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Cockpit Canopy */}
          <path
            d="M13 11c.8-1.5 2.2-2 3-2s2.2.5 3 2c-.8 1.5-2.2 2-3 2s-2.2-.5-3-2z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* 4-Blade Main Rotor */}
          <line x1="3" y1="14.5" x2="29" y2="14.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="1.5" x2="16" y2="27.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="14.5" r="2.5" fill={accent} stroke="#0F172A" strokeWidth="1.9" />
        </svg>
      );
    },
  },
  {
    id: 'hot-air-balloon',
    name: 'Sunrise Safari Balloon',
    category: 'aviation',
    defaultMode: 'flight',
    tagline: 'Serengeti dawn hot air balloon flight',
    description: 'Top-down concentric balloon envelope with alternating duotone segments and burner.',
    badge: 'Iconic',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Outer Balloon Circle */}
          <circle cx="16" cy="16" r="13" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2.2" />

          {/* Alternating Duotone Quadrants */}
          <path d="M16 3A13 13 0 0 1 29 16H16z" fill={accent} stroke="#0F172A" strokeWidth="1.9" />
          <path d="M16 16H3a13 13 0 0 1 13-13z" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.9" />
          <path d="M16 16v13A13 13 0 0 1 3 16z" fill={accent} stroke="#0F172A" strokeWidth="1.9" />
          <path d="M16 16h13A13 13 0 0 1 16 29z" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.9" />

          {/* Inner Collar Ring */}
          <circle cx="16" cy="16" r="6" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />
          {/* Center Burner */}
          <circle cx="16" cy="16" r="2.5" fill="#EF4444" stroke="#0F172A" strokeWidth="1.5" />
        </svg>
      );
    },
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Side Mirrors */}
          <rect x="5.5" y="9.5" width="2" height="3" rx="1" fill="#0F172A" />
          <rect x="24.5" y="9.5" width="2" height="3" rx="1" fill="#0F172A" />

          {/* Rear Mounted Spare Wheel */}
          <ellipse cx="16" cy="27" rx="3.5" ry="2" fill="#0F172A" />
          <ellipse cx="16" cy="27" rx="1.5" ry="1" fill={accent} />

          {/* Main Chassis Body */}
          <rect
            x="7.5"
            y="4.5"
            width="17"
            height="21"
            rx="4"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Hood Accent Panel */}
          <path
            d="M9.5 5.5h13l.5 4h-14z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />

          {/* Windshield */}
          <rect
            x="9.5"
            y="10.5"
            width="13"
            height="2.5"
            rx="1"
            fill="#0F172A"
          />

          {/* Roof Rack & Expedition Cases */}
          <rect
            x="9.5"
            y="14"
            width="13"
            height="9"
            rx="1.5"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />
          {/* Rack bars */}
          <line x1="9.5" y1="17" x2="22.5" y2="17" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="9.5" y1="20" x2="22.5" y2="20" stroke="#0F172A" strokeWidth="1.2" />

          {/* Headlights */}
          <rect x="8.5" y="4.5" width="2.5" height="1.5" rx="0.5" fill="#FFFFFF" />
          <rect x="21" y="4.5" width="2.5" height="1.5" rx="0.5" fill="#FFFFFF" />
        </svg>
      );
    },
  },
  {
    id: 'suv-rover',
    name: 'Modern Luxury SUV',
    category: 'overland',
    defaultMode: 'suv',
    tagline: 'Sleek aerodynamic touring crossover / Range Rover',
    description: 'Top-down luxury SUV with panoramic black glass roof and aerodynamic curves.',
    badge: 'Sleek',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Side Mirrors */}
          <rect x="5.5" y="10" width="2" height="3" rx="1" fill="#0F172A" />
          <rect x="24.5" y="10" width="2" height="3" rx="1" fill="#0F172A" />

          {/* Sculpted Body */}
          <rect
            x="7.5"
            y="4"
            width="17"
            height="24"
            rx="5.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Hood */}
          <path
            d="M9.5 5h13l.8 4.5h-14.6z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />

          {/* Panoramic Glass Canopy */}
          <rect
            x="9"
            y="11"
            width="14"
            height="12"
            rx="2.5"
            fill="#0F172A"
          />
          {/* Glass Specular Glare */}
          <line x1="11" y1="13" x2="16" y2="21" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />

          {/* Laser Headlights */}
          <line x1="9" y1="4.5" x2="12" y2="4.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="4.5" x2="23" y2="4.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

          {/* Rear LED Lightbar */}
          <line x1="9" y1="27.5" x2="23" y2="27.5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    },
  },
  {
    id: 'camper-van',
    name: 'Adventure Vanlife 4x4',
    category: 'overland',
    defaultMode: 'camper',
    tagline: 'Sprinter 4x4 campervan with solar panels',
    description: 'Top-down camper van with pop-up roof and rooftop solar arrays.',
    badge: 'Vanlife',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Side Mirrors */}
          <rect x="5.5" y="8" width="2" height="3" rx="1" fill="#0F172A" />
          <rect x="24.5" y="8" width="2" height="3" rx="1" fill="#0F172A" />

          {/* Van Body */}
          <rect
            x="7.5"
            y="3.5"
            width="17"
            height="25"
            rx="4"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Windshield */}
          <path
            d="M9.5 7.5h13l.8 3h-14.6z"
            fill="#0F172A"
          />

          {/* Rooftop Solar Array */}
          <rect
            x="9"
            y="12"
            width="14"
            height="13.5"
            rx="2"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          {/* Solar Grid Lines */}
          <line x1="9" y1="16.5" x2="23" y2="16.5" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="9" y1="21" x2="23" y2="21" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="16" y1="12" x2="16" y2="25.5" stroke="#0F172A" strokeWidth="1.2" />
        </svg>
      );
    },
  },
  {
    id: 'car-sedan',
    name: 'Electric Grand Tourer',
    category: 'overland',
    defaultMode: 'car',
    tagline: 'Modern fastback electric tourer / Taycan silhouette',
    description: 'Top-down aerodynamic fastback sports sedan with panoramic glass and front lightbar.',
    badge: 'Modern',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Mirrors */}
          <rect x="5.8" y="10" width="1.8" height="2.5" rx="0.8" fill="#0F172A" />
          <rect x="24.4" y="10" width="1.8" height="2.5" rx="0.8" fill="#0F172A" />

          {/* Streamlined Fastback Body */}
          <path
            d="M10 4.5c3-1 9-1 12 0 2 1.5 3 4.5 3 8.5s-1 10-3 12.5c-3 1.5-9 1.5-12 0-2-2.5-3-8.5-3-12.5s1-7 3-8.5z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Hood */}
          <path
            d="M10 5.5h12l1 4.5H9z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* Glass Canopy */}
          <path
            d="M10 11.5h12l.5 8H9.5z"
            fill="#0F172A"
          />

          {/* Rear Deck */}
          <path
            d="M10 21h12l-1 3.5H11z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* Front Lightbar */}
          <line x1="11" y1="4.5" x2="21" y2="4.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    },
  },
  {
    id: 'vintage-4x4',
    name: 'Classic Heritage 4x4',
    category: 'overland',
    defaultMode: 'suv',
    tagline: 'Canvas-top classic safari Defender 90',
    description: 'Top-down heritage 4x4 with open canvas roll cage and front bumper guard.',
    badge: 'Heritage',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Front Bumper Brushguard */}
          <rect x="7" y="3" width="18" height="2" rx="1" fill="#0F172A" />

          {/* Body */}
          <rect
            x="8"
            y="4.5"
            width="16"
            height="22"
            rx="2.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Square Hood */}
          <rect
            x="9.5"
            y="5"
            width="13"
            height="6"
            rx="1"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />

          {/* Windshield */}
          <rect x="9.5" y="11.5" width="13" height="2" fill="#0F172A" />

          {/* Roll Cage / Soft Top Bed */}
          <rect
            x="9.5"
            y="14"
            width="13"
            height="11"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          {/* Roll Bar Cross */}
          <line x1="9.5" y1="19.5" x2="22.5" y2="19.5" stroke="#0F172A" strokeWidth="1.5" />
          <line x1="16" y1="14" x2="16" y2="25" stroke="#0F172A" strokeWidth="1.5" />

          {/* Spare Wheel on rear */}
          <rect x="13.5" y="26.5" width="5" height="2" rx="1" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'motorcycle-adv',
    name: 'Adventure Dual-Sport',
    category: 'overland',
    defaultMode: 'motorcycle',
    tagline: 'Enduro adventure bike with aluminum panniers',
    description: 'Top-down motorcycle with front rally beak, handlebars, fuel tank, and twin side panniers.',
    badge: 'Agile',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Handlebars with Handguards */}
          <path d="M7 11h18" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="7" cy="11" r="1.5" fill={accent} />
          <circle cx="25" cy="11" r="1.5" fill={accent} />

          {/* Front Wheel & Beak */}
          <rect x="14" y="2.5" width="4" height="6.5" rx="2" fill="#0F172A" />

          {/* Twin Aluminum Panniers (Rear Luggage) */}
          <rect
            x="6"
            y="19"
            width="5"
            height="8"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
          />
          <rect
            x="21"
            y="19"
            width="5"
            height="8"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
          />

          {/* Fuel Tank & Frame */}
          <path
            d="M16 9.5c-2.5 0-3.5 2-3.5 5 0 3.5 1.5 5 3.5 5s3.5-1.5 3.5-5c0-3-1-5-3.5-5z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Rider Seat & Rear Wheel */}
          <rect x="14" y="19.5" width="4" height="4" rx="1.5" fill="#0F172A" />
          <rect x="14" y="23.5" width="4" height="6.5" rx="2" fill="#0F172A" />
        </svg>
      );
    },
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Carbon Trekking Poles Extending Forward */}
          <line x1="6" y1="21" x2="9" y2="4" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="26" y1="21" x2="23" y2="4" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          {/* Pole Grips */}
          <circle cx="8" cy="10" r="1.5" fill={accent} stroke="#0F172A" strokeWidth="1.4" />
          <circle cx="24" cy="10" r="1.5" fill={accent} stroke="#0F172A" strokeWidth="1.4" />

          {/* Technical Backpack on Back */}
          <rect
            x="11"
            y="17"
            width="10"
            height="8.5"
            rx="3"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Sleeping roll / gear strap */}
          <rect x="10.5" y="25" width="11" height="2.5" rx="1" fill={accent} stroke="#0F172A" strokeWidth="1.5" />

          {/* Explorer Shoulders / Jacket */}
          <path
            d="M9 16c0-4 3-7 7-7s7 3 7 7-3 3-7 3-7 0-7-3z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Head & Tech Cap */}
          <circle cx="16" cy="13" r="4" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />
          {/* Cap peak pointing forward */}
          <path d="M14 9.5h4l-2-3-2 3z" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'trail-runner',
    name: 'Trail Runner',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Fastpacking athlete with hydration vest',
    description: 'Top-down athletic runner with hydration vest and dynamic cadence.',
    badge: 'Athletic',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Runner Pumping Arms */}
          <line x1="7" y1="10" x2="11" y2="16" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="25" y1="21" x2="21" y2="15" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

          {/* Hydration Vest on Back */}
          <rect
            x="11.5"
            y="17"
            width="9"
            height="7"
            rx="2.5"
            fill="#0F172A"
            stroke="#0F172A"
            strokeWidth="1.8"
          />

          {/* Athletic Torso */}
          <path
            d="M10 15.5c0-3.5 2.5-6 6-6s6 2.5 6 6-2.5 3-6 3-6 0-6-3z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Head & Visor */}
          <circle cx="16" cy="11.5" r="3.6" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />
          <path d="M14 8.5h4l-2-2.5-2 2.5z" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'mountaineer',
    name: 'Alpine Mountaineer',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Technical climber with ice axe & heavy pack',
    description: 'Top-down alpine climber with technical helmet, rucksack, and forward ice axe.',
    badge: 'Alpine',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Technical Ice Axe Held Forward */}
          <line x1="25" y1="4" x2="22" y2="18" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          {/* Ice Axe Pick Head */}
          <path d="M22 4h6l-3 2z" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />

          {/* Heavy Mountaineering Pack */}
          <rect
            x="10.5"
            y="17.5"
            width="11"
            height="10"
            rx="3"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Coiled Climbing Rope on Pack */}
          <ellipse cx="16" cy="22.5" rx="3.5" ry="2" fill={accent} stroke="#0F172A" strokeWidth="1.5" />

          {/* Parka Shoulders */}
          <path
            d="M9 16c0-4 3-7 7-7s7 3 7 7-3 3-7 3-7 0-7-3z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Climbing Helmet */}
          <circle cx="16" cy="12.5" r="4.2" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />
          <rect x="15" y="8.5" width="2" height="7" rx="1" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'desert-nomad',
    name: 'Safari Ranger / Scout',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Expedition field guide with walking staff',
    description: 'Top-down safari ranger with campaign hat, field staff, and utility vest.',
    badge: 'Field',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Walking Staff */}
          <line x1="7" y1="2" x2="7" y2="29" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />

          {/* Field Pack */}
          <rect
            x="11"
            y="17"
            width="10"
            height="8"
            rx="2.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Field Vest */}
          <path
            d="M9.5 16c0-4 2.5-7 6.5-7s6.5 3 6.5 7-2.5 3-6.5 3-6.5 0-6.5-3z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Wide-Brim Sun Hat */}
          <ellipse cx="16" cy="12" rx="6.5" ry="6.5" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />
          <ellipse cx="16" cy="12" rx="3.5" ry="3.5" fill={accent} stroke="#0F172A" strokeWidth="1.6" />
        </svg>
      );
    },
  },
  {
    id: 'wanderer',
    name: 'Minimalist Traveler',
    category: 'human',
    defaultMode: 'hike',
    tagline: 'Clean urban explorer with daypack',
    description: 'Top-down minimalist traveler with clean geometry and directional indicator.',
    badge: 'Minimal',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Slim Daypack */}
          <rect
            x="11"
            y="16.5"
            width="10"
            height="8"
            rx="2.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Torso */}
          <path
            d="M10 15c0-3.5 2.5-6 6-6s6 2.5 6 6-2.5 3-6 3-6 0-6-3z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
          />

          {/* Head */}
          <circle cx="16" cy="11" r="3.8" fill="#F1F5F9" stroke="#0F172A" strokeWidth="2" />

          {/* Forward Heading Dot */}
          <circle cx="16" cy="4.5" r="1.5" fill="#0F172A" />
        </svg>
      );
    },
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Forward Trampoline Netting */}
          <line x1="10" y1="8" x2="22" y2="8" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
          <line x1="10" y1="11" x2="22" y2="11" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="1.5 1.5" />

          {/* Central Bridge Salon */}
          <rect
            x="10"
            y="12"
            width="12"
            height="11"
            rx="2.5"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Bridge Windows */}
          <rect x="12" y="14" width="8" height="3" rx="1" fill="#0F172A" />

          {/* Left Hull */}
          <path
            d="M6 5c1 4 2 15 2.5 22h3c-.5-7-1.5-18-2.5-22z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Right Hull */}
          <path
            d="M26 5c-1 4-2 15-2.5 22h-3c.5-7 1.5-18 2.5-22z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    },
  },
  {
    id: 'boat-yacht',
    name: 'Modern Ocean Yacht',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Sculpted motor yacht with teak deck',
    description: 'Top-down motor yacht with pointed razor bow, teak deck, and flybridge.',
    badge: 'Luxury',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Yacht Hull */}
          <path
            d="M16 3C11 7 6.5 15 6.5 26h19C25.5 15 21 7 16 3z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Teak Foredeck Accent */}
          <path
            d="M16 6.5L10 13h12L16 6.5z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />

          {/* Flybridge Superstructure */}
          <rect
            x="10.5"
            y="15"
            width="11"
            height="8.5"
            rx="2"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.9"
          />
          {/* Wraparound Glass */}
          <path
            d="M11.5 16h9v3h-9z"
            fill="#0F172A"
          />

          {/* Aft Swim Platform */}
          <line x1="8" y1="26" x2="24" y2="26" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    },
  },
  {
    id: 'boat-speedboat',
    name: 'Zodiac / RIB Speedboat',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Fast inflatable expedition collar tender',
    description: 'Top-down deep-V hull with thick inflatable collar tube and twin outboards.',
    badge: 'Agile',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Twin Outboards */}
          <rect x="9.5" y="25" width="3.5" height="4" rx="1" fill="#0F172A" />
          <rect x="19" y="25" width="3.5" height="4" rx="1" fill="#0F172A" />

          {/* Inflatable Collar Tube & Hull */}
          <path
            d="M16 4C11 7 7.5 14 7.5 24h17C24.5 14 21 7 16 4z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Inner Floorboard Deck */}
          <path
            d="M16 8c-3 2.5-5 7-5 13.5h10C21 15 19 10.5 16 8z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.8"
          />

          {/* Steering Console */}
          <rect x="13.5" y="14" width="5" height="4" rx="1" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'boat-sailboat',
    name: 'Ocean Sloop / Sailboat',
    category: 'watercraft',
    defaultMode: 'boat',
    tagline: 'Single-hull offshore sailing yacht',
    description: 'Top-down sailing hull with teak cockpit, mast, and mainsail boom.',
    badge: 'Sail',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Hull */}
          <path
            d="M16 3C11 7 7 15 7 26.5h18C25 15 21 7 16 3z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Cockpit in Accent Color */}
          <path
            d="M11 17h10l-1 6.5h-8z"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.6"
          />

          {/* Mainsail Boom */}
          <line x1="16" y1="11" x2="16" y2="24" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

          {/* Mast Step */}
          <circle cx="16" cy="11" r="2.2" fill={accent} stroke="#0F172A" strokeWidth="1.8" />
        </svg>
      );
    },
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Main Tapered Locomotive */}
          <path
            d="M16 3c-4.5 0-6.5 4.5-6.5 10v15h13V13c0-5.5-2-10-6.5-10z"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* High-Speed Dual Livery Stripes */}
          <rect x="10.5" y="11" width="2" height="17" fill={accent} />
          <rect x="19.5" y="11" width="2" height="17" fill={accent} />

          {/* Aerodynamic Cockpit Glass Chevron */}
          <path
            d="M13 8.5c1.5-1.5 4.5-1.5 6 0l1 2.5h-8z"
            fill="#0F172A"
          />

          {/* Roof Fairing */}
          <rect x="14" y="15" width="4" height="8" rx="1.5" fill={accent} stroke="#0F172A" strokeWidth="1.5" />
        </svg>
      );
    },
  },
  {
    id: 'train-scenic',
    name: 'Glacier Panorama Express',
    category: 'rail',
    defaultMode: 'train',
    tagline: 'Alpine scenic rail with curved glass dome roofs',
    description: 'Top-down mountain rail car with panoramic observation glass windows.',
    badge: 'Scenic',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Carriage Body */}
          <rect
            x="8"
            y="4"
            width="16"
            height="24"
            rx="4"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Dual Panoramic Glass Domes */}
          <rect
            x="10.5"
            y="6.5"
            width="11"
            height="8"
            rx="2"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          <rect
            x="10.5"
            y="17"
            width="11"
            height="8"
            rx="2"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
          {/* Center Walkway Line */}
          <line x1="16" y1="4" x2="16" y2="28" stroke="#0F172A" strokeWidth="1.5" />
        </svg>
      );
    },
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
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Front Wheel */}
          <rect x="14.5" y="2.5" width="3" height="7.5" rx="1.5" fill="#0F172A" />
          {/* Rear Wheel */}
          <rect x="14.5" y="22" width="3" height="7.5" rx="1.5" fill="#0F172A" />

          {/* Drop Handlebars */}
          <path
            d="M8 8.5c0-1.5 2-2 4-2h8c2 0 4 .5 4 2"
            stroke="#0F172A"
            strokeWidth="2.3"
            strokeLinecap="round"
          />

          {/* Frame Top Tube in Accent */}
          <line x1="16" y1="7.5" x2="16" y2="23" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />

          {/* Bikepacking Frame Bag */}
          <rect
            x="13.5"
            y="11.5"
            width="5"
            height="6.5"
            rx="1.5"
            fill="#F1F5F9"
            stroke="#0F172A"
            strokeWidth="1.8"
          />

          {/* Saddle */}
          <ellipse cx="16" cy="19.5" rx="2.5" ry="3.5" fill="#0F172A" />
        </svg>
      );
    },
  },
  {
    id: 'bike-ebike',
    name: 'Modern Commuter E-Bike',
    category: 'cycling',
    defaultMode: 'bicycle',
    tagline: 'Clean urban bicycle with integrated battery',
    description: 'Top-down city bicycle with flat bars and integrated frame battery.',
    badge: 'Urban',
    renderSvg: ({ className = 'w-5 h-5', color = '#F59E0B', size = 24 }) => {
      const accent = color === 'currentColor' ? '#F59E0B' : color;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
        >
          {/* Wheels */}
          <rect x="14.5" y="3" width="3" height="7" rx="1.5" fill="#0F172A" />
          <rect x="14.5" y="22" width="3" height="7" rx="1.5" fill="#0F172A" />

          {/* Flat Handlebars */}
          <line x1="8" y1="8" x2="24" y2="8" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="8" cy="8" r="1.3" fill={accent} />
          <circle cx="24" cy="8" r="1.3" fill={accent} />

          {/* Frame & Battery Tube */}
          <rect
            x="14"
            y="9"
            width="4"
            height="10"
            rx="1.5"
            fill={accent}
            stroke="#0F172A"
            strokeWidth="1.8"
          />

          {/* Saddle */}
          <ellipse cx="16" cy="20" rx="2.5" ry="3" fill="#0F172A" />
        </svg>
      );
    },
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
