# MapAnimator — Explorer Studio

An animated travel map and journey visualization studio built with React 19, TypeScript, Vite, Tailwind CSS, and Leaflet. Designed for creating cinematic expedition routes, travel animations, and multi-leg journey videos.

![MapAnimator Banner](public/icons/icon-512x512.png)

## Key Features

- **Cinematic Route Choreography**: Multi-leg journey routing with sub-pixel vehicle interpolation and 60fps frame-synced camera tracking.
- **Buttery-Smooth Fractional Zooming**: Zero integer snapping (`zoomSnap: 0`), calibrated trackpad/wheel inertia, and hardware-accelerated canvas transforms synchronized with map tile scaling.
- **Multiple Transport Modes**: Custom vector vehicle drawers with realistic motion dynamics, altitude parabolas, and dust/spray particle trails:
  - 🚙 4x4 Overland Safari Vehicle
  - ✈️ Expedition Aircraft with flight altitude arcs
  - ⛵ Sailing Yacht with sea trails
  - 🥾 Wilderness Trekker with dashed expedition tracks
- **Curated Expeditions**: Instant-load journey presets:
  - *Serengeti Great Migration (Tanzania)*
  - *Patagonian Fjords & Glaciers (Chile & Argentina)*
  - *Silk Road Caravanserai (Central Asia)*
  - *Trans-Himalaya High Passes (Nepal & Tibet)*
- **Historical Weather & Climate Analysis**: Meteorological overlay analyzing historical temperatures, precipitation, and seasonal climate conditions across journey waypoints.
- **Multi-Layer Cartography**:
  - *Cinematic Voyager*: High-contrast composite of satellite imagery, multi-directional elevation hillshade relief, and subtle reference cartography in warm bone `#E2DBD0` and deep teal `#0E6466`.
  - *OpenTopoMap*: SRTM elevation contours and topographic relief.
  - *CyclOSM Wilderness*: Outdoor footpaths, trails, and contour topography.
  - *Global Satellite*: True-color satellite photography.
  - *OpenStreetMap Community*: Standard open-source community basemap.
- **Interactive Route Builder**: Add journey legs, pick coordinates directly on the map, draw custom wilderness treks, and customize vehicle colors and scales.
- **Timeline & Playback Controls**: Scrubbable timeline with pause-at-destination pacing, variable playback speeds (0.5x to 4x), and dynamic camera zoom toggles.
- **Video Export Studio**: Client-side canvas video recording with resolution presets (1080p, 4K, Reels/TikTok 9:16) and framerate options (30fps, 60fps).
- **Progressive Web App (PWA)**: Installable as a native desktop application with offline caching.

---

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm / yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/map-animator.git

# Navigate into the project folder
cd map-animator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Mapping Engine**: Leaflet 1.9 with custom multi-pane tile compositing
- **Graphics**: HTML5 Canvas 2D with sub-pixel interpolation
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **PWA**: vite-plugin-pwa

---

## License

MIT License. Free for personal and commercial expedition mapping.
