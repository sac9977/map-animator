import { TransportMode } from '../types/travel';

export interface VehicleDrawOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angleRad: number; // heading angle in radians
  mode: TransportMode;
  color: string;
  scale: number;
  altitudeRatio?: number; // 0 (ground) to 1 (cruising height) for flight
  timeMs: number;
  showTrail: boolean;
  trailColor: string;
}

/**
 * Draw vehicle sprite with dynamic animations (wheels, contrails, wake, lights)
 */
export function drawAnimatedVehicle(options: VehicleDrawOptions): void {
  const { ctx, x, y, angleRad, mode, color, scale, altitudeRatio = 0, timeMs } = options;

  ctx.save();
  ctx.translate(x, y);

  // Flight-specific shadow on ground + 3D scale elevation
  if (mode === 'flight') {
    const flightElev = altitudeRatio * 28;
    const shadowOffset = altitudeRatio * 20;

    // Projected ground shadow
    ctx.save();
    ctx.translate(shadowOffset * 0.5, shadowOffset);
    ctx.rotate(angleRad);
    ctx.scale(scale * (1 + altitudeRatio * 0.15), scale * (1 + altitudeRatio * 0.15));
    ctx.fillStyle = `rgba(15, 23, 42, ${Math.max(0.08, 0.35 - altitudeRatio * 0.2)})`;
    drawAirplaneSilhouette(ctx);
    ctx.restore();

    // Actual airplane at flight altitude
    ctx.save();
    ctx.translate(0, -flightElev);
    ctx.rotate(angleRad);
    ctx.scale(scale * (1 + altitudeRatio * 0.35), scale * (1 + altitudeRatio * 0.35));
    drawAirplane(ctx, color, timeMs);
    ctx.restore();

    ctx.restore();
    return;
  }

  // Ground / Water vehicles
  ctx.rotate(angleRad);
  ctx.scale(scale, scale);

  // Soft vehicle ground contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (mode) {
    case 'suv':
      drawSafari4WD(ctx, color, timeMs);
      break;
    case 'car':
      drawPassengerCar(ctx, color);
      break;
    case 'camper':
      drawCamperVan(ctx, color);
      break;
    case 'motorcycle':
      drawMotorcycle(ctx, color, timeMs);
      break;
    case 'train':
      drawTrain(ctx, color);
      break;
    case 'boat':
      drawBoat(ctx, color, timeMs);
      break;
    case 'hike':
      drawHiker(ctx, color, timeMs);
      break;
    case 'bicycle':
      drawBicycle(ctx, color, timeMs);
      break;
    default:
      drawPassengerCar(ctx, color);
      break;
  }

  ctx.restore();
}

/**
 * Commercial Jet / Safari Aircraft
 */
function drawAirplane(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Fuselage
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cockpit windshield
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(14, 0, 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings with custom accent color
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.lineTo(-8, -26);
  ctx.lineTo(-13, -26);
  ctx.lineTo(-5, -4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.lineTo(-8, 26);
  ctx.lineTo(-13, 26);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();

  // Jet engines
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-6, -14, 8, 3.5);
  ctx.fillRect(-6, 10.5, 8, 3.5);

  // Tail fin & horizontal stabilizers
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-27, -10);
  ctx.lineTo(-21, -2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(-24, 10);
  ctx.lineTo(-27, 10);
  ctx.lineTo(-21, 2);
  ctx.closePath();
  ctx.fill();

  // Vertical fin
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-19, 0, 4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Contrail jets animation
  const contrailAlpha = 0.5 + Math.sin(timeMs * 0.01) * 0.2;
  ctx.fillStyle = `rgba(255, 255, 255, ${contrailAlpha})`;
  ctx.fillRect(-38, -13, 30, 2);
  ctx.fillRect(-38, 11, 30, 2);
}

function drawAirplaneSilhouette(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 5.5, 0, 0, Math.PI * 2);
  ctx.moveTo(2, -4);
  ctx.lineTo(-8, -26);
  ctx.lineTo(-13, -26);
  ctx.lineTo(-5, -4);
  ctx.moveTo(2, 4);
  ctx.lineTo(-8, 26);
  ctx.lineTo(-13, 26);
  ctx.lineTo(-5, 4);
  ctx.fill();
}

/**
 * 4WD Safari Land Cruiser (with headlights, roof rack, and spare tire)
 */
function drawSafari4WD(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Headlight illumination beam on road ahead
  ctx.save();
  const grad = ctx.createRadialGradient(20, 0, 4, 55, 0, 35);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
  grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(14, -6);
  ctx.lineTo(55, -25);
  ctx.lineTo(55, 25);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Wheels (top-down view)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(8, -12, 8, 4);
  ctx.fillRect(-12, -12, 8, 4);
  ctx.fillRect(8, 8, 8, 4);
  ctx.fillRect(-12, 8, 8, 4);

  // Main 4WD Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-16, -9, 32, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#0E6466';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Windshield & windows (tinted safari glass)
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(3, -7, 6, 14); // Front windshield
  ctx.fillRect(-10, -7, 10, 14); // Cabin

  // Safari Roof Rack & luggage
  ctx.fillStyle = '#D97706'; // Safari canvas baggage
  ctx.fillRect(-6, -5, 7, 10);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(-9, -6, 14, 12);

  // Rear mounted spare tire
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-18, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(-18, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(15, -7, 2, 3);
  ctx.fillRect(15, 4, 2, 3);
}

/**
 * Passenger Car
 */
function drawPassengerCar(ctx: CanvasRenderingContext2D, color: string): void {
  // Wheels
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(6, -10, 7, 3);
  ctx.fillRect(-11, -10, 7, 3);
  ctx.fillRect(6, 7, 7, 3);
  ctx.fillRect(-11, 7, 7, 3);

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-15, -8, 30, 16, 5);
  ctx.fill();
  ctx.strokeStyle = '#00000022';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Roof & windows
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, -6, 14, 12);
  ctx.fillStyle = color;
  ctx.fillRect(-4, -5, 10, 10);

  // Lights
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(14, -6, 2, 2.5);
  ctx.fillRect(14, 3.5, 2, 2.5);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-16, -6, 2, 2.5);
  ctx.fillRect(-16, 3.5, 2, 2.5);
}

/**
 * Camper Van
 */
function drawCamperVan(ctx: CanvasRenderingContext2D, color: string): void {
  // Wheels
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(8, -11, 7, 3.5);
  ctx.fillRect(-12, -11, 7, 3.5);
  ctx.fillRect(8, 7.5, 7, 3.5);
  ctx.fillRect(-12, 7.5, 7, 3.5);

  // Boxy Van Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -8.5, 36, 17, 3);
  ctx.fill();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Pop-up sleeper roof
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(-10, -6, 20, 12);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(10, -6.5, 4, 13); // Front windshield
}

/**
 * Motorcycle with leaning dynamic
 */
function drawMotorcycle(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Front & rear wheels
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(10, -2, 7, 4);
  ctx.fillRect(-15, -2, 7, 4);

  // Frame & tank
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Handlebars
  ctx.fillStyle = '#475569';
  ctx.fillRect(6, -6, 3, 12);

  // Rider helmet (top-down view)
  ctx.fillStyle = '#0E6466';
  ctx.beginPath();
  ctx.arc(-2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(1, -2.5, 2, 5);
}

/**
 * Train
 */
function drawTrain(ctx: CanvasRenderingContext2D, color: string): void {
  // Locomotive body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -6, 36, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Windshield
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(12, -4.5, 4, 9);

  // Carriage coupler & trailing car outline
  ctx.fillStyle = '#475569';
  ctx.fillRect(-22, -2, 5, 4);

  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.roundRect(-42, -5.5, 20, 11, 2);
  ctx.fill();
}

/**
 * Yacht / Expedition Boat with wake ripples
 */
function drawBoat(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Nautical wake waves trailing behind
  ctx.save();
  const wakePhase = (timeMs * 0.003) % 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-30 - wakePhase * 15, -16 - wakePhase * 10);
  ctx.moveTo(10, 0);
  ctx.lineTo(-30 - wakePhase * 15, 16 + wakePhase * 10);
  ctx.stroke();
  ctx.restore();

  // Boat Hull (pointed bow)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(12, -9, -12, -9, -16, -7);
  ctx.lineTo(-16, 7);
  ctx.bezierCurveTo(-12, 9, 12, 9, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0E6466';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Deck Cabin
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-8, -5, 16, 10, 2);
  ctx.fill();

  // Sun deck / Bridge windows
  ctx.fillStyle = '#0891B2';
  ctx.fillRect(2, -4, 4, 8);
}

/**
 * Backpacker Hiker (with backpack, walking sticks, and step cycle)
 */
function drawHiker(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  const stepCycle = Math.sin(timeMs * 0.012);

  // Walking stick points
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(8 + stepCycle * 3, -8);
  ctx.moveTo(0, 7);
  ctx.lineTo(8 - stepCycle * 3, 8);
  ctx.stroke();

  // Trekking Backpack (rear)
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.ellipse(-7, 0, 5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Shoulders & arms
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Safari Explorer Sun Hat
  ctx.fillStyle = '#F4F1EA';
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0E6466';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hat crown
  ctx.fillStyle = '#0E6466';
  ctx.beginPath();
  ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Bicycle & Rider
 */
function drawBicycle(ctx: CanvasRenderingContext2D, color: string, timeMs: number): void {
  // Wheels
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(9, -1.5, 6, 3);
  ctx.fillRect(-13, -1.5, 6, 3);

  // Bike frame
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-10, 0);
  ctx.stroke();

  // Handlebars
  ctx.fillStyle = '#475569';
  ctx.fillRect(7, -5, 2, 10);

  // Cyclist Helmet
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.ellipse(-2, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}
