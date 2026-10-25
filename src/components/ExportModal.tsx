import React, { useState } from 'react';
import { X, Film, CheckCircle, Download, Loader2, Sparkles, Monitor, Smartphone, Square } from 'lucide-react';
import { AspectRatio, JourneyLeg, VideoExportConfig, VideoResolution, Waypoint } from '../types/travel';
import { drawAnimatedVehicle } from '../utils/vehicleDrawers';
import { calculateBearing, toRad } from '../utils/geoRouting';
import { hexToRgba, getDefaultTrailColorForMode } from '../data/trailStyles';
import { useModalA11y } from '../hooks/useModalA11y';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeBase: Waypoint;
  legs: JourneyLeg[];
}

const RESOLUTION_DIMS: Record<AspectRatio, Record<VideoResolution, { width: number; height: number }>> = {
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
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const dialogRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const currentDims = RESOLUTION_DIMS[aspectRatio][resolution];

  // Initiate Video Render via Offscreen Canvas & MediaRecorder
  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    // Calculate total duration in seconds
    const totalLegsDuration = legs.reduce(
      (sum, leg) => sum + leg.durationSeconds + leg.pauseAtDestinationSeconds,
      0
    );
    const duration = Math.max(4, totalLegsDuration);
    const totalFrames = Math.round(duration * fps);

    // Create offscreen render canvas
    const canvas = document.createElement('canvas');
    canvas.width = currentDims.width;
    canvas.height = currentDims.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }

    // Determine bounding box of all legs to frame the scene
    const allCoords: [number, number][] = [[homeBase.lat, homeBase.lng]];
    legs.forEach(l => {
      if (l.cachedPath) allCoords.push(...l.cachedPath);
    });

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    allCoords.forEach(([lat, lng]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    // Add 15% padding
    const latSpan = Math.max(0.05, (maxLat - minLat) * 1.3);
    const lngSpan = Math.max(0.05, (maxLng - minLng) * 1.3);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latToY = (lat: number) => {
      const norm = (lat - (centerLat - latSpan / 2)) / latSpan;
      return currentDims.height - norm * currentDims.height;
    };
    const lngToX = (lng: number) => {
      const norm = (lng - (centerLng - lngSpan / 2)) / lngSpan;
      return norm * currentDims.width;
    };

    // Preload satellite/topographic background tiles or draw high-res cartographic backdrop
    const stream = canvas.captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: resolution === '4K' ? 25_000_000 : 10_000_000,
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

    // Render frame by frame
    for (let frame = 0; frame <= totalFrames; frame++) {
      const progress = frame / totalFrames;
      const currentTimeSec = progress * duration;

      // Draw warm cartographic background
      ctx.fillStyle = '#EBE5DA';
      ctx.fillRect(0, 0, currentDims.width, currentDims.height);

      // Topographic contours simulation
      ctx.strokeStyle = 'rgba(14, 100, 102, 0.05)';
      ctx.lineWidth = 2;
      for (let r = 80; r < Math.max(currentDims.width, currentDims.height); r += 90) {
        ctx.beginPath();
        ctx.arc(currentDims.width / 2, currentDims.height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Compass Rose watermark in corner
      ctx.save();
      ctx.translate(currentDims.width - 100, 100);
      ctx.strokeStyle = 'rgba(14, 100, 102, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

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
        const pts = leg.cachedPath.map(coord => ({
          x: lngToX(coord[1]),
          y: latToY(coord[0]),
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
        const ptCount = i === activeIdx ? Math.floor(pts.length * legT) : i < activeIdx ? pts.length : pts.length;
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
        const vx = lngToX(curLng);
        const vy = latToY(curLat);
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
          scale: (activeLeg.vehicleScale || 1) * (currentDims.width / 1200),
          altitudeRatio: altRatio,
          timeMs: currentTimeSec * 1000,
          showTrail: activeLeg.showTrail,
          trailColor: activeLeg.trailColor,
        });
      }

      // Title & Expedition Watermark
      ctx.fillStyle = '#0E6466';
      ctx.font = `bold ${Math.round(currentDims.width * 0.024)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(`EXPEDITION JOURNEY · ${homeBase.name}`, 60, currentDims.height - 70);

      ctx.fillStyle = '#78716C';
      ctx.font = `500 ${Math.round(currentDims.width * 0.014)}px "JetBrains Mono", monospace`;
      ctx.fillText(`ANIMATED WITH MAPANIMATOR · ${currentDims.width}x${currentDims.height} @ ${fps}FPS`, 60, currentDims.height - 40);

      // Report render progress
      if (frame % 5 === 0) {
        setRenderProgress(Math.round((frame / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 8));
      }
    }

    recorder.stop();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="bg-[#FFFFFF] border border-[#E6E1D7] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E6E1D7] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0E6466] text-[#F59E0B] flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-stone-900">Video Render Studio</h3>
              <p className="text-xs text-stone-500">Configure resolution, aspect ratio, and frame rate</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            aria-label="Close render studio"
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1. Aspect Ratio */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#0E6466] block mb-2">
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
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    aspectRatio === ratio
                      ? 'border-[#0E6466] bg-[#0E6466]/5 text-[#0E6466] ring-1 ring-[#0E6466]'
                      : 'border-stone-200 hover:border-stone-400 text-stone-700 bg-stone-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-xs font-bold">{ratio}</span>
                  <span className="text-[10px] text-stone-400">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quality & Resolution */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#0E6466] block mb-2">
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
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    resolution === res
                      ? 'border-[#0E6466] bg-[#0E6466]/5 text-[#0E6466] ring-1 ring-[#0E6466]'
                      : 'border-stone-200 hover:border-stone-400 text-stone-700 bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{label}</span>
                    <span className="text-[9px] bg-stone-200 text-stone-600 px-1 rounded font-mono">
                      {badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono-numbers">
                    {RESOLUTION_DIMS[aspectRatio][res].width} × {RESOLUTION_DIMS[aspectRatio][res].height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Framerate */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#0E6466] block mb-2">
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
                  className={`flex-1 p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                    fps === val
                      ? 'border-[#0E6466] bg-[#0E6466]/5 text-[#0E6466] ring-1 ring-[#0E6466]'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-stone-400 font-normal">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Render Progress or Download Button */}
          {isRendering ? (
            <div
              aria-live="polite"
              className="bg-[#FAF8F5] border border-[#E6E1D7] rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0E6466]" />
                  <span>Synthesizing Frame-by-Frame Video...</span>
                </span>
                <span className="font-mono-numbers text-[#0E6466]">{renderProgress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Video render progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={renderProgress}
                className="w-full h-2 bg-stone-200 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-[#0E6466] transition-all duration-150"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 text-center">
                Rendering {currentDims.width}x{currentDims.height} @ {fps}fps with synchronized camera easing
              </p>
            </div>
          ) : downloadUrl ? (
            <div
              role="status"
              aria-live="polite"
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save Video</span>
              </a>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E6E1D7] bg-[#FAF8F5] flex items-center justify-between">
          <span className="text-xs text-stone-500 font-mono-numbers">
            Output: {currentDims.width}x{currentDims.height} @ {fps}fps
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isRendering}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRender}
              disabled={isRendering}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0E6466] hover:bg-[#094749] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#F59E0B]" />
              <span>{isRendering ? 'Rendering...' : 'Start Video Render'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
