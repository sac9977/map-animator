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

/**
 * Draw vehicle or traveler sprite with the bold-outline duotone top-down design language:
 * - Solid crisp dark outline (#0F172A, lineWidth 2.2, round joins/caps)
 * - Light neutral primary body (#F8FAFC / #F1F5F9)
 * - Vibrant accent panels using the leg's color (Amber / Savannah Teal / etc.)
 * - High-contrast cockpit/windshield cutouts (#0F172A)
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
    ctx.fillStyle = `rgba(15, 23, 42, ${Math.max(0.08, 0.35 - altitudeRatio * 0.2)})`;
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

  // Soft directional ground contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 17, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSpecificIcon(ctx, resolvedIconId, color, timeMs, 0);

  ctx.restore();
}

/**
 * Route to individual modern icon drawer
 */
function drawSpecificIcon(
  ctx: CanvasRenderingContext2D,
  iconId: string,
  color: string,
  timeMs: number,
  _altitudeRatio: number
): void {
  // Common line styles for bold-duotone system
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
// Matches user reference screenshot:
// - Swept wings in accent color (#F59E0B / leg color) with bold #0F172A outline
// - Cylindrical engine pods in #F1F5F9 with bold outline
// - Fuselage in #F1F5F9 with cockpit crescent cutout
// - Tail stabilizers in accent color with bold outline
// =========================================================================

/**
 * Modern Jetliner (Exact match to reference image)
 */
function drawModernJetliner(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  // Left Wing (accent color, bold dark outline)
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.lineTo(-7, -27);
  ctx.lineTo(-12, -27);
  ctx.lineTo(-4, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Wing (symmetric)
  ctx.beginPath();
  ctx.moveTo(3, 4.5);
  ctx.lineTo(-7, 27);
  ctx.lineTo(-12, 27);
  ctx.lineTo(-4, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Underslung Engine Nacelles (light grey #F1F5F9, bold outline)
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-4, -16.5, 11, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-4, 12, 11, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  // Horizontal Tail Stabilizers (accent color, bold outline)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-14, -2.5);
  ctx.lineTo(-21, -12);
  ctx.lineTo(-24, -12);
  ctx.lineTo(-19, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-14, 2.5);
  ctx.lineTo(-21, 12);
  ctx.lineTo(-24, 12);
  ctx.lineTo(-19, 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main Fuselage (light off-white #F1F5F9, bold #0F172A outline)
  ctx.fillStyle = '#F1F5F9';
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

  // Cockpit Crescent Cutout
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(15, 0, 2.8, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();
}

/**
 * Safari Bush Plane (High-wing Cessna Caravan)
 */
function drawBushPlane(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Straight High Wing in accent color with bold outline
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-2, -26, 7, 52, 2.5);
  ctx.fill();
  ctx.stroke();

  // Tailplane
  ctx.beginPath();
  ctx.roundRect(-18, -10, 4.5, 20, 1.5);
  ctx.fill();
  ctx.stroke();

  // Fuselage in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
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

  // Cockpit windshield arc
  ctx.strokeStyle = '#0F172A';
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
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(19, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Twin Turboprop Utility Aircraft
 */
function drawTwinTurboprop(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  // Wings with accent color
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-2, -25, 6.5, 50, 2);
  ctx.fill();
  ctx.stroke();

  // Engine nacelles in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-4, -15, 10, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-4, 10.5, 10, 4.5, 2);
  ctx.fill();
  ctx.stroke();

  // Propeller spinner dots
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(6.5, -12.75, 1.5, 0, Math.PI * 2);
  ctx.arc(6.5, 12.75, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Tailplane
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-17, -9, 4, 18, 1.5);
  ctx.fill();
  ctx.stroke();

  // Fuselage
  ctx.fillStyle = '#F1F5F9';
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

  // Cockpit
  ctx.strokeStyle = '#0F172A';
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
  ctx.strokeStyle = '#0F172A';
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
  ctx.fillStyle = color;
  ctx.fillRect(-26, -4, 3, 8);

  // Teardrop fuselage in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.ellipse(2, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cockpit canopy in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(8, 0, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spinning 4-blade rotor
  const rotorAngle = (timeMs * 0.04) % (Math.PI * 2);
  ctx.save();
  ctx.rotate(rotorAngle);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.fillStyle = color;
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
  // Outer circle with bold outline
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.4;

  // Duotone alternating segments
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, -Math.PI / 4, Math.PI / 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, (3 * Math.PI) / 4, (5 * Math.PI) / 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner ring
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Burner flame core
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 2. OVERLAND & ROAD VEHICLES (+X is forward heading)
// =========================================================================

/**
 * Modern Overland Safari 4x4 (Defender style)
 */
function drawExpedition4x4(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Side mirrors
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(8, -11, 2.5, 2);
  ctx.fillRect(8, 9, 2.5, 2);

  // Rear mounted spare tire
  ctx.beginPath();
  ctx.arc(-18, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-18, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Main chassis in #F1F5F9 with bold outline
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-16, -9, 32, 18, 4);
  ctx.fill();
  ctx.stroke();

  // Front Hood Panel in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(8, -7.5, 7, 15, 2);
  ctx.fill();
  ctx.stroke();

  // Windshield in #0F172A
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(5, -7.5, 3, 15);

  // Expedition Roof Rack & storage pod
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-12, -7, 14, 14, 2);
  ctx.fill();
  ctx.stroke();
  // Rack divider lines
  ctx.beginPath();
  ctx.moveTo(-5, -7);
  ctx.lineTo(-5, 7);
  ctx.stroke();

  // Front LED Headlights
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(15.5, -7.5, 1.5, 3);
  ctx.fillRect(15.5, 4.5, 1.5, 3);
}

/**
 * Modern Luxury Rover / Aerodynamic SUV
 */
function drawModernLuxuryRover(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Mirrors
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(8, -10.5, 2.5, 2);
  ctx.fillRect(8, 8.5, 2.5, 2);

  // Sculpted body in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-16, -8.5, 32, 17, 5.5);
  ctx.fill();
  ctx.stroke();

  // Hood in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(8, -7, 7, 14, 2);
  ctx.fill();
  ctx.stroke();

  // Panoramic Black Glass Canopy
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-10, -6.5, 16, 13, 2.5);
  ctx.fill();

  // Glass highlight
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.lineTo(-5, 4.5);
  ctx.stroke();

  // Front laser headlights
  ctx.strokeStyle = '#0F172A';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(15.5, -6, 1.5, 12);

  // Rear light blade
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-16.5, -6, 1.2, 12);
}

/**
 * Adventure Vanlife Camper (Sprinter 4x4)
 */
function drawAdventureCamperVan(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Mirrors
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(11, -11, 2.5, 2);
  ctx.fillRect(11, 9, 2.5, 2);

  // Van body
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-19, -9, 37, 18, 4);
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(10, -7.5, 4, 15);

  // Rooftop solar array in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-12, -7, 19, 14, 2);
  ctx.fill();
  ctx.stroke();

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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Fastback body in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 16, 6);
  ctx.fill();
  ctx.stroke();

  // Hood in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(8, -6.5, 7, 13, 2);
  ctx.fill();
  ctx.stroke();

  // Glass canopy
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-9, -6, 15, 12, 3);
  ctx.fill();

  // Front & rear light blades
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(15.5, -5, 1.2, 10);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-16.2, -5, 1.2, 10);
}

/**
 * Classic Heritage 4x4
 */
function drawClassicHeritage4x4(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Front bumper
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(16, -9, 2.5, 18);

  // Body
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-15, -8.5, 30, 17, 3);
  ctx.fill();
  ctx.stroke();

  // Square hood in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(7, -7, 8, 14, 1.5);
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(4, -7, 2.5, 14);

  // Canvas open bed
  ctx.fillStyle = '#F1F5F9';
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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Handlebars
  ctx.beginPath();
  ctx.moveTo(8, -9);
  ctx.lineTo(8, 9);
  ctx.stroke();

  // Front wheel
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(11, -2, 7, 4);

  // Twin Aluminum Panniers in #F1F5F9 with bold outline
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-15, -8.5, 8, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-15, 4, 8, 4.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // Fuel tank in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Seat & rear wheel
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-8, -2, 4, 4);
  ctx.fillRect(-16, -2, 7, 4);
}

// =========================================================================
// 3. HUMAN & TREKKERS (+X is forward heading)
// =========================================================================

/**
 * Modern Explorer / Trekker
 */
function drawModernHiker(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const step = Math.sin(timeMs * 0.012);

  // Trekking poles with swinging cadence (+X forward)
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(13 + step * 3.5, -9);
  ctx.moveTo(0, 7);
  ctx.lineTo(13 - step * 3.5, 9);
  ctx.stroke();

  // Technical backpack in #F1F5F9 with bold outline
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-11, -5.5, 9, 11, 2.5);
  ctx.fill();
  ctx.stroke();

  // Explorer jacket/shoulders in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head in #F1F5F9 with cap visor forward (+X)
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(3.5, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cap visor in #0F172A pointing forward
  ctx.fillStyle = '#0F172A';
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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(6 + cadence * 4.5, -7.5);
  ctx.moveTo(0, 5);
  ctx.lineTo(6 - cadence * 4.5, 7.5);
  ctx.stroke();

  // Hydration vest
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-8, -4.5, 6, 9, 2);
  ctx.fill();

  // Torso in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Visor
  ctx.fillStyle = '#0F172A';
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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(13 + step * 2, -10);
  ctx.stroke();
  // Ice axe pick head
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(11 + step * 2, -12);
  ctx.lineTo(15 + step * 2, -9);
  ctx.lineTo(9 + step * 2, -8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Heavy backpack in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-13, -6.5, 10, 13, 2.5);
  ctx.fill();
  ctx.stroke();

  // Parka shoulders in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 5.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Helmet in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(2, -1, 4.5, 2);
}

/**
 * Safari Ranger / Scout
 */
function drawSafariRanger(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const step = Math.sin(timeMs * 0.011);

  // Walking staff
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(14 + step * 2.5, 9.5);
  ctx.stroke();

  // Field pack in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-9, -5, 7, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Vest in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wide-brim sun hat
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(3.5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(3.5, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Minimalist Modern City Wanderer
 */
function drawMinimalistWanderer(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Daypack in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-9, -5, 7, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Torso in accent
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(3.6, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Forward heading tick
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(8, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 4. WATERCRAFT & MARITIME (+X is forward heading)
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

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Twin hulls in #F1F5F9 with bold outline
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(17, -8);
  ctx.quadraticCurveTo(8, -12, -16, -10);
  ctx.lineTo(-16, -6);
  ctx.quadraticCurveTo(8, -4, 17, -8);
  ctx.moveTo(17, 8);
  ctx.quadraticCurveTo(8, 4, -16, 6);
  ctx.lineTo(-16, 10);
  ctx.quadraticCurveTo(8, 12, 17, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central Bridge Salon in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-8, -6, 15, 12, 2.5);
  ctx.fill();
  ctx.stroke();

  // Windows in #0F172A
  ctx.fillStyle = '#0F172A';
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

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Yacht hull in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.bezierCurveTo(11, -9, -11, -9, -16, -7);
  ctx.lineTo(-16, 7);
  ctx.bezierCurveTo(-11, 9, 11, 9, 19, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Teak foredeck in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(6, -5.5);
  ctx.lineTo(6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Superstructure in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-9, -5.5, 14, 11, 2.5);
  ctx.fill();
  ctx.stroke();

  // Windscreen
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(1, -4, 3, 8);
}

/**
 * Zodiac / RIB Speedboat
 */
function drawZodiacSpeedboat(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Twin outboards
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-16, -5, 4.5, 3);
  ctx.fillRect(-16, 2, 4.5, 3);

  // Collar in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.bezierCurveTo(11, -8, -10, -8, -13, -6);
  ctx.lineTo(-13, 6);
  ctx.bezierCurveTo(-10, 8, 11, 8, 16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner deck in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-9, -4.5, 14, 9, 2);
  ctx.fill();
  ctx.stroke();

  // Console
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, -2.5, 3.5, 5);
}

/**
 * Ocean Sloop / Sailboat
 */
function drawOceanSailboat(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Hull in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(10, -7.5, -9, -6.5, -15, -4.5);
  ctx.lineTo(-15, 4.5);
  ctx.bezierCurveTo(-9, 6.5, 10, 7.5, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit in accent color
  ctx.fillStyle = color;
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
  ctx.fillStyle = color;
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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Needle nose locomotive body in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.bezierCurveTo(15, -5.5, 5, -5.5, -18, -5.5);
  ctx.lineTo(-18, 5.5);
  ctx.bezierCurveTo(5, 5.5, 15, 5.5, 21, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Livery stripes in accent color
  ctx.fillStyle = color;
  ctx.fillRect(-14, -5.5, 23, 2);
  ctx.fillRect(-14, 3.5, 23, 2);

  // Cockpit windshield chevron
  ctx.fillStyle = '#0F172A';
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
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Body in accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-17, -6.5, 34, 13, 3);
  ctx.fill();
  ctx.stroke();

  // Panoramic curved glass domes in #F1F5F9
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-12, -4.5, 11, 9, 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(2, -4.5, 11, 9, 2);
  ctx.fill();
  ctx.stroke();
}

// =========================================================================
// 6. CYCLING (+X is forward heading)
// =========================================================================

/**
 * Gravel Bikepacking Rig
 */
function drawGravelBike(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Wheels in dark
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(9, -1.8, 7.5, 3.6);
  ctx.fillRect(-15, -1.8, 7.5, 3.6);

  // Drop handlebars
  ctx.beginPath();
  ctx.moveTo(8, -6);
  ctx.lineTo(8, 6);
  ctx.stroke();

  // Top tube in accent color
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-12, 0);
  ctx.stroke();

  // Bikepacking frame bag in #F1F5F9 with bold outline
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(-4, -2, 7, 4, 1.5);
  ctx.fill();
  ctx.stroke();

  // Saddle
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(-3, 0, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Modern Urban Commuter Bike
 */
function drawCommuterBike(ctx: CanvasRenderingContext2D, color: string, _timeMs: number): void {
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;

  // Wheels
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(8, -1.5, 7, 3);
  ctx.fillRect(-13, -1.5, 7, 3);

  // Flat bars
  ctx.beginPath();
  ctx.moveTo(8, -6);
  ctx.lineTo(8, 6);
  ctx.stroke();

  // Frame in accent
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-10, 0);
  ctx.stroke();

  // Saddle
  ctx.fillStyle = '#0F172A';
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
}
