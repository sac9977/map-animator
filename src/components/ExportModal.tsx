import React, { useState } from 'react';
import { X, Film, CheckCircle, Download, Loader2, Sparkles, Monitor, Smartphone, Square } from 'lucide-react';
import { AspectRatio, JourneyLeg, VideoExportConfig, VideoResolution, Waypoint } from '../types/travel';
import {
  CLOSE_ZOOM_FLIGHT,
  CLOSE_ZOOM_GROUND,
  transitZoomFor,
  lngToGlobalPx,
  latToGlobalPx,
} from '../utils/cameraZoom';
import { drawAnimatedVehicle } from '../utils/vehicleDrawers';
import { calculateBearing, toRad } from '../utils/geoRouting';
import { hexToRgba, getDefaultTrailColorForMode } from '../data/trailStyles';
import { useModalA11y } from '../hooks/useModalA11y';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeBase: Waypoint;
  legs: JourneyLeg[];
  aspectRatio: AspectRatio;
  setAspectRatio: (r: AspectRatio) => void;
  resolution: VideoResolution;
  setResolution: (r: VideoResolution) => void;
  zoomOutBias: number;
  setZoomOutBias: (b: number) => void;
}

// Real basemap layers composited into the export background — mirrors the app's
// default 'Cinematic Voyager' style (satellite imagery + hillshade + labels).
// Both Esri endpoints send permissive CORS headers, so we can draw them
// cross-origin into the recording canvas (crossOrigin='anonymous').
// grade mirrors the live map's pane CSS filters (.leaflet-cinematic-*-pane in
// index.css); blend replicates the hillshade's mix-blend-mode, which is what
// keeps the imagery visible through the relief shading.
const EXPORT_TILE_LAYERS: {
  url: string;
  opacity: number;
  maxZoom: number;
  grade?: string;
  blend?: GlobalCompositeOperation;
  /** Labels are placed differently at every zoom — drawing two zoom levels
   * during the cross-fade ghosts them. Skip coarse passes for this layer. */
  noCoarse?: boolean;
}[] = [
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opacity: 1,
    maxZoom: 19,
    grade: 'brightness(0.94) contrast(1.26) saturate(0.82) sepia(0.18) hue-rotate(-8deg)',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    opacity: 0.72,
    maxZoom: 18,
    blend: 'multiply',
    grade: 'contrast(1.45) brightness(1.08)',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    opacity: 0.85,
    maxZoom: 19,
    grade: 'contrast(1.3)',
    noCoarse: true,
  },
];

const TILE_SIZE = 256;
const MAX_TILES_PER_LAYER = 72;

// Total tile budget across every layer for the dynamic-zoom camera pyramid
// (unique tiles only; keeps memory and network sane for a full render)
const MAX_TOTAL_TILES = 3600;

// Camera constants + Mercator helpers live in utils/cameraZoom, shared with
// MapViewport so the live preview shows exactly the framing the video renders.
// The final leg glides in only part way — eased to a slightly wider arrival
// so pale coastal imagery (e.g. ferry arrivals) keeps depth and colour.
const FINAL_LEG_ARRIVAL = 0.4;
// 12 frames ≈ 0.4s @30fps — frame-based so the fade spans the
// same number of RECORDED frames regardless of compositing speed.
const TILE_FADE_FRAMES = 12;

export const RESOLUTION_DIMS: Record<AspectRatio, Record<VideoResolution, { width: number; height: number }>> = {
  '16:9': {
    '4K': { width: 3840, height: 2160 },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
  },
  '9:16': {
    '4K': { width: 2160, height: 3840 },
    '1080p': { width: 1080, height: 1920 },
    '720p': { width: 720, height: 1280 },
  },
  '1:1': {
    '4K': { width: 2160, height: 2160 },
    '1080p': { width: 1080, height: 1080 },
    '720p': { width: 720, height: 720 },
  },
  '4:5': {
    '4K': { width: 2160, height: 2700 },
    '1080p': { width: 1080, height: 1350 },
    '720p': { width: 720, height: 900 },
  },
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  homeBase,
  legs,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  zoomOutBias,
  setZoomOutBias,
}) => {
  const [fps, setFps] = useState<30 | 60>(30);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [useDynamicZoom, setUseDynamicZoom] = useState(true);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const dialogRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const currentDims = RESOLUTION_DIMS[aspectRatio][resolution];

  // Export the journey to video. The camera mirrors the map's Dynamic Zoom
  // choreography (damped follow-cam, close-ups at leg starts/stops, pulled
  // back during transit). Tiles are drawn into the recording canvas on demand
  // from a request cache at whichever zoom level the camera asks for, capped
  // per layer by each source's deepest supported mosaic.
  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    const totalLegsDuration = legs.reduce(
      (sum, leg) => sum + leg.durationSeconds + leg.pauseAtDestinationSeconds,
      0
    );
    const duration = Math.max(4, totalLegsDuration);
    const totalFrames = Math.round(duration * fps);
    const W = currentDims.width;
    const H = currentDims.height;

    // Timer-throttling escape hatch: when the preview tab is hidden, page
    // setTimeout is clamped to ~1 s, which obliterates the wall-clock pacing
    // (the recorder then stretches the journey to minutes at ~1 fps). Worker
    // timers are not throttled, so every wait goes through a tiny worker.
    const paceWorker = new Worker(
      URL.createObjectURL(
        new Blob(['onmessage=(e)=>setTimeout(()=>postMessage(e.data),e.data);'], {
          type: 'text/javascript',
        })
      )
    );
    const paced = (ms: number) =>
      new Promise<void>((resolve) => {
        paceWorker.onmessage = () => resolve();
        paceWorker.postMessage(ms);
      });

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }
    // Richer texture capture: draw levels are ceil-based (tiles are
    // downsampled, never upscaled), so resampling quality matters.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Bounding box of the whole journey (drives the route-overview camera)
    const allCoords: [number, number][] = [[homeBase.lat, homeBase.lng]];
    legs.forEach((l) => {
      if (l.cachedPath) allCoords.push(...l.cachedPath);
    });

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    allCoords.forEach(([lat, lng]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    const latSpan = Math.max(0.05, (maxLat - minLat) * 1.3);
    const lngSpan = Math.max(0.05, (maxLng - minLng) * 1.3);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const topLat = Math.max(-85, Math.min(85, centerLat + latSpan / 2));
    const bottomLat = Math.max(-85, Math.min(85, centerLat - latSpan / 2));
    const leftLng = centerLng - lngSpan / 2;
    const rightLng = centerLng + lngSpan / 2;

    // Route-overview framing (MUST match the old static export exactly so the
    // camera can start wide and glide in, and so toggle-off reproduces the
    // original framing).
    let fitZoom = 3;
    for (let z = 3; z <= 11; z++) {
      const ws = TILE_SIZE * Math.pow(2, z);
      const nx =
        Math.floor(lngToGlobalPx(rightLng, ws) / TILE_SIZE) -
        Math.floor(lngToGlobalPx(leftLng, ws) / TILE_SIZE) +
        1;
      const ny =
        Math.floor(latToGlobalPx(bottomLat, ws) / TILE_SIZE) -
        Math.floor(latToGlobalPx(topLat, ws) / TILE_SIZE) +
        1;
      if (nx * ny > MAX_TILES_PER_LAYER) break;
      fitZoom = z;
    }
    const wsFit = TILE_SIZE * Math.pow(2, fitZoom);
    const gxLeftFit = lngToGlobalPx(leftLng, wsFit);
    const gyTopFit = latToGlobalPx(topLat, wsFit);
    const spanXFit = lngToGlobalPx(rightLng, wsFit) - gxLeftFit;
    const spanYFit = latToGlobalPx(bottomLat, wsFit) - gyTopFit;
    const fitScale = Math.min(W / spanXFit, H / spanYFit);
    const routeCam = {
      lat: centerLat,
      lng: centerLng,
      zoom: fitZoom + Math.log2(fitScale),
    };

    // ---- Camera choreography ----
    // Targets come from per-leg keyframes (departure close-up, mid-leg transit
    // pull-back, arrival glide-in) interpolated with cubic Hermite curves —
    // C¹-continuous, so there are no velocity spikes or whip-zooms at leg
    // boundaries. Shifts applied only to satisfy the tile budget: the transit
    // framing pays first (it is the widest, most tile-hungry view) while the
    // close-up framing keeps its native depth so departure/arrival shots
    // capture the map's rich texture.
    let zoomShift = 0;
    let closeShift = 0;
    let dynamicZoom = useDynamicZoom;

    const zoomsFor = (leg: JourneyLeg) => {
      const isFlight = leg.mode === 'flight';
      const close = Math.max(2, (isFlight ? CLOSE_ZOOM_FLIGHT : CLOSE_ZOOM_GROUND) - closeShift);
      // Per-leg trim (set in the leg editor) wins; legs on Auto (0/untouched)
      // fall back to the export modal's zoom-out slider.
      const bias = leg.zoomBias || zoomOutBias;
      return { over: transitZoomFor(leg, W, H, bias, closeShift, TILE_SIZE), close };
    };

    const pathAt = (leg: JourneyLeg, t: number) => {
      if (leg.cachedPath && leg.cachedPath.length >= 2) {
        const path = leg.cachedPath;
        const f = t * (path.length - 1);
        const lo = Math.floor(f);
        const hi = Math.min(path.length - 1, lo + 1);
        const fr = f - lo;
        return {
          lat: path[lo][0] + (path[hi][0] - path[lo][0]) * fr,
          lng: path[lo][1] + (path[hi][1] - path[lo][1]) * fr,
        };
      }
      return { lat: leg.to.lat, lng: leg.to.lng };
    };

    // Keyframes over the whole journey: leg start (departure close-up), leg
    // midpoint (transit overview), leg end (arrival zoom). The final leg's
    // arrival glides in only part of the way (FINAL_LEG_ARRIVAL) so light
    // coastal imagery keeps depth and colour.
    interface CamKey { t: number; lat: number; lng: number; zoom: number; }
    let camKeys: CamKey[] = [];
    const buildCamKeys = () => {
      camKeys = [];
      if (legs.length === 0) {
        camKeys.push({ t: 0, ...routeCam });
        return;
      }
      let accumulated = 0;
      legs.forEach((leg, i) => {
        const dur = leg.durationSeconds;
        const legTotal = dur + leg.pauseAtDestinationSeconds;
        if (legTotal > 0.05) {
          const { over, close } = zoomsFor(leg);
          const start = pathAt(leg, 0);
          const isLast = i === legs.length - 1;
          const arrival = isLast ? over + FINAL_LEG_ARRIVAL * (close - over) : close;
          if (camKeys.length === 0 || camKeys[camKeys.length - 1].t < accumulated) {
            // Between-legs glide: the pause repositions the camera from the
            // previous arrival to this departure. At close-up zoom that pan
            // strobes across the intervening ground, so pull out mid-pause
            // to fit the gap's span — zoom out, glide, zoom back in.
            const prev = camKeys[camKeys.length - 1];
            const pauseT = prev ? accumulated - prev.t : 0;
            if (prev && pauseT > 1) {
              const gws = TILE_SIZE;
              const gx = lngToGlobalPx(start.lng, gws) - lngToGlobalPx(prev.lng, gws);
              const gy = latToGlobalPx(start.lat, gws) - latToGlobalPx(prev.lat, gws);
              const gapFit = Math.log2((Math.min(W, H) * 0.6) / Math.max(Math.hypot(gx, gy), 1e-6));
              camKeys.push({
                t: prev.t + pauseT / 2,
                lat: (prev.lat + start.lat) / 2,
                lng: (prev.lng + start.lng) / 2,
                zoom: Math.max(2, Math.min(prev.zoom, close, gapFit)),
              });
            }
            camKeys.push({ t: accumulated, lat: start.lat, lng: start.lng, zoom: close });
          }
          if (dur > 0.05) {
            // Intermediate keys sit ON the route path (not the chord between
            // waypoints), so the camera tracks curved legs and the vehicle
            // never leaves the frame mid-transit.
            [0.25, 0.5, 0.75].forEach((frac) => {
              const p = pathAt(leg, frac);
              camKeys.push({ t: accumulated + dur * frac, lat: p.lat, lng: p.lng, zoom: over });
            });
            camKeys.push({
              t: accumulated + dur,
              lat: leg.to.lat,
              lng: leg.to.lng,
              zoom: arrival,
            });
          }
        }
        accumulated += legTotal;
      });
      if (camKeys.length === 0) camKeys.push({ t: 0, ...routeCam });
    };

    // Cubic Hermite (finite-difference Catmull-Rom tangents) between adjacent
    // keys — smooth in position AND zoom, evaluable at any timestamp.
    const hermite = (u: number, p1: number, p2: number, m1: number, m2: number) => {
      const u2 = u * u;
      const u3 = u2 * u;
      return (
        (2 * u3 - 3 * u2 + 1) * p1 +
        (u3 - 2 * u2 + u) * m1 +
        (-2 * u3 + 3 * u2) * p2 +
        (u3 - u2) * m2
      );
    };

    const cameraTargetAt = (timeSec: number): { lat: number; lng: number; zoom: number } => {
      if (camKeys.length === 1) return { ...camKeys[0] };
      let i1 = 0;
      while (i1 < camKeys.length - 2 && timeSec > camKeys[i1 + 1].t) i1++;
      const k1 = camKeys[i1];
      const k2 = camKeys[i1 + 1];
      const k0 = camKeys[i1 - 1] ?? k1;
      const k3 = camKeys[i1 + 2] ?? k2;
      const span = Math.max(k2.t - k1.t, 1e-6);
      const u = Math.min(Math.max(0, (timeSec - k1.t) / span), 1);
      const lerpTangent = (c0: number, c2: number, t0: number, t2: number) => {
        const dt = Math.max(t2 - t0, 1e-3);
        return ((c2 - c0) / dt) * span;
      };
      const lat = hermite(
        u,
        k1.lat,
        k2.lat,
        k1.lat === k2.lat && k2.t === k1.t ? 0 : lerpTangent(k0.lat, k2.lat, k0.t, k2.t),
        k1.lat === k2.lat && k2.t === k1.t ? 0 : lerpTangent(k1.lat, k3.lat, k1.t, k3.t)
      );
      const lng = hermite(
        u,
        k1.lng,
        k2.lng,
        k1.lng === k2.lng && k2.t === k1.t ? 0 : lerpTangent(k0.lng, k2.lng, k0.t, k2.t),
        k1.lng === k2.lng && k2.t === k1.t ? 0 : lerpTangent(k1.lng, k3.lng, k1.t, k3.t)
      );
      const zoomRaw = hermite(
        u,
        k1.zoom,
        k2.zoom,
        k1.zoom === k2.zoom && k2.t === k1.t ? 0 : lerpTangent(k0.zoom, k2.zoom, k0.t, k2.t),
        k1.zoom === k2.zoom && k2.t === k1.t ? 0 : lerpTangent(k1.zoom, k3.zoom, k1.t, k3.t)
      );
      // Pull-back safety floor: never frame wider than the route overview.
      // The pre-spawned base tile levels cover exactly this framing, so the
      // camera can never reveal un-tiled area (beige fallback or a mosaic
      // edge) when it pulls back mid-transit.
      const z = zoomRaw;
      return { lat, lng, zoom: Math.max(z, routeCam.zoom) };
    };

    // Visible integer-tile window at the camera's fractional zoom, projected
    // into a given layer's zoom level (integer).
    const visibleTileRange = (
      cam: { lat: number; lng: number; zoom: number },
      zLayer: number
    ) => {
      const n = 1 << zLayer;
      const camWorld = TILE_SIZE * Math.pow(2, cam.zoom);
      const camX = lngToGlobalPx(cam.lng, camWorld);
      const camY = latToGlobalPx(cam.lat, camWorld);
      // World px covered by one tile of this layer's zoom when scaled up or
      // down by (cam.zoom - zLayer) levels.
      const tileWorld = TILE_SIZE * Math.pow(2, cam.zoom - zLayer);
      const x0 = Math.max(0, Math.floor((camX - W / 2) / tileWorld));
      const x1 = Math.min(n - 1, Math.floor((camX + W / 2) / tileWorld));
      const y0 = Math.max(0, Math.floor((camY - H / 2) / tileWorld));
      const y1 = Math.min(n - 1, Math.floor((camY + H / 2) / tileWorld));
      return { n, x0, x1, y0, y1, tileWorld, camX, camY };
    };

    // Deepest drawable integer level for a camera zoom. At close range (z ≥
    // 8) ceil() keeps tiles downsampled — never upscaled — so texture stays
    // crisp at fractional zooms. At wide views round() stays: upsampling a
    // 1080p pixel there is invisible, and ceil would roughly double the tile
    // budget of every transit pull-back.
    const levelFor = (layer: { maxZoom: number }, camZoom: number) =>
      Math.max(
        1,
        Math.min(layer.maxZoom, camZoom >= 8 ? Math.ceil(camZoom) : Math.round(camZoom))
      );

    // Estimate unique tile downloads across every layer for candidate zoom
    // shifts. Synchronous — sets both shifts and rebuilds keyframes so the
    // cameraTargetAt picks them up.
    const estimateCameraTiles = (shift = zoomShift, cShift = closeShift): number => {
      zoomShift = shift;
      closeShift = cShift;
      buildCamKeys();
      const unions = EXPORT_TILE_LAYERS.map(() => new Set<string>());
      const step = Math.max(1, Math.floor(totalFrames / 90));
      for (let f = 0; f <= totalFrames; f += step) {
        const cam = cameraTargetAt((f / totalFrames) * duration);
        EXPORT_TILE_LAYERS.forEach((layer, li) => {
          const zL = levelFor(layer, cam.zoom);
          const r = visibleTileRange(cam, zL);
          for (let ty = r.y0; ty <= r.y1; ty++) {
            for (let tx = r.x0; tx <= r.x1; tx++) {
              unions[li].add(`${zL}/${tx}/${ty}`);
            }
          }
        });
      }
      return unions.reduce((sum, s) => sum + s.size, 0);
    };

    // Fit the corridor within the total tile budget in two stages so the map's
    // richest detail survives: first pull back the transit framing (the widest
    // view, which dominates the tile count), and only if the rewrite still
    // exceeds the budget lower the close-ups as well.
    if (dynamicZoom) {
      const STAGE1_CAP = 4;
      while (estimateCameraTiles(zoomShift) > MAX_TOTAL_TILES && zoomShift < STAGE1_CAP) {
        zoomShift += 0.5;
      }
      if (estimateCameraTiles(zoomShift) > MAX_TOTAL_TILES) {
        while (closeShift < 3 && estimateCameraTiles(zoomShift, closeShift + 0.5) > MAX_TOTAL_TILES) {
          closeShift += 0.5;
        }
        if (estimateCameraTiles(zoomShift, closeShift) > MAX_TOTAL_TILES) {
          dynamicZoom = false;
        }
      }
      if (!dynamicZoom) {
        zoomShift = 0;
        closeShift = 0;
      }
    }
    // Lock the shift values in and build the final keyframe curve.
    estimateCameraTiles(dynamicZoom ? zoomShift : 0, closeShift);

    // ---- On-demand tile pyramid ----
    const tileCache = new Map<string, Promise<HTMLImageElement | null>>();
    const tileImages = new Map<string, HTMLImageElement | null>();
    // Decoded GPU-resident copy of each tile — decoding during the frame loop
    // would stall the recorder, so every arriving tile is pre-decoded once.
    const tileBitmaps = new Map<string, ImageBitmap | null>();
    // When each tile was first drawn — fine-level tiles cross-fade in over
    // TILE_FADE_MS; tiles pre-warmed during prefetch start fully aged.
    const tileFirstSeen = new Map<string, number>();
    const loadTile = (layerUrl: string, z: number, x: number, y: number, aged = false) => {
      const key = `${layerUrl}|${z}|${x}|${y}`;
      let p = tileCache.get(key);
      if (!p) {
        p = new Promise<HTMLImageElement | null>((resolve) => {
          // Resilient fetch: a single failed request used to silently drop the
          // whole imagery layer from the render (pale hillshade-only frames).
          // Retry a few times, alternating with the mirror Esri host.
          const altUrl = layerUrl.replace('server.arcgisonline', 'services.arcgisonline');
          const urls = [layerUrl, altUrl, layerUrl, altUrl];
          const attempt = (queue: string[]) => {
            if (queue.length === 0) {
              console.warn(`Export tile gave up after retries: z${z}/${x}/${y}`);
              resolve(null);
              return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => setTimeout(() => attempt(queue.slice(1)), 500);
            img.src = queue[0]
              .replace('{z}', String(z))
              .replace('{y}', String(y))
              .replace('{x}', String(x));
          };
          attempt(urls);
        });
        p.then((img) => {
          tileImages.set(key, img);
          if (aged) tileFirstSeen.set(key, Number.NEGATIVE_INFINITY);
          if (img) {
            // Bake the layer grade into the bitmap once instead of running
            // canvas ctx.filter over every tile of every frame — this is what
            // brings per-frame compositing under the real-time frame budget.
            const layer = EXPORT_TILE_LAYERS.find((l) => l.url === layerUrl);
            if (layer?.grade) {
              const c = document.createElement('canvas');
              c.width = TILE_SIZE;
              c.height = TILE_SIZE;
              const g = c.getContext('2d')!;
              g.filter = layer.grade;
              g.drawImage(img, 0, 0);
              createImageBitmap(c)
                .then((bm) => tileBitmaps.set(key, bm))
                .catch(() => tileBitmaps.set(key, null));
            } else {
              createImageBitmap(img)
                .then((bm) => tileBitmaps.set(key, bm))
                .catch(() => tileBitmaps.set(key, null));
            }
          }
        });
        tileCache.set(key, p);
      }
      return p;
    };

    // Pre-spawn the whole camera-corridor's tiles, first-use ordered, so the
    // render paces into mostly-warm caches. Concurrency-capped worker pool.
    // Runs for static exports too: the route-framed background must be warm
    // before frame 0, or every frame fetches tiles inline and stalls pacing.
    {
      const jobs: { layerUrl: string; z: number; x: number; y: number; aged: boolean }[] = [];
      const seen = new Set<string>();
      // Base coverage first: the entire route bbox at the overview zoom and one
      // level deeper. These guarantee every camera position has imagery to draw
      // while corridor tiles (added below) are still arriving.
      const baseLevels = [fitZoom, fitZoom + 1].filter(
        (z) => z >= 1 && z <= Math.min(11, Math.max(...EXPORT_TILE_LAYERS.map((l) => l.maxZoom)))
      );
      for (const bz of baseLevels) {
        const bws = TILE_SIZE * Math.pow(2, bz);
        const bcam = { lat: centerLat, lng: centerLng, zoom: bz };
        const br = visibleTileRange(bcam, bz);
        const count =
          (br.x1 - br.x0 + 1) * (br.y1 - br.y0 + 1);
        if (count > 400) continue; // too wide at this level — skip
        for (let ty = br.y0; ty <= br.y1; ty++) {
          for (let tx = br.x0; tx <= br.x1; tx++) {
            const key = `${bz}/${tx}/${ty}`;
            if (seen.has(key)) continue;
            seen.add(key);
            EXPORT_TILE_LAYERS.forEach((layer) => {
              jobs.push({ layerUrl: layer.url, z: bz, x: tx, y: ty, aged: true });
            });
          }
        }
      }
      for (let f = 0; f <= totalFrames; f += 4) {
        const cam = cameraTargetAt((f / totalFrames) * duration);
        EXPORT_TILE_LAYERS.forEach((layer) => {
          const zL = levelFor(layer, cam.zoom);
          const r = visibleTileRange(cam, zL);
          for (let ty = r.y0; ty <= r.y1; ty++) {
            for (let tx = r.x0; tx <= r.x1; tx++) {
              const key = `${zL}/${tx}/${ty}`;
              if (seen.has(key)) continue;
              seen.add(key);
              jobs.push({ layerUrl: layer.url, z: zL, x: tx, y: ty, aged: false });
            }
          }
        });
      }
      let jobIdx = 0;
      // When the warm-up bound expires, the remaining corridor tiles load
      // on demand from the frame loop instead. The workers must STOP then:
      // a queue that keeps submitting through the recording starves the
      // frame loop's edge tiles behind hundreds of queued requests (the
      // browser serves ~6 per host), which showed as flat fallback bands
      // at the frame's leading edge during transit.
      let prefetchStopped = false;
      const workerCount = 12;
      const worker = async () => {
        while (jobIdx < jobs.length && !prefetchStopped) {
          const j = jobs[jobIdx++];
          await loadTile(j.layerUrl, j.z, j.x, j.y, j.aged);
        }
      };
      const prefetchDone = Promise.all(
        Array.from({ length: workerCount }, () => worker())
      );
      // Warm the FULL pyramid before the recorder starts. MediaRecorder paces
      // in wall-clock time, so a mid-render frame that waits on a network tile
      // shows a frozen canvas — that is the jerky zoom. Bounded to 45 s so a
      // dead network still renders (with the coarse base coverage).
      await Promise.race([
        prefetchDone,
        paced(45000).then(() => {
          prefetchStopped = true;
        }),
      ]);
      // Let pending createImageBitmap decodes settle before frame 0.
      await paced(300);
    }

    // Composite one frame's basemap into the recording canvas: fill fallback,
    // then draw whatever tile pyramid entries are already loaded for a
    // per-layer integer zoom, clamped to each layer's deepest native mosaic.
    // Camera-adjacent fine tiles cross-fade in over the always-complete coarse
    // coverage (a zoom-level change is a soft sharpen instead of a pop). When
    // the fine pass both covers the frame and is fully faded in, the coarse
    // passes are skipped entirely — only the visible layer remains drawn.
    const drawBasemap = (cam: { lat: number; lng: number; zoom: number }, frame: number) => {
      ctx.fillStyle = '#EBE5DA';
      ctx.fillRect(0, 0, W, H);
      EXPORT_TILE_LAYERS.forEach((layer) => {
        const zL = levelFor(layer, cam.zoom);
        // Mirror the live map's per-layer compositing ('Cinematic Voyager'):
        // the grade-filtered draw and the multiply-blended hillshade are what
        // keep the imagery rich instead of buried under plain-alpha shading.
        // Grade is pre-baked into each tile bitmap (see loadTile) — no
        // per-frame ctx.filter, which is what keeps compositing real-time.
        // Reset per layer: without this the label layer inherits the
        // hillshade's 'multiply' and its colors get crushed.
        ctx.globalCompositeOperation = layer.blend ?? 'source-over';
        type Entry = { bm: ImageBitmap | HTMLImageElement; px: number; py: number; size: number; alpha: number };
        const fine: Entry[] = [];
        let fineBlocking = false; // missing tiles or still mid-fade
        const rF = visibleTileRange(cam, zL);
        for (let ty = rF.y0; ty <= rF.y1; ty++) {
          for (let tx = rF.x0; tx <= rF.x1; tx++) {
            const key = `${layer.url}|${zL}|${tx}|${ty}`;
            const img = tileImages.get(key);
            const bm = tileBitmaps.get(key) ?? null;
            if (!tileImages.has(key)) {
              fineBlocking = true;
              if (!tileCache.has(key)) loadTile(layer.url, zL, tx, ty);
              continue;
            }
            if (!img || !bm) {
              fineBlocking = true; // decode not finished yet
              continue;
            }
            let alpha = layer.opacity;
            // Fine (native-level) tiles fade in over the coarse passes;
            // anything warmed before the render starts is pre-aged.
            const seen = tileFirstSeen.get(key);
            if (seen === undefined) {
              tileFirstSeen.set(key, frame);
              alpha = 0;
            } else {
              const f01 = Math.min(1, Math.max(0, (frame - seen) / TILE_FADE_FRAMES));
              alpha *= f01 * f01 * (3 - 2 * f01);
            }
            if (alpha < 0.999) fineBlocking = true;
            fine.push({
              bm,
              px: tx * rF.tileWorld - (rF.camX - W / 2),
              py: ty * rF.tileWorld - (rF.camY - H / 2),
              size: rF.tileWorld + 1, // +1px hides seams
              alpha,
            });
          }
        }
        // Coarse Base Layers sit beneath the fine pass: the preloaded base
        // levels always cover the visible area, so missing corridor tiles or a
        // mid-fade sharpen read as release-soft imagery for a moment instead
        // of a blank fallback color or a hard pop.
        if (fineBlocking && !layer.noCoarse) {
          const passZooms = new Set<number>([fitZoom]);
          if (zL > 1) passZooms.add(zL - 1);
          if (fitZoom + 1 < zL) passZooms.add(fitZoom + 1);
          const passes = [...passZooms]
            .filter((z) => z >= 1 && z < zL)
            .sort((a, b) => a - b);
          for (const zp of passes) {
            const r = visibleTileRange(cam, zp);
            for (let ty = r.y0; ty <= r.y1; ty++) {
              for (let tx = r.x0; tx <= r.x1; tx++) {
                const key = `${layer.url}|${zp}|${tx}|${ty}`;
                const bm = tileBitmaps.get(key) ?? null;
                if (!tileImages.has(key)) {
                  if (!tileCache.has(key)) loadTile(layer.url, zp, tx, ty);
                  continue;
                }
                if (!bm) continue;
                const px = tx * r.tileWorld - (r.camX - W / 2);
                const py = ty * r.tileWorld - (r.camY - H / 2);
                const size = r.tileWorld + 1; // +1px hides seams
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(bm, px, py, size, size);
              }
            }
          }
        }
        for (const e of fine) {
          ctx.globalAlpha = e.alpha;
          ctx.drawImage(e.bm, e.px, e.py, e.size, e.size);
        }
      });
      // Reset per-layer compositing before anything else draws on top.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      // Atmospheric bone & teal tint — mirrors .leaflet-cinematic-overlay-tint.
      const tint = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      tint.addColorStop(0, 'rgba(226, 219, 208, 0.08)');
      tint.addColorStop(1, 'rgba(14, 100, 102, 0.14)');
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    };

    // Camera state (damped follow position + fractional zoom for the frame loop)
    let camCurrent: { lat: number; lng: number; zoom: number } = { ...routeCam };

    // captureStream(0) + explicit requestFrame(): a detached (never-in-DOM)
    // canvas gets no compositor sampling, so captureStream(fps) delivered only
    // a fraction of the drawn frames (~9 fps encoded despite 30 Hz pacing).
    // Manual per-frame capture guarantees one encoded frame per draw.
    const stream = canvas.captureStream(0);
    const captureTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      // Higher bitrate so the encoder doesn't smear the map texture during
      // camera motion (pan + zoom keeps nearly every pixel changing).
      videoBitsPerSecond: resolution === '4K' ? 32_000_000 : 16_000_000,
    });

    const recordedChunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      setDownloadUrl(url);
      setDownloadFilename(`MapAnimator_Journey_${aspectRatio.replace(':', 'x')}_${resolution}.${ext}`);
      setIsRendering(false);
      setRenderProgress(100);
    };

    recorder.start();
    const startedAt = performance.now();

    // Render frame by frame
    for (let frame = 0; frame <= totalFrames; frame++) {
      const progress = frame / totalFrames;
      const currentTimeSec = progress * duration;

      // Camera state: the Hermite target curve is already C¹-smooth in both
      // position and zoom, so the camera tracks it exactly. Exponential damping
      // used to lag behind and then rush to catch up — that lag-and-rush is
      // what read as a jerky zoom. Static keeps the fixed route-overview view.
      if (dynamicZoom) {
        camCurrent = cameraTargetAt(currentTimeSec);
      } else {
        camCurrent = { ...routeCam };
      }

      // Kick off any camera-adjacent native-level tiles (cache-hit returns a
      // settled promise, misses start a background load).
      const frameTileJobs: Promise<HTMLImageElement | null>[] = [];
      EXPORT_TILE_LAYERS.forEach((layer) => {
        const zL = levelFor(layer, camCurrent.zoom);
        const r = visibleTileRange(camCurrent, zL);
        for (let ty = r.y0; ty <= r.y1; ty++) {
          for (let tx = r.x0; tx <= r.x1; tx++) {
            frameTileJobs.push(loadTile(layer.url, zL, tx, ty));
          }
        }
      });
      // Waits are capped: with the pyramid fully warmed this returns instantly,
      // but a single slow tile must never freeze the wall-clock pacing. The
      // cap uses an ordinary page timer — it must NOT go through the pacing
      // worker, where a canceled-looking 300 ms post from every frame would
      // spam the queue and instantly release later real pacing waits.
      // Start any missing tiles loading, but never block the wall-clock
      // pacing on them: a slow or rate-limited tile CDN used to stall the
      // racing inline wait (0-300ms per frame) and produced an 8.96 fps
      // capture with stretched timing. The coarse base coverage plus the
      // cross-fade absorb a late fine tile instead.
      void frameTileJobs;
      drawBasemap(camCurrent, frame);

      // Overlay geometry projected through the same camera transform
      const camWorldSize = TILE_SIZE * Math.pow(2, camCurrent.zoom);
      const camWorldX = lngToGlobalPx(camCurrent.lng, camWorldSize);
      const camWorldY = latToGlobalPx(camCurrent.lat, camWorldSize);
      const lngToScreenX = (lng: number) =>
        W / 2 + (lngToGlobalPx(lng, camWorldSize) - camWorldX);
      const latToScreenY = (lat: number) =>
        H / 2 + (latToGlobalPx(lat, camWorldSize) - camWorldY);

      // Find active leg based on elapsed time
      let accumulatedTime = 0;
      let activeIdx = 0;
      let legT = 0;

      for (let i = 0; i < legs.length; i++) {
        const legTotal = legs[i].durationSeconds + legs[i].pauseAtDestinationSeconds;
        if (currentTimeSec >= accumulatedTime && currentTimeSec <= accumulatedTime + legTotal) {
          activeIdx = i;
          const insideLeg = currentTimeSec - accumulatedTime;
          legT = Math.min(1, insideLeg / legs[i].durationSeconds);
          break;
        }
        accumulatedTime += legTotal;
        if (i === legs.length - 1) {
          activeIdx = legs.length - 1;
          legT = 1;
        }
      }

      // Draw all route paths
      legs.forEach((leg, i) => {
        if (!leg.cachedPath || leg.cachedPath.length < 2) return;
        const pts = leg.cachedPath.map((coord) => ({
          x: lngToScreenX(coord[1]),
          y: latToScreenY(coord[0]),
        }));

        ctx.save();
        const legTrailColor = leg.trailColor || getDefaultTrailColorForMode(leg.mode);

        if (leg.mode === 'flight') {
          ctx.strokeStyle = i <= activeIdx ? legTrailColor : 'rgba(148, 163, 184, 0.3)';
          ctx.lineWidth = 4;
          ctx.setLineDash([12, 8]);
        } else if (leg.mode === 'hike') {
          ctx.strokeStyle = i <= activeIdx ? legTrailColor : hexToRgba(legTrailColor, 0.3);
          ctx.lineWidth = 5;
          ctx.setLineDash([6, 8]);
        } else {
          ctx.strokeStyle = i <= activeIdx ? legTrailColor : hexToRgba(legTrailColor, 0.3);
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        const ptCount =
          i === activeIdx ? Math.floor(pts.length * legT) : i < activeIdx ? pts.length : pts.length;
        pts.slice(0, Math.max(1, ptCount)).forEach((pt, pIdx) => {
          if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      });

      // Draw Active Vehicle
      const activeLeg = legs[activeIdx];
      if (activeLeg && activeLeg.cachedPath && activeLeg.cachedPath.length >= 2) {
        const path = activeLeg.cachedPath;
        const floatIdx = legT * (path.length - 1);
        const idxLow = Math.floor(floatIdx);
        const idxHigh = Math.min(path.length - 1, idxLow + 1);
        const frac = floatIdx - idxLow;

        const p1 = path[idxLow];
        const p2 = path[idxHigh];
        const curLat = p1[0] + (p2[0] - p1[0]) * frac;
        const curLng = p1[1] + (p2[1] - p1[1]) * frac;
        const vx = lngToScreenX(curLng);
        const vy = latToScreenY(curLat);
        const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
        const angleRad = toRad(bearing - 90);

        let altRatio = 0;
        if (activeLeg.mode === 'flight') {
          altRatio = Math.sin(legT * Math.PI);
        }

        drawAnimatedVehicle({
          ctx,
          x: vx,
          y: vy,
          angleRad,
          mode: activeLeg.mode,
          color: activeLeg.vehicleColor,
          scale: (activeLeg.vehicleScale || 1) * (W / 1200),
          altitudeRatio: altRatio,
          timeMs: currentTimeSec * 1000,
          showTrail: activeLeg.showTrail,
          trailColor: activeLeg.trailColor,
        });
      }

      // Title & Expedition Watermark (Apple brand: system blue + system font)
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#0A84FF';
      ctx.font = `600 ${Math.round(W * 0.022)}px -apple-system, "SF Pro Display", system-ui, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(`EXPEDITION JOURNEY · ${homeBase.name}`, 60, H - 70);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.font = `500 ${Math.round(W * 0.012)}px -apple-system, "SF Pro Text", system-ui, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText('ANIMATED WITH MAPANIMATOR', 60, H - 40);
      ctx.restore();

      // This frame's pixels are final — hand them to the recorder now.
      captureTrack.requestFrame();

      // Real-time pacing: MediaRecorder records wall-clock time, so the
      // renderer waits for each frame's true timestamp instead of racing.
      const targetMs = startedAt + (frame * 1000) / fps;
      const wait = targetMs - performance.now();
      if (wait > 0) {
        await paced(wait);
      }

      // Report render progress
      if (frame % 5 === 0) {
        setRenderProgress(Math.round((frame / totalFrames) * 100));
        await Promise.resolve();
      }
    }

    paceWorker.terminate();
    recorder.stop();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="bg-surface border border-hairline w-full max-w-xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-hairline bg-well flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent text-ink2 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-ink">Video Render Studio</h3>
              <p className="text-xs text-ink2">Configure resolution, aspect ratio, and frame rate</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            aria-label="Close render studio"
            className="p-1.5 text-ink3 hover:text-ink rounded-lg hover:bg-well/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1. Aspect Ratio */}
          <div>
            <label className="text-xs font-bold text-accent block mb-2">
              1. Aspect Ratio
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { ratio: '16:9' as AspectRatio, label: 'Landscape', sub: 'YouTube / TV', icon: Monitor },
                { ratio: '9:16' as AspectRatio, label: 'Vertical', sub: 'Reels / TikTok', icon: Smartphone },
                { ratio: '1:1' as AspectRatio, label: 'Square', sub: 'Instagram Feed', icon: Square },
                { ratio: '4:5' as AspectRatio, label: 'Portrait', sub: 'Social Feed', icon: Square },
              ].map(({ ratio, label, sub, icon: Icon }) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  disabled={isRendering}
                  aria-pressed={aspectRatio === ratio}
                  className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    aspectRatio === ratio
                      ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent'
                      : 'border-hairline hover:border-ink3 text-ink bg-well'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-xs font-bold">{ratio}</span>
                  <span className="text-xs text-ink3">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quality & Resolution */}
          <div>
            <label className="text-xs font-bold text-accent block mb-2">
              2. Resolution Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { res: '4K' as VideoResolution, label: '4K Ultra HD', badge: 'Broadcast' },
                { res: '1080p' as VideoResolution, label: '1080p Full HD', badge: 'Standard' },
                { res: '720p' as VideoResolution, label: '720p HD', badge: 'Fast' },
              ].map(({ res, label, badge }) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  disabled={isRendering}
                  aria-pressed={resolution === res}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    resolution === res
                      ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent'
                      : 'border-hairline hover:border-ink3 text-ink bg-well'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{label}</span>
                    <span className="text-[9px] bg-well text-ink2 px-1 rounded font-mono">
                      {badge}
                    </span>
                  </div>
                  <span className="text-xs text-ink3 font-mono-numbers">
                    {RESOLUTION_DIMS[aspectRatio][res].width} × {RESOLUTION_DIMS[aspectRatio][res].height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Framerate */}
          <div>
            <label className="text-xs font-bold text-accent block mb-2">
              3. Frame Rate
            </label>
            <div className="flex items-center gap-3">
              {[
                { val: 30 as const, label: '30 FPS', desc: 'Cinematic Standard' },
                { val: 60 as const, label: '60 FPS', desc: 'Ultra Smooth Motion' },
              ].map(({ val, label, desc }) => (
                <button
                  key={val}
                  onClick={() => setFps(val)}
                  disabled={isRendering}
                  aria-pressed={fps === val}
                  className={`flex-1 p-2.5 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                    fps === val
                      ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent'
                      : 'border-hairline text-ink hover:bg-well'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-xs text-ink3 font-normal">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Camera Motion */}
          <div>
            <label className="text-xs font-bold text-accent block mb-2">
              4. Camera Motion
            </label>
            <button
              type="button"
              onClick={() => setUseDynamicZoom((v) => !v)}
              disabled={isRendering}
              aria-pressed={useDynamicZoom}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                useDynamicZoom
                  ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent'
                  : 'border-hairline hover:border-ink3 text-ink bg-well'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold">Dynamic Zoom</span>
                <span className="text-xs text-ink3">Follow the vehicle with cinematic close-ups and pull-backs</span>
              </span>
              <span className={`text-xs font-bold ${useDynamicZoom ? 'text-accent' : 'text-ink3'}`}>
                {useDynamicZoom ? 'ON' : 'OFF'}
              </span>
            </button>
            {useDynamicZoom && (
              <div className="mt-2 p-3 rounded-lg border border-hairline bg-well">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-ink">Zoom-out</span>
                  <span className="text-xs font-bold text-accent tabular-nums">
                    {zoomOutBias === 0 ? 'Auto' : `${zoomOutBias > 0 ? '+' : ''}${zoomOutBias.toFixed(2)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.25}
                  value={zoomOutBias}
                  disabled={isRendering}
                  onChange={(e) => setZoomOutBias(Number(e.target.value))}
                  aria-label="Transit zoom-out adjustment, zoom levels; 0 fits each leg's distance automatically"
                  className="w-full accent-blue-500"
                />
                <span className="block text-[10px] text-ink3 mt-1">
                  Default for legs set to Auto · negative tightens · positive widens
                </span>
              </div>
            )}
          </div>

          {/* Render Progress or Download Button */}
          {isRendering ? (
            <div
              aria-live="polite"
              className="bg-well border border-hairline rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span>Synthesizing Frame-by-Frame Video...</span>
                </span>
                <span className="font-mono-numbers text-accent">{renderProgress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Video render progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={renderProgress}
                className="w-full h-2 bg-well rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-accent transition-all duration-150"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-xs text-ink3 text-center">
                Rendering {currentDims.width}x{currentDims.height} @ {fps}fps with synchronized camera easing
              </p>
            </div>
          ) : downloadUrl ? (
            <div
              role="status"
              aria-live="polite"
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Video Render Complete!</h4>
                  <p className="text-[11px] text-emerald-700">{downloadFilename}</p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save Video</span>
              </a>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-well flex items-center justify-between">
          <span className="text-xs text-ink2 font-mono-numbers">
            Output: {currentDims.width}x{currentDims.height} @ {fps}fps
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isRendering}
              className="px-4 py-2 text-xs font-semibold text-ink2 hover:text-ink rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRender}
              disabled={isRendering}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-strong text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-ink2" />
              <span>{isRendering ? 'Rendering...' : 'Start Video Render'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
