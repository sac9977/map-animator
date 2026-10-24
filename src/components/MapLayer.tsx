import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Check, Mountain, Compass, Map as MapIcon, Globe } from 'lucide-react';
import { MapTileStyle } from '../types/travel';

interface MapLayerProps {
  map: L.Map | null;
  activeStyle: MapTileStyle;
  onStyleChange: (style: MapTileStyle) => void;
}

export interface MapThemeConfig {
  id: MapTileStyle;
  name: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  attribution: string;
}

export const MAP_THEMES: Record<MapTileStyle, MapThemeConfig> = {
  'cinematic-voyager': {
    id: 'cinematic-voyager',
    name: 'Cinematic Voyager',
    subtitle: 'High-contrast satellite & terrain hillshade in #E2DBD0 bone & #0E6466 teal',
    icon: Compass,
    attribution: 'Imagery &copy; Esri, USGS, Maxar | Hillshade &copy; Esri | Cartography &copy; MapAnimator',
  },
  opentopomap: {
    id: 'opentopomap',
    name: 'OpenTopoMap Terrain',
    subtitle: 'SRTM elevation contours & topographic relief',
    icon: Mountain,
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; OpenTopoMap',
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Community',
    subtitle: 'Official open-source community basemap',
    icon: MapIcon,
    attribution: '&copy; OpenStreetMap contributors',
  },
  outdoor: {
    id: 'outdoor',
    name: 'CyclOSM Wilderness',
    subtitle: 'Hiking trails, footpaths & outdoor tracks',
    icon: Compass,
    attribution: '&copy; OpenStreetMap contributors &copy; CyclOSM',
  },
  satellite: {
    id: 'satellite',
    name: 'Global Satellite',
    subtitle: 'High-resolution true-color satellite photography',
    icon: Globe,
    attribution: 'Tiles &copy; Esri, Earthstar Geographics',
  },
};

export const MapLayer: React.FC<MapLayerProps> = ({
  map,
  activeStyle,
  onStyleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeLayersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous layers
    activeLayersRef.current.forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    activeLayersRef.current = [];

    if (activeStyle === 'cinematic-voyager') {
      // 1. Setup custom Leaflet Panes for high-contrast multi-layer blending
      if (!map.getPane('cinematic-sat-pane')) {
        const satPane = map.createPane('cinematic-sat-pane');
        satPane.style.zIndex = '200';
        satPane.className = 'leaflet-pane leaflet-tile-pane leaflet-zoom-animated leaflet-cinematic-sat-pane';
      }

      if (!map.getPane('cinematic-hillshade-pane')) {
        const hillPane = map.createPane('cinematic-hillshade-pane');
        hillPane.style.zIndex = '201';
        hillPane.className = 'leaflet-pane leaflet-tile-pane leaflet-zoom-animated leaflet-cinematic-hillshade-pane';
      }

      if (!map.getPane('cinematic-labels-pane')) {
        const labelPane = map.createPane('cinematic-labels-pane');
        labelPane.style.zIndex = '202';
        labelPane.className = 'leaflet-pane leaflet-tile-pane leaflet-zoom-animated leaflet-cinematic-labels-pane';
      }

      // 2. Base Satellite Layer
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: MAP_THEMES['cinematic-voyager'].attribution,
          maxZoom: 19,
          pane: 'cinematic-sat-pane',
          keepBuffer: 6,
          updateWhenZooming: false, // no tile repaint on every integer zoom cross
        }
      ).addTo(map);

      // 3. Multi-directional Elevation Hillshade Layer (providing sculptural relief shadows and bone-white ridges)
      const hillshadeLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          opacity: 0.72,
          pane: 'cinematic-hillshade-pane',
          keepBuffer: 6,
          updateWhenZooming: false,
        }
      ).addTo(map);

      // 4. Subtle Boundaries & Reference Placenames Layer
      const labelLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.85,
          pane: 'cinematic-labels-pane',
          keepBuffer: 6,
          updateWhenZooming: false,
        }
      ).addTo(map);

      activeLayersRef.current = [satLayer, hillshadeLayer, labelLayer];
    } else if (activeStyle === 'opentopomap') {
      const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: MAP_THEMES.opentopomap.attribution,
        maxZoom: 17,
        subdomains: 'abc',
        keepBuffer: 6,
        updateWhenZooming: false,
      }).addTo(map);
      activeLayersRef.current = [topoLayer];
    } else if (activeStyle === 'outdoor') {
      const outdoorLayer = L.tileLayer(
        'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        {
        attribution: MAP_THEMES.outdoor.attribution,
        maxZoom: 18,
        subdomains: 'abc',
        keepBuffer: 6,
        updateWhenZooming: false,
        }
      ).addTo(map);
      activeLayersRef.current = [outdoorLayer];
    } else if (activeStyle === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
        attribution: MAP_THEMES.satellite.attribution,
        maxZoom: 19,
        keepBuffer: 6,
        updateWhenZooming: false,
        }
      ).addTo(map);
      activeLayersRef.current = [satLayer];
    } else {
      // Standard OSM
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: MAP_THEMES.osm.attribution,
        maxZoom: 19,
        subdomains: 'abc',
        keepBuffer: 6,
        updateWhenZooming: false,
      }).addTo(map);
      activeLayersRef.current = [osmLayer];
    }
  }, [map, activeStyle]);

  const currentTheme = MAP_THEMES[activeStyle];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="absolute top-4 left-4 z-20">
      {/* Active Theme Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-[#E6E1D7] hover:border-[#0E6466] rounded-xl text-xs font-bold text-stone-800 shadow-md hover:shadow-lg transition-all"
        title="Change map style"
      >
        <CurrentIcon className="w-4 h-4 text-[#0E6466]" />
        <span>{currentTheme.name}</span>
        <span className="text-[10px] text-[#F59E0B] font-mono font-bold bg-[#FAF8F5] px-1 rounded border border-[#E6E1D7]">
          {activeStyle === 'cinematic-voyager' ? 'HD Voyager' : 'Layer'}
        </span>
      </button>

      {/* Floating Theme Selection Drawer */}
      {isOpen && (
        <div className="mt-2 bg-white/95 backdrop-blur-md border border-[#E6E1D7] rounded-2xl shadow-xl p-2 w-72 divide-y divide-stone-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6466]">
              Cartography Themes
            </span>
            <span className="text-[10px] text-stone-400 font-mono">Zero API Keys</span>
          </div>

          <div className="space-y-1 pt-1">
            {(Object.keys(MAP_THEMES) as MapTileStyle[]).map((key) => {
              const theme = MAP_THEMES[key];
              const isSelected = activeStyle === key;
              const Icon = theme.icon;

              return (
                <button
                  key={key}
                  onClick={() => {
                    onStyleChange(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between group ${
                    isSelected
                      ? 'bg-[#0E6466]/10 text-[#0E6466] ring-1 ring-[#0E6466]/30'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#0E6466] text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">
                        {theme.name}
                      </span>
                      <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                        {theme.subtitle}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#0E6466] shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
