import { TransportMode } from '../types/travel';
import { getDefaultIconIdForMode } from '../data/travelerIcons';

export interface VehicleDrawOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angleRad: number; // heading angle in radians (0 rad = +X forward)
  mode: TransportMode;
  iconId?: string; // Specific chosen icon ID
  color: string;
  scale: number;
  altitudeRatio?: number; // 0 (ground) to 1 (cruising height) for flight
  timeMs: number;
  showTrail: boolean;
  trailColor: string;
}

// =========================================================================
// MONOCHROME SHADED SPRITE DESIGN SYSTEM (Apple-style, top-down)
// Every sprite is rendered entirely in shades of ONE hue — the user-chosen
// vehicle color — like Apple's hierarchical monochrome icon treatment:
// - Light always falls across the sprite's LATERAL axis: the -Y side is
//   lit (tint towards white), the +Y side falls into shade (tint towards
//   near-black, preserving the hue).
// - Hierarchy: glass = deep shade, outline = darkest shade, accent panels
//   = the pure color, body panels = a light tint of the same color.
// - Neutral dark ground/contact shadows (never hue-shifted) ground the
//   object on the map.
// =========================================================================

export const OUTLINE_COLOR = '#0F172A'; // neutral — used only by ground shadows

/**
 * Global shading-contrast multiplier applied to every gradient in the
 * design system. Per-caller light/shade amounts are calibrated around a
 * moderate look; raise this to make the 3-tone read punchier on busy
 * map tiles (stronger highlights, deeper shade falloff).
 */
const SHADE_SCALE = 1.7;

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function mixRgb(r: number, g: number, b: number, tr: number, tg: number, tb: number, t: number): [number, number, number] {
  return [r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t];
}

/** Core-shade target for dark tints: near-black, so a shaded color
 * darkens without drifting out of its own hue (monochrome rule). */
const SHADE_RGB = [10, 12, 16] as const;

/**
 * Tints any #RRGGBB / #RGB color lighter (amt > 0, towards white) or
 * darker/core-shaded (amt < 0, towards cool deep navy). Unknown color
 * formats pass through untouched.
 */
export function tint(hex: string, amt: number): string {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (m) {
    return tintRgb(hex, parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), amt);
  }
  const s = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(hex);
  if (s) {
    return tintRgb(hex, parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16), amt);
  }
  return hex;
}

function tintRgb(_orig: string, r: number, g: number, b: number, amt: number): string {
  const t = Math.max(-1, Math.min(1, amt));
  const [nr, ng, nb] = t >= 0
    ? mixRgb(r, g, b, 255, 255, 255, t)
    : mixRgb(r, g, b, SHADE_RGB[0], SHADE_RGB[1], SHADE_RGB[2], -t);
  return `rgb(${clamp255(nr)},${clamp255(ng)},${clamp255(nb)})`;
}

/** Linear gradient across the LATERAL axis (Y): light on -Y, shade on +Y. */
function lateralGradY(
  ctx: CanvasRenderingContext2D,
  yFrom: number,
  yTo: number,
  color: string,
  lightAmt = 0.30,
  darkAmt = 0.20
): CanvasGradient {
  const g = ctx.createLinearGradient(0, yFrom, 0, yTo);
  g.addColorStop(0, tint(color, Math.min(1, lightAmt * SHADE_SCALE)));
  g.addColorStop(0.42, color);
  g.addColorStop(1, tint(color, -Math.min(1, darkAmt * SHADE_SCALE)));
  return g;
}

/** Linear gradient along the LONGITUDINAL axis (X): light from front (+X). */
function axialGradX(
  ctx: CanvasRenderingContext2D,
  xFrom: number,
  xTo: number,
  color: string,
  lightAmt = 0.30,
  darkAmt = 0.20
): CanvasGradient {
  const g = ctx.createLinearGradient(xFrom, 0, xTo, 0);
  g.addColorStop(0, tint(color, Math.min(1, lightAmt * SHADE_SCALE)));
  g.addColorStop(0.42, color);
  g.addColorStop(1, tint(color, -Math.min(1, darkAmt * SHADE_SCALE)));
  return g;
}

/** Thin translucent-white specular sheen used sparingly on convex panels.
 * Alphas are boosted globally (specular variant of SHADE_SCALE) so call
 * sites stay calibrated while highlights read punchier on map tiles. */
function sheen(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha = 0.45, w = 1.2): void {
  const boosted = Math.min(0.8, alpha * 1.35);
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${boosted})`;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Specular streak for glass canopies (diagonal white slash). */
function glassStreak(ctx: CanvasRenderingContext2D, x: number, y: number, len: number = 8): void {
  sheen(ctx, x, y - len * 0.7, x + len * 0.55, y + len * 0.55, 0.4);
}

/** Body panel: gradient fill + crisp outline. */
function shadedRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  opts?: { gradX?: boolean; dark?: boolean }
): void {
  const horiz = opts?.gradX ?? false;
  ctx.fillStyle = horiz
    ? axialGradX(ctx, x, x + w, color)
    : lateralGradY(ctx, y, y + h, color);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function shadedEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  opts?: { gradX?: boolean }
): void {
  ctx.fillStyle = opts?.gradX
    ? axialGradX(ctx, x - rx, x + rx, color)
    : lateralGradY(ctx, y - ry, y + ry, color);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Renders one icon glyph onto a canvas at devicePixelRatio fidelity.
 * Used by the icon picker / sidebar previews so they show EXACTLY the
 * same shaded sprites that animate on the map and in video exports.
 * The glyph is drawn facing "up" and framed by a 34-unit half extent.
 */
export function drawIconGlyphToCanvas(
  canvas: HTMLCanvasElement,
  iconId: string,
  color: string,
  pixelSize: number
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(16, Math.round(pixelSize * dpr));
  if (canvas.width !== w || canvas.height !== w) {
    canvas.width = w;
    canvas.height = w;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  ctx.translate(w * 0.54, w * 0.5); // slight +X shift balances trailing boat wakes
  const fit = w * 0.5 / 34;
  ctx.scale(fit, fit);
  ctx.rotate(-Math.PI * 0.5);
  drawSpecificIcon(ctx, iconId, color, 1400, 0);
  ctx.restore();
}

/**
 * Draw vehicle or traveler sprite with the shaded 3-tone top-down design language:
 * - Crisp dark outline (#0F172A, lineWidth 2.2, round joins/caps)
 * - Object-space gradient shading: lit -Y edge, shaded +Y edge
 * - Glass canopies read as dark glazing with specular streaks
 * - Soft layered contact shadow on the ground
 */
export function drawAnimatedVehicle(options: VehicleDrawOptions): void {
  const { ctx, x, y, angleRad, mode, iconId, color, scale, altitudeRatio = 0, timeMs } = options;

  const resolvedIconId = iconId || getDefaultIconIdForMode(mode);

  ctx.save();
  ctx.translate(x, y);

  // Aviation flight elevation and ground shadow projection
  const isAviation =
    resolvedIconId.startsWith('plane-') ||
    resolvedIconId === 'helicopter' ||
    resolvedIconId === 'hot-air-balloon' ||
    mode === 'flight';

  if (isAviation) {
    const flightElev = altitudeRatio * 32;
    const shadowOffset = altitudeRatio * 20;

    // Projected ground shadow (softens and scales with altitude)
    ctx.save();
    ctx.translate(shadowOffset * 0.4, shadowOffset);
    ctx.rotate(angleRad);
    ctx.scale(scale * (1 + altitudeRatio * 0.1), scale * (1 + altitudeRatio * 0.1));
    ctx.fillStyle = `rgba(15, 23, 42, ${Math.max(0.08, 0.42 - altitudeRatio * 0.22)})`;
    drawAircraftGroundShadow(ctx, resolvedIconId);
    ctx.restore();

    // Actual aircraft rendered at elevated altitude
    ctx.save();
    ctx.translate(0, -flightElev);
    ctx.rotate(angleRad);
    ctx.scale(scale * (1 + altitudeRatio * 0.25), scale * (1 + altitudeRatio * 0.25));
    drawSpecificIcon(ctx, resolvedIconId, color, timeMs, altitudeRatio);
    ctx.restore();

    ctx.restore();
    return;
  }

  // Ground / Water / Human / Rail Travelers
  ctx.rotate(angleRad);
  ctx.scale(scale, scale);

  // Soft two-layer ground contact shadow (wide soft + tight core)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.19)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 19, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.19)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 14.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSpecificIcon(ctx, resolvedIconId, color, timeMs, 0);

  ctx.restore();
}

/**
 * Route to individual shaded icon drawer
 */
function drawSpecificIcon(
  ctx: CanvasRenderingContext2D,
  iconId: string,
  color: string,
  timeMs: number,
  _altitudeRatio: number
): void {
  // Common line styles for the shaded 3-tone system
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (iconId) {
    // Aviation
    case 'plane-jet':
      drawModernJetliner(ctx, color, timeMs);
      break;
    case 'plane-bush':
      drawBushPlane(ctx, color, timeMs);
      break;
    case 'plane-twin':
      drawTwinTurboprop(ctx, color, timeMs);
      break;
    case 'helicopter':
      drawExpeditionHelicopter(ctx, color, timeMs);
      break;
    case 'hot-air-balloon':
      drawSafariBalloon(ctx, color, timeMs);
      break;

    // Overland
    case 'suv-expedition':
      drawExpedition4x4(ctx, color, timeMs);
      break;
    case 'suv-rover':
      drawModernLuxuryRover(ctx, color, timeMs);
      break;
    case 'camper-van':
      drawAdventureCamperVan(ctx, color, timeMs);
      break;
    case 'car-sedan':
      drawElectricTourer(ctx, color, timeMs);
      break;
    case 'vintage-4x4':
      drawClassicHeritage4x4(ctx, color, timeMs);
      break;
    case 'motorcycle-adv':
      drawAdventureMotorcycle(ctx, color, timeMs);
      break;

    // Human / Trekkers
    case 'hiker-modern':
      drawModernHiker(ctx, color, timeMs);
      break;
    case 'trail-runner':
      drawTrailRunner(ctx, color, timeMs);
      break;
    case 'mountaineer':
      drawAlpineMountaineer(ctx, color, timeMs);
      break;
    case 'desert-nomad':
      drawSafariRanger(ctx, color, timeMs);
      break;
    case 'wanderer':
      drawMinimalistWanderer(ctx, color, timeMs);
      break;

    // Watercraft
    case 'boat-catamaran':
      drawExpeditionCatamaran(ctx, color, timeMs);
      break;
    case 'boat-yacht':
      drawModernMotorYacht(ctx, color, timeMs);
      break;
    case 'boat-speedboat':
      drawZodiacSpeedboat(ctx, color, timeMs);
      break;
    case 'boat-sailboat':
      drawOceanSailboat(ctx, color, timeMs);
      break;

    // Rail
    case 'train-bullet':
      drawBulletTrain(ctx, color, timeMs);
      break;
    case 'train-scenic':
      drawPanoramaGlacierTrain(ctx, color, timeMs);
      break;

    // Cycling
    case 'bike-gravel':
      drawGravelBike(ctx, color, timeMs);
      break;
    case 'bike-ebike':
      drawCommuterBike(ctx, color, timeMs);
      break;

    // Fallbacks
    default:
      drawModernJetliner(ctx, color, timeMs);
      break;
  }
}

// =========================================================================
// 1. AVIATION (+X is forward heading)
// Fuselage/wings get cylindrical lateral shading; glass keeps crisp cutouts.
// =========================================================================

/**
 * Modern Jetliner
 */
function drawModernJetliner(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Left Wing (accent, lit top edge)
  ctx.fillStyle = lateralGradY(ctx, -27, -4.5, color, 0.34, 0.18);
  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.lineTo(-7, -27);
  ctx.lineTo(-12, -27);
  ctx.lineTo(-4, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Wing (dark edge of the same sweep)
  ctx.fillStyle = lateralGradY(ctx, 4.5, 27, color, 0.28, 0.26);
  ctx.beginPath();
  ctx.moveTo(3, 4.5);
  ctx.lineTo(-7, 27);
  ctx.lineTo(-12, 27);
  ctx.lineTo(-4, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Underslung Engine Nacelles (light aluminium with cylindrical shading)
  ctx.fillStyle = lateralGradY(ctx, -16.5, -12, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-4, -16.5, 11, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lateralGradY(ctx, 12, 16.5, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-4, 12, 11, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  // Horizontal Tail Stabilizers (accent)
  ctx.fillStyle = lateralGradY(ctx, -12, -2.5, color, 0.3, 0.18);
  ctx.beginPath();
  ctx.moveTo(-14, -2.5);
  ctx.lineTo(-21, -12);
  ctx.lineTo(-24, -12);
  ctx.lineTo(-19, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lateralGradY(ctx, 2.5, 12, color, 0.26, 0.24);
  ctx.beginPath();
  ctx.moveTo(-14, 2.5);
  ctx.lineTo(-21, 12);
  ctx.lineTo(-24, 12);
  ctx.lineTo(-19, 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main Fuselage (cylindrical light-to-shade across the tube)
  ctx.fillStyle = lateralGradY(ctx, -4.5, 4.5, tint(color, 0.58), 0.42, 0.30);
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.bezierCurveTo(21, -4.5, 17, -4.5, -15, -4.5);
  ctx.lineTo(-22, -1.8);
  ctx.lineTo(-22, 1.8);
  ctx.lineTo(-15, 4.5);
  ctx.bezierCurveTo(17, 4.5, 21, 4.5, 21, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fuselage sheen along the lit side
  sheen(ctx, -12, -3.2, 16, -3.2, 0.4);

  // Cockpit Crescent Cutout
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(15, 0, 2.8, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();
}

/**
 * Safari Bush Plane (High-wing Cessna Caravan)
 */
function drawBushPlane(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Straight High Wing in accent color
  ctx.fillStyle = lateralGradY(ctx, -26, 26, color, 0.22, 0.22);
  ctx.beginPath();
  ctx.roundRect(-2, -26, 7, 52, 2.5);
  ctx.fill();
  ctx.stroke();
  // Wing edge sheens
  sheen(ctx, -0.6, -22, -0.6, -6, 0.32);
  sheen(ctx, -0.6, 6, -0.6, 22, 0.18);

  // Tailplane
  ctx.fillStyle = lateralGradY(ctx, -10, 10, color, 0.26, 0.22);
  ctx.beginPath();
  ctx.roundRect(-18, -10, 4.5, 20, 1.5);
  ctx.fill();
  ctx.stroke();

  // Fuselage
  ctx.fillStyle = lateralGradY(ctx, -4, 4, tint(color, 0.58), 0.42, 0.32);
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(18, -4, 14, -4, -14, -4);
  ctx.lineTo(-20, -1.5);
  ctx.lineTo(-20, 1.5);
  ctx.lineTo(-14, 4);
  ctx.bezierCurveTo(14, 4, 18, 4, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  sheen(ctx, -12, -2.8, 14, -2.8, 0.4);

  // Cockpit windshield arc
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(12, 0, 2.6, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();

  // Spinning propeller disc at nose (+X)
  const propBlur = 0.4 + Math.sin(timeMs * 0.05) * 0.2;
  ctx.fillStyle = `rgba(255, 255, 255, ${propBlur})`;
  ctx.beginPath();
  ctx.ellipse(20, 0, 2, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.arc(19, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Twin Turboprop Utility Aircraft
 */
function drawTwinTurboprop(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Wings with accent color
  ctx.fillStyle = lateralGradY(ctx, -25, 25, color, 0.2, 0.2);
  ctx.beginPath();
  ctx.roundRect(-2, -25, 6.5, 50, 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -0.4, -20, -0.4, -6, 0.28);
  sheen(ctx, -0.4, 6, -0.4, 20, 0.16);

  // Engine nacelles
  ctx.fillStyle = lateralGradY(ctx, -15, -10.5, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-4, -15, 10, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lateralGradY(ctx, 10.5, 15, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-4, 10.5, 10, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  // Propeller spinner dots
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.arc(6.5, -12.75, 1.5, 0, Math.PI * 2);
  ctx.arc(6.5, 12.75, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Tailplane
  ctx.fillStyle = lateralGradY(ctx, -9, 9, color, 0.26, 0.22);
  ctx.beginPath();
  ctx.roundRect(-17, -9, 4, 18, 1.5);
  ctx.fill();
  ctx.stroke();

  // Fuselage
  ctx.fillStyle = lateralGradY(ctx, -4.2, 4.2, tint(color, 0.58), 0.42, 0.32);
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.bezierCurveTo(19, -4.2, 15, -4.2, -14, -4.2);
  ctx.lineTo(-20, -1.5);
  ctx.lineTo(-20, 1.5);
  ctx.lineTo(-14, 4.2);
  ctx.bezierCurveTo(15, 4.2, 19, 4.2, 19, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  sheen(ctx, -11, -3, 13, -3, 0.4);

  // Cockpit
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(13.5, 0, 2.6, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();
}

/**
 * Expedition Helicopter
 */
function drawExpeditionHelicopter(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Landing skids in bold dark
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(10, -8);
  ctx.lineTo(-8, -8);
  ctx.moveTo(10, 8);
  ctx.lineTo(-8, 8);
  ctx.stroke();

  // Tail boom & tail rotor
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-24, 0);
  ctx.stroke();
  ctx.fillStyle = axialGradX(ctx, -26, -23, color);
  ctx.fillRect(-26, -4, 3, 8);
  ctx.strokeRect(-26, -4, 3, 8);

  // Teardrop fuselage
  ctx.fillStyle = lateralGradY(ctx, -7, 7, tint(color, 0.58), 0.4, 0.32);
  ctx.beginPath();
  ctx.ellipse(2, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fuselage sheen along the lit side
  sheen(ctx, -6, -5.4, 9, -5.4, 0.38);

  // Cockpit canopy in accent with glass shading
  ctx.fillStyle = lateralGradY(ctx, -4.5, 4.5, color, 0.22, 0.4);
  ctx.beginPath();
  ctx.ellipse(8, 0, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  glassStreak(ctx, 6.5, -2.4, 4);

  // Spinning 4-blade rotor
  const rotorAngle = (timeMs * 0.04) % (Math.PI * 2);
  ctx.save();
  ctx.rotate(rotorAngle);
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.fillStyle = axialGradX(ctx, -3, 3, color);
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Safari Hot Air Balloon
 */
function drawSafariBalloon(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.4;

  // Envelope base with spherical shading
  const envGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17);
  envGrad.addColorStop(0, tint(color, 0.45));
  envGrad.addColorStop(0.65, color);
  envGrad.addColorStop(1, tint(color, -0.24));
  ctx.fillStyle = envGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Alternating cream gore segments (spherical shading via alpha overlays)
  ctx.fillStyle = 'rgba(248,250,252,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, -Math.PI / 4, Math.PI / 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(248,250,252,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, (3 * Math.PI) / 4, (5 * Math.PI) / 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tinted red overlay on the dark hemisphere edge for depth
  ctx.fillStyle = `rgba(16,26,44,0.12)`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, 0.6, 2.1);
  ctx.closePath();
  ctx.fill();

  // Specular highlight rim (top-left of envelope)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 14.6, Math.PI * 0.95, Math.PI * 1.45);
  ctx.stroke();

  // Inner ring (burner throat)
  ctx.fillStyle = lateralGradY(ctx, -7, 7, tint(color, 0.58), 0.35, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Burner flame core
  ctx.fillStyle = tint(color, -0.5);
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 2. OVERLAND & ROAD VEHICLES (+X is forward heading)
// Bodies get cross-car gradient shading; hoods are front-lit accents;
// glass reads as dark glazing; lights stay luminous white/red.
// =========================================================================

/**
 * Modern Overland Safari 4x4 (Defender style)
 */
function drawExpedition4x4(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Side mirrors
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(8, -11, 2.5, 2);
  ctx.fillRect(8, 9, 2.5, 2);

  // Rear mounted spare tire
  ctx.beginPath();
  ctx.arc(-18, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tint(color, 0.18);
  ctx.beginPath();
  ctx.arc(-18, -0.6, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-18, 0.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Main chassis
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.fillStyle = lateralGradY(ctx, -9, 9, tint(color, 0.58), 0.34, 0.30);
  ctx.beginPath();
  ctx.roundRect(-16, -9, 32, 18, 4);
  ctx.fill();
  ctx.stroke();

  // Front Hood Panel in accent color, lit from the nose
  ctx.fillStyle = axialGradX(ctx, 8, 15, color, 0.30, 0.22);
  ctx.beginPath();
  ctx.roundRect(8, -7.5, 7, 15, 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, 9.4, -5.4, 9.4, 5.4, 0.28);

  // Windshield in dark glazing
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(5, -7.5, 3, 15);

  // Expedition Roof Rack & storage pod
  ctx.fillStyle = axialGradX(ctx, -12, 2, color, 0.18, 0.24);
  ctx.beginPath();
  ctx.roundRect(-12, -7, 14, 14, 2);
  ctx.fill();
  ctx.stroke();
  // Rack divider lines
  ctx.beginPath();
  ctx.moveTo(-5, -7);
  ctx.lineTo(-5, 7);
  ctx.stroke();
  // Roof rack rim highlight along the lit side
  sheen(ctx, -10.6, -5.6, 0.6, -5.6, 0.3);

  // Front LED Headlights
  ctx.fillStyle = tint(color, 0.8);
  ctx.fillRect(15.5, -7.5, 1.5, 3);
  ctx.fillRect(15.5, 4.5, 1.5, 3);
}

/**
 * Modern Luxury Rover / Aerodynamic SUV
 */
function drawModernLuxuryRover(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Mirrors
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(8, -10.5, 2.5, 2);
  ctx.fillRect(8, 8.5, 2.5, 2);

  // Sculpted body
  ctx.fillStyle = lateralGradY(ctx, -8.5, 8.5, tint(color, 0.58), 0.36, 0.30);
  ctx.beginPath();
  ctx.roundRect(-16, -8.5, 32, 17, 5.5);
  ctx.fill();
  ctx.stroke();

  // Roof sheen down the fastback spine
  sheen(ctx, -13, -6.2, 7, -6.2, 0.32);

  // Hood in accent color, front-lit
  ctx.fillStyle = axialGradX(ctx, 8, 15, color, 0.3, 0.22);
  ctx.beginPath();
  ctx.roundRect(8, -7, 7, 14, 2);
  ctx.fill();
  ctx.stroke();

  // Panoramic Black Glass Canopy (curved glazing shading)
  const glassGrad = ctx.createLinearGradient(0, -6.5, 0, 6.5);
  glassGrad.addColorStop(0, tint(color, -0.5));
  glassGrad.addColorStop(0.5, tint(color, -0.66));
  glassGrad.addColorStop(1, tint(color, -0.78));
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.roundRect(-10, -6.5, 16, 13, 2.5);
  ctx.fill();

  // Glass highlight
  ctx.strokeStyle = tint(color, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.lineTo(-5, 4.5);
  ctx.stroke();

  // Front laser headlights
  ctx.strokeStyle = tint(color, -0.84);
  ctx.fillStyle = tint(color, 0.8);
  ctx.fillRect(15.5, -6, 1.5, 12);

  // Rear light blade
  ctx.fillStyle = tint(color, -0.5);
  ctx.fillRect(-16.5, -6, 1.2, 12);
}

/**
 * Adventure Vanlife Camper (Sprinter 4x4)
 */
function drawAdventureCamperVan(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Mirrors
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(11, -11, 2.5, 2);
  ctx.fillRect(11, 9, 2.5, 2);

  // Van body
  ctx.fillStyle = lateralGradY(ctx, -9, 9, tint(color, 0.58), 0.34, 0.30);
  ctx.beginPath();
  ctx.roundRect(-19, -9, 37, 18, 4);
  ctx.fill();
  ctx.stroke();

  // Tall-van roof sheen along the lit side
  sheen(ctx, -16, -6.6, 11, -6.6, 0.3);

  // Windshield
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(10, -7.5, 4, 15);

  // Rooftop solar array in accent
  ctx.fillStyle = axialGradX(ctx, -12, 7, color, 0.16, 0.22);
  ctx.beginPath();
  ctx.roundRect(-12, -7, 19, 14, 2);
  ctx.fill();
  ctx.stroke();
  // Solar cell glass sheen
  sheen(ctx, -10.6, -5.4, 5.4, -5.4, 0.26);

  // Grid
  ctx.beginPath();
  ctx.moveTo(-3, -7);
  ctx.lineTo(-3, 7);
  ctx.moveTo(5, -7);
  ctx.lineTo(5, 7);
  ctx.moveTo(-12, 0);
  ctx.lineTo(7, 0);
  ctx.stroke();
}

/**
 * Electric Tourer (Taycan Fastback)
 */
function drawElectricTourer(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Fastback body
  ctx.fillStyle = lateralGradY(ctx, -8, 8, tint(color, 0.58), 0.36, 0.30);
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 16, 6);
  ctx.fill();
  ctx.stroke();

  // Spine sheen
  sheen(ctx, -12.5, -5.9, 7, -5.9, 0.32);

  // Hood in accent color
  ctx.fillStyle = axialGradX(ctx, 8, 15, color, 0.3, 0.22);
  ctx.beginPath();
  ctx.roundRect(8, -6.5, 7, 13, 2);
  ctx.fill();
  ctx.stroke();

  // Glass canopy
  const glassGrad = ctx.createLinearGradient(0, -6, 0, 6);
  glassGrad.addColorStop(0, tint(color, -0.5));
  glassGrad.addColorStop(0.5, tint(color, -0.66));
  glassGrad.addColorStop(1, tint(color, -0.78));
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.roundRect(-9, -6, 15, 12, 3);
  ctx.fill();

  // Front & rear light blades
  ctx.fillStyle = tint(color, 0.8);
  ctx.fillRect(15.5, -5, 1.2, 10);
  ctx.fillStyle = tint(color, -0.5);
  ctx.fillRect(-16.2, -5, 1.2, 10);
}

/**
 * Classic Heritage 4x4
 */
function drawClassicHeritage4x4(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Front bumper
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(16, -9, 2.5, 18);

  // Body
  ctx.fillStyle = lateralGradY(ctx, -8.5, 8.5, tint(color, 0.58), 0.34, 0.30);
  ctx.beginPath();
  ctx.roundRect(-15, -8.5, 30, 17, 3);
  ctx.fill();
  ctx.stroke();

  sheen(ctx, -12, -6.2, 8, -6.2, 0.3);

  // Square hood in accent
  ctx.fillStyle = axialGradX(ctx, 7, 15, color, 0.28, 0.2);
  ctx.beginPath();
  ctx.roundRect(7, -7, 8, 14, 1.5);
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(4, -7, 2.5, 14);

  // Canvas open bed
  ctx.fillStyle = lateralGradY(ctx, -7, 7, tint(color, 0.58), 0.24, 0.3);
  ctx.beginPath();
  ctx.roundRect(-13, -7, 15, 14, 2);
  ctx.fill();
  ctx.stroke();
  // Roll cage cross
  ctx.beginPath();
  ctx.moveTo(-5.5, -7);
  ctx.lineTo(-5.5, 7);
  ctx.moveTo(-13, 0);
  ctx.lineTo(2, 0);
  ctx.stroke();
}

/**
 * Adventure Dual-Sport Motorcycle
 */
function drawAdventureMotorcycle(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Handlebars
  ctx.beginPath();
  ctx.moveTo(8, -9);
  ctx.lineTo(8, 9);
  ctx.stroke();

  // Front wheel
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(11, -2, 7, 4);

  // Twin Aluminum Panniers with cylindrical shading
  ctx.fillStyle = lateralGradY(ctx, -8.5, -4, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-15, -8.5, 8, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -13.6, -8, -8, -8, 0.3);

  ctx.fillStyle = lateralGradY(ctx, 4, 8.5, tint(color, 0.58));
  ctx.beginPath();
  ctx.roundRect(-15, 4, 8, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -13.6, 4.6, -8, 4.6, 0.2);

  // Fuel tank in accent color
  ctx.fillStyle = lateralGradY(ctx, -4, 4, color, 0.34, 0.26);
  ctx.beginPath();
  ctx.ellipse(-1, 0, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -7, -2.9, 3, -2.9, 0.34);

  // Seat & rear wheel
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(-8, -2, 4, 4);
  ctx.fillRect(-16, -2, 7, 4);
}

// =========================================================================
// 3. HUMAN & TREKKERS (+X is forward heading)
// Torso/pack/head all receive soft cylindrical shading to read as 3D
// figures, while the flat bold outline keeps them crisp at map scale.
// =========================================================================

/**
 * Modern Explorer / Trekker
 */
function drawModernHiker(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const step = Math.sin(timeMs * 0.012);

  // Trekking poles with swinging cadence (+X forward)
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(13 + step * 3.5, -9);
  ctx.moveTo(0, 7);
  ctx.lineTo(13 - step * 3.5, 9);
  ctx.stroke();

  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Technical backpack with pack-volume shading
  ctx.fillStyle = axialGradX(ctx, -11, -2, tint(color, 0.58), 0.24, 0.30);
  ctx.beginPath();
  ctx.roundRect(-11, -5.5, 9, 11, 2.5);
  ctx.fill();
  ctx.stroke();
  // Pack lid sheen and a compression-strap hint
  sheen(ctx, -10.2, -4.2, -3, -4.2, 0.3);
  ctx.beginPath();
  ctx.moveTo(-9.4, -5.5);
  ctx.lineTo(-9.4, 5.5);
  ctx.stroke();

  // Explorer jacket/shoulders
  ctx.fillStyle = lateralGradY(ctx, -7.5, 7.5, color, 0.34, 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -3.2, -6.4, -3.2, -1, 0.3);

  // Head with spherical shading and cap visor forward (+X)
  const headGrad = ctx.createRadialGradient(2.6, -1, 0.6, 3.5, 0, 4.2);
  headGrad.addColorStop(0, tint(color, 0.8));
  headGrad.addColorStop(1, tint(tint(color, 0.58), -0.22));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(3.5, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cap visor in dark pointing forward
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.moveTo(4, -2.5);
  ctx.lineTo(7.5, 0);
  ctx.lineTo(4, 2.5);
  ctx.closePath();
  ctx.fill();
}

/**
 * Fastpacking Trail Runner
 */
function drawTrailRunner(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const cadence = Math.sin(timeMs * 0.02);

  // Pumping arms
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(6 + cadence * 4.5, -7.5);
  ctx.moveTo(0, 5);
  ctx.lineTo(6 - cadence * 4.5, 7.5);
  ctx.stroke();

  // Hydration vest (dark technical fabric with volume shading)
  const vestGrad = ctx.createLinearGradient(-8, 0, -2, 0);
  vestGrad.addColorStop(0, '#1E293B');
  vestGrad.addColorStop(1, tint(color, -0.84));
  ctx.fillStyle = vestGrad;
  ctx.beginPath();
  ctx.roundRect(-8, -4.5, 6, 9, 2);
  ctx.fill();
  sheen(ctx, -7.4, -3.6, -3, -3.6, 0.24);

  // Torso
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.fillStyle = lateralGradY(ctx, -6.5, 6.5, color, 0.34, 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -2.9, -5.8, -2.9, -0.5, 0.3);

  // Head
  const headGrad = ctx.createRadialGradient(3.2, -1, 0.5, 4, 0, 3.9);
  headGrad.addColorStop(0, tint(color, 0.8));
  headGrad.addColorStop(1, tint(tint(color, 0.58), -0.22));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Visor
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.moveTo(4.5, -2);
  ctx.lineTo(7.5, 0);
  ctx.lineTo(4.5, 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Alpine Mountaineer
 */
function drawAlpineMountaineer(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const step = Math.sin(timeMs * 0.01);

  // Technical ice axe held forward
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(13 + step * 2, -10);
  ctx.stroke();
  // Ice axe pick head
  ctx.fillStyle = axialGradX(ctx, 9 + step * 2, 15 + step * 2, tint(color, 0.58));
  ctx.beginPath();
  ctx.moveTo(11 + step * 2, -12);
  ctx.lineTo(15 + step * 2, -9);
  ctx.lineTo(9 + step * 2, -8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Heavy backpack
  ctx.fillStyle = axialGradX(ctx, -13, -3, tint(color, 0.58), 0.22, 0.30);
  ctx.beginPath();
  ctx.roundRect(-13, -6.5, 10, 13, 2.5);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -12, -5, -4.5, -5, 0.3);
  ctx.beginPath();
  ctx.moveTo(-11, -6.5);
  ctx.lineTo(-11, 6.5);
  ctx.stroke();

  // Parka shoulders
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.fillStyle = lateralGradY(ctx, -8, 8, color, 0.34, 0.28);
  ctx.beginPath();
  ctx.ellipse(-1, 0, 5.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -4.6, -6.8, -4.6, -0.5, 0.3);

  // Helmet with spherical shading
  const helmetGrad = ctx.createRadialGradient(3, -1.2, 0.6, 4, 0, 4.4);
  helmetGrad.addColorStop(0, tint(color, 0.8));
  helmetGrad.addColorStop(1, tint(tint(color, 0.58), -0.24));
  ctx.fillStyle = helmetGrad;
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(2, -1, 4.5, 2);
}

/**
 * Safari Ranger / Scout
 */
function drawSafariRanger(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const step = Math.sin(timeMs * 0.011);

  // Walking staff
  ctx.strokeStyle = tint(color, -0.5);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(14 + step * 2.5, 9.5);
  ctx.stroke();

  // Field pack
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;
  ctx.fillStyle = axialGradX(ctx, -9, -2, tint(color, 0.58), 0.22, 0.3);
  ctx.beginPath();
  ctx.roundRect(-9, -5, 7, 10, 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -8.2, -3.8, -3, -3.8, 0.28);

  // Vest
  ctx.fillStyle = lateralGradY(ctx, -7, 7, color, 0.32, 0.26);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -3, -6, -3, -0.5, 0.28);

  // Wide-brim sun hat (dome + under-shadowed brim)
  const hatGrad = ctx.createRadialGradient(2.4, -1.4, 0.6, 3.5, 0, 6.4);
  hatGrad.addColorStop(0, tint(color, 0.8));
  hatGrad.addColorStop(1, tint(tint(color, 0.58), -0.16));
  ctx.fillStyle = hatGrad;
  ctx.beginPath();
  ctx.arc(3.5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lateralGradY(ctx, -3, 3, color, 0.3, 0.24);
  ctx.beginPath();
  ctx.arc(3.5, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Minimalist Modern City Wanderer
 */
function drawMinimalistWanderer(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Daypack
  ctx.fillStyle = axialGradX(ctx, -9, -2, tint(color, 0.58), 0.22, 0.3);
  ctx.beginPath();
  ctx.roundRect(-9, -5, 7, 10, 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -8.2, -3.8, -3, -3.8, 0.28);

  // Torso
  ctx.fillStyle = lateralGradY(ctx, -6.5, 6.5, color, 0.34, 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -2.9, -5.8, -2.9, -0.5, 0.3);

  // Head
  const headGrad = ctx.createRadialGradient(2.8, -1, 0.5, 3.6, 0, 4);
  headGrad.addColorStop(0, tint(color, 0.8));
  headGrad.addColorStop(1, tint(tint(color, 0.58), -0.22));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(3.6, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Forward heading tick
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.arc(8, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 4. WATERCRAFT & MARITIME (+X is forward heading)
// Hulls get wet-metal cylindrical shading; deck furniture is front-lit.
// =========================================================================

/**
 * Expedition Catamaran
 */
function drawExpeditionCatamaran(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Wake trails behind (-X)
  const wakePhase = (timeMs * 0.003) % 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(-30 - wakePhase * 15, -16 - wakePhase * 7);
  ctx.moveTo(-8, 8);
  ctx.lineTo(-30 - wakePhase * 15, 16 + wakePhase * 7);
  ctx.stroke();

  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Twin hulls (lit -Y hull, shaded +Y hull)
  ctx.fillStyle = lateralGradY(ctx, -12, -4, tint(color, 0.58), 0.3, 0.22);
  ctx.beginPath();
  ctx.moveTo(17, -8);
  ctx.quadraticCurveTo(8, -12, -16, -10);
  ctx.lineTo(-16, -6);
  ctx.quadraticCurveTo(8, -4, 17, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lateralGradY(ctx, 4, 12, tint(color, 0.58), 0.18, 0.3);
  ctx.beginPath();
  ctx.moveTo(17, 8);
  ctx.quadraticCurveTo(8, 4, -16, 6);
  ctx.lineTo(-16, 10);
  ctx.quadraticCurveTo(8, 12, 17, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central Bridge Salon in accent color
  ctx.fillStyle = axialGradX(ctx, -8, 7, color, 0.24, 0.28);
  ctx.beginPath();
  ctx.roundRect(-8, -6, 15, 12, 2.5);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -6.4, -4.2, 4.4, -4.2, 0.3);

  // Windows in dark glazing
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(2, -4, 3.5, 8);
}

/**
 * Modern Ocean Yacht
 */
function drawModernMotorYacht(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Wake
  const wakePhase = (timeMs * 0.003) % 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-28 - wakePhase * 14, -15 - wakePhase * 7);
  ctx.moveTo(12, 0);
  ctx.lineTo(-28 - wakePhase * 14, 15 + wakePhase * 7);
  ctx.stroke();

  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Yacht hull
  ctx.fillStyle = lateralGradY(ctx, -9, 9, tint(color, 0.58), 0.34, 0.30);
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.bezierCurveTo(11, -9, -11, -9, -16, -7);
  ctx.lineTo(-16, 7);
  ctx.bezierCurveTo(-11, 9, 11, 9, 19, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Teak foredeck in accent color
  ctx.fillStyle = axialGradX(ctx, 6, 17, color, 0.26, 0.2);
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(6, -5.5);
  ctx.lineTo(6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  sheen(ctx, 9, -2.8, 15, -0.6, 0.26);

  // Superstructure
  ctx.fillStyle = lateralGradY(ctx, -5.5, 5.5, tint(color, 0.58), 0.26, 0.3);
  ctx.beginPath();
  ctx.roundRect(-9, -5.5, 14, 11, 2.5);
  ctx.fill();
  ctx.stroke();
  sheen(ctx, -7.6, -3.9, 3, -3.9, 0.3);

  // Windscreen
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(1, -4, 3, 8);
}

/**
 * Zodiac / RIB Speedboat
 */
function drawZodiacSpeedboat(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Twin outboards
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(-16, -5, 4.5, 3);
  ctx.fillRect(-16, 2, 4.5, 3);

  // Inflatable collar (tube shading)
  ctx.fillStyle = lateralGradY(ctx, -8, 8, tint(color, 0.58), 0.36, 0.3);
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.bezierCurveTo(11, -8, -10, -8, -13, -6);
  ctx.lineTo(-13, 6);
  ctx.bezierCurveTo(-10, 8, 11, 8, 16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Collar sheen along the lit tube
  sheen(ctx, -10, -6.6, 12, -5.6, 0.32);

  // Inner deck in accent color
  ctx.fillStyle = axialGradX(ctx, -9, 5, color, 0.24, 0.26);
  ctx.beginPath();
  ctx.roundRect(-9, -4.5, 14, 9, 2);
  ctx.fill();
  ctx.stroke();

  // Console
  ctx.fillStyle = tint(color, -0.66);
  ctx.fillRect(0, -2.5, 3.5, 5);
}

/**
 * Ocean Sloop / Sailboat
 */
function drawOceanSailboat(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Hull
  ctx.fillStyle = lateralGradY(ctx, -7.5, 7.5, tint(color, 0.58), 0.36, 0.30);
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(10, -7.5, -9, -6.5, -15, -4.5);
  ctx.lineTo(-15, 4.5);
  ctx.bezierCurveTo(-9, 6.5, 10, 7.5, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gunwale sheen
  sheen(ctx, -11, -5.2, 14, -3.4, 0.3);

  // Cockpit in accent color
  ctx.fillStyle = axialGradX(ctx, -11, -2, color, 0.22, 0.26);
  ctx.beginPath();
  ctx.roundRect(-11, -3.5, 9, 7, 1.5);
  ctx.fill();
  ctx.stroke();

  // Mainsail boom
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(-13, 0);
  ctx.stroke();

  // Mast step
  ctx.fillStyle = axialGradX(ctx, 1, 5, color);
  ctx.beginPath();
  ctx.arc(3, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// =========================================================================
// 5. RAIL & TRANSIT (+X is forward heading)
// =========================================================================

/**
 * Bullet Train (Shinkansen)
 */
function drawBulletTrain(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Needle nose locomotive body
  ctx.fillStyle = lateralGradY(ctx, -5.5, 5.5, tint(color, 0.58), 0.38, 0.32);
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.bezierCurveTo(15, -5.5, 5, -5.5, -18, -5.5);
  ctx.lineTo(-18, 5.5);
  ctx.bezierCurveTo(5, 5.5, 15, 5.5, 21, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Nose sheen
  sheen(ctx, 6, -3.6, 16, -1.6, 0.34);

  // Livery stripes in accent color
  ctx.fillStyle = axialGradX(ctx, -14, 9, color, 0.24, 0.18);
  ctx.fillRect(-14, -5.5, 23, 2);
  ctx.fillRect(-14, 3.5, 23, 2);

  // Cockpit windshield chevron
  ctx.fillStyle = tint(color, -0.66);
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(10, -3);
  ctx.lineTo(8.5, -3);
  ctx.lineTo(12, 0);
  ctx.lineTo(8.5, 3);
  ctx.lineTo(10, 3);
  ctx.closePath();
  ctx.fill();
}

/**
 * Panorama Glacier Train
 */
function drawPanoramaGlacierTrain(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Body in accent color
  ctx.fillStyle = lateralGradY(ctx, -6.5, 6.5, color, 0.3, 0.26);
  ctx.beginPath();
  ctx.roundRect(-17, -6.5, 34, 13, 3);
  ctx.fill();
  ctx.stroke();

  // Roof sheen along the lit side
  sheen(ctx, -14, -4.8, 12, -4.8, 0.3);

  // Panoramic curved glass domes
  const domeGradL = ctx.createLinearGradient(0, -4.5, 0, 4.5);
  domeGradL.addColorStop(0, tint(color, -0.42));
  domeGradL.addColorStop(0.5, tint(color, -0.66));
  domeGradL.addColorStop(1, tint(color, -0.78));
  ctx.fillStyle = domeGradL;
  ctx.beginPath();
  ctx.roundRect(-12, -4.5, 11, 9, 2);
  ctx.fill();
  ctx.stroke();
  glassStreak(ctx, -8.5, -1.5, 5);

  const domeGradR = ctx.createLinearGradient(0, -4.5, 0, 4.5);
  domeGradR.addColorStop(0, tint(color, -0.42));
  domeGradR.addColorStop(0.5, tint(color, -0.66));
  domeGradR.addColorStop(1, tint(color, -0.78));
  ctx.fillStyle = domeGradR;
  ctx.beginPath();
  ctx.roundRect(2, -4.5, 11, 9, 2);
  ctx.fill();
  ctx.stroke();
  glassStreak(ctx, 5.5, -1.5, 5);
}

// =========================================================================
// 6. CYCLING (+X is forward heading)
// =========================================================================

/**
 * Gravel Bikepacking Rig
 */
function drawGravelBike(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Wheels in dark
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(9, -1.8, 7.5, 3.6);
  ctx.fillRect(-15, -1.8, 7.5, 3.6);

  // Drop handlebars
  ctx.beginPath();
  ctx.moveTo(8, -6);
  ctx.lineTo(8, 6);
  ctx.stroke();

  // Top tube in accent color (gradient stroke = tubular shading)
  const tubeGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  tubeGrad.addColorStop(0, tint(color, 0.32));
  tubeGrad.addColorStop(1, tint(color, -0.18));
  ctx.strokeStyle = tubeGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-12, 0);
  ctx.stroke();

  // Bikepacking frame bag
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2;
  ctx.fillStyle = lateralGradY(ctx, -2, 2, tint(color, 0.58), 0.3, 0.24);
  ctx.beginPath();
  ctx.roundRect(-4, -2, 7, 4, 1.5);
  ctx.fill();
  ctx.stroke();

  // Saddle
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.ellipse(-3, 0, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Modern Urban Commuter Bike
 */
function drawCommuterBike(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = tint(color, -0.84);
  ctx.lineWidth = 2.2;

  // Wheels
  ctx.fillStyle = tint(color, -0.84);
  ctx.fillRect(8, -1.5, 7, 3);
  ctx.fillRect(-13, -1.5, 7, 3);

  // Flat bars
  ctx.beginPath();
  ctx.moveTo(8, -6);
  ctx.lineTo(8, 6);
  ctx.stroke();

  // Frame in accent (tubular gradient stroke)
  const tubeGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  tubeGrad.addColorStop(0, tint(color, 0.32));
  tubeGrad.addColorStop(1, tint(color, -0.18));
  ctx.strokeStyle = tubeGrad;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-10, 0);
  ctx.stroke();

  // Saddle
  ctx.fillStyle = tint(color, -0.84);
  ctx.beginPath();
  ctx.arc(-2, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// AIRCRAFT GROUND SHADOW
// Matches the silhouette in the reference
// =========================================================================

function drawAircraftGroundShadow(ctx: CanvasRenderingContext2D, iconId: string): void {
  if (iconId === 'helicopter') {
    ctx.beginPath();
    ctx.ellipse(2, 0, 13, 7, 0, 0, Math.PI * 2);
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (iconId === 'hot-air-balloon') {
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (iconId === 'plane-bush' || iconId === 'plane-twin') {
    ctx.beginPath();
    ctx.ellipse(2, 0, 18, 4.5, 0, 0, Math.PI * 2);
    ctx.rect(-2, -26, 7, 52);
    ctx.fill();
    return;
  }

  // Jetliner shadow (exact match to reference plane)
  ctx.beginPath();
  // Fuselage
  ctx.ellipse(3, 0, 22, 5, 0, 0, Math.PI * 2);
  // Wings
  ctx.moveTo(3, -4.5);
  ctx.lineTo(-7, -27);
  ctx.lineTo(-12, -27);
  ctx.lineTo(-4, -4.5);
  ctx.moveTo(3, 4.5);
  ctx.lineTo(-7, 27);
  ctx.lineTo(-12, 27);
  ctx.lineTo(-4, 4.5);
  // Horizontal stabilizers
  ctx.moveTo(-14, -2.5);
  ctx.lineTo(-21, -12);
  ctx.lineTo(-24, -12);
  ctx.lineTo(-19, -2.5);
  ctx.moveTo(-14, 2.5);
  ctx.lineTo(-21, 12);
  ctx.lineTo(-24, 12);
  ctx.lineTo(-19, 2.5);
  ctx.fill();

  ctx.fillStyle = OUTLINE_COLOR;
}
