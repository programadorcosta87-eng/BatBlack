import { BatState, Obstacle, Cloud, GroundDetail, Star } from './types';

/**
 * Helper to draw a pixel block
 */
function p(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w = 2,
  h = 2
) {
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

/**
 * Draw the Bat player character
 */
export function drawBat(
  ctx: CanvasRenderingContext2D,
  bat: BatState,
  isNight: boolean
): void {
  ctx.save();
  ctx.translate(Math.floor(bat.x), Math.floor(bat.y));
  ctx.rotate((bat.rotation * Math.PI) / 180);

  const mainColor = isNight ? '#FFFFFF' : '#202124';
  const eyeColor = isNight ? '#202124' : '#FFFFFF';
  const detailColor = isNight ? '#CCCCCC' : '#444444';

  ctx.fillStyle = mainColor;

  const s = 2; // pixel scale
  const frame = bat.isHit ? 3 : bat.flapFrame % 3;

  // Center the bat sprite around (0, 0)
  // Sprite is ~18x12 pixels in grid -> 36x24px
  const ox = -18;
  const oy = -12;

  // --- BAT BODY ---
  // Head & Body (Center 6x7 pixels)
  for (let r = 2; r <= 8; r++) {
    const rx = (r === 2 || r === 8) ? 2 : (r === 3 || r === 7) ? 3 : 4;
    ctx.fillRect(ox + (9 - rx) * s, oy + r * s, rx * 2 * s, s);
  }

  // Bat Ears
  p(ctx, ox + 6 * s, oy + 0 * s, s, s * 2);
  p(ctx, ox + 11 * s, oy + 0 * s, s, s * 2);

  // Tiny fangs
  ctx.fillRect(ox + 8 * s, oy + 7 * s, s, s);
  ctx.fillRect(ox + 10 * s, oy + 7 * s, s, s);

  // --- BAT WINGS ---
  if (frame === 0) {
    // Wings UP
    // Left wing
    p(ctx, ox + 2 * s, oy + 0 * s, 3 * s, s);
    p(ctx, ox + 1 * s, oy + 1 * s, 5 * s, s);
    p(ctx, ox + 0 * s, oy + 2 * s, 6 * s, s);
    p(ctx, ox + 1 * s, oy + 3 * s, 6 * s, s);
    p(ctx, ox + 2 * s, oy + 4 * s, 5 * s, s);
    p(ctx, ox + 4 * s, oy + 5 * s, 3 * s, s);

    // Right wing
    p(ctx, ox + 13 * s, oy + 0 * s, 3 * s, s);
    p(ctx, ox + 12 * s, oy + 1 * s, 5 * s, s);
    p(ctx, ox + 12 * s, oy + 2 * s, 6 * s, s);
    p(ctx, ox + 11 * s, oy + 3 * s, 6 * s, s);
    p(ctx, ox + 11 * s, oy + 4 * s, 5 * s, s);
    p(ctx, ox + 11 * s, oy + 5 * s, 3 * s, s);
  } else if (frame === 1) {
    // Wings MIDDLE / HORIZONTAL
    // Left wing
    p(ctx, ox + 0 * s, oy + 3 * s, 6 * s, s);
    p(ctx, ox + 0 * s, oy + 4 * s, 7 * s, s);
    p(ctx, ox + 1 * s, oy + 5 * s, 6 * s, s);
    p(ctx, ox + 2 * s, oy + 6 * s, 5 * s, s);
    p(ctx, ox + 4 * s, oy + 7 * s, 3 * s, s);

    // Right wing
    p(ctx, ox + 12 * s, oy + 3 * s, 6 * s, s);
    p(ctx, ox + 11 * s, oy + 4 * s, 7 * s, s);
    p(ctx, ox + 11 * s, oy + 5 * s, 6 * s, s);
    p(ctx, ox + 11 * s, oy + 6 * s, 5 * s, s);
    p(ctx, ox + 11 * s, oy + 7 * s, 3 * s, s);
  } else if (frame === 2) {
    // Wings DOWN
    // Left wing
    p(ctx, ox + 3 * s, oy + 4 * s, 4 * s, s);
    p(ctx, ox + 2 * s, oy + 5 * s, 5 * s, s);
    p(ctx, ox + 1 * s, oy + 6 * s, 6 * s, s);
    p(ctx, ox + 0 * s, oy + 7 * s, 6 * s, s);
    p(ctx, ox + 1 * s, oy + 8 * s, 5 * s, s);
    p(ctx, ox + 3 * s, oy + 9 * s, 3 * s, s);

    // Right wing
    p(ctx, ox + 11 * s, oy + 4 * s, 4 * s, s);
    p(ctx, ox + 11 * s, oy + 5 * s, 5 * s, s);
    p(ctx, ox + 11 * s, oy + 6 * s, 6 * s, s);
    p(ctx, ox + 12 * s, oy + 7 * s, 6 * s, s);
    p(ctx, ox + 12 * s, oy + 8 * s, 5 * s, s);
    p(ctx, ox + 12 * s, oy + 9 * s, 3 * s, s);
  } else {
    // Crash Frame: Stunned / Tilted wings
    p(ctx, ox + 0 * s, oy + 2 * s, 6 * s, 2 * s);
    p(ctx, ox + 12 * s, oy + 6 * s, 6 * s, 2 * s);
  }

  // --- EYES ---
  if (!bat.isHit) {
    ctx.fillStyle = eyeColor;
    p(ctx, ox + 7 * s, oy + 3 * s, s, s);
    p(ctx, ox + 10 * s, oy + 3 * s, s, s);
  } else {
    // "X" eyes when hit
    ctx.fillStyle = eyeColor;
    // Left X
    p(ctx, ox + 7 * s, oy + 3 * s, s, s);
    p(ctx, ox + 6 * s, oy + 2 * s, s, s);
    p(ctx, ox + 8 * s, oy + 4 * s, s, s);
    // Right X
    p(ctx, ox + 10 * s, oy + 3 * s, s, s);
    p(ctx, ox + 9 * s, oy + 2 * s, s, s);
    p(ctx, ox + 11 * s, oy + 4 * s, s, s);
  }

  ctx.restore();
}

/**
 * Altura 1: Gato Preto (Chão)
 */
export function drawCat(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  isNight: boolean
): void {
  const mainColor = isNight ? '#FFFFFF' : '#202124';
  const eyeColor = isNight ? '#202124' : '#FFFFFF';
  ctx.fillStyle = mainColor;

  const s = 2; // pixel scale
  const x = Math.floor(obs.x);
  const y = Math.floor(obs.y);
  const tailSway = obs.animFrame % 2 === 0 ? 0 : 1;

  // Cat silhouette sitting / crouching: 18x15 grid (36x30px)
  // Ears
  p(ctx, x + 4 * s, y + 0 * s, s, 2 * s);
  p(ctx, x + 7 * s, y + 0 * s, s, 2 * s);

  // Head
  p(ctx, x + 3 * s, y + 2 * s, 6 * s, 3 * s);

  // Eyes
  ctx.fillStyle = eyeColor;
  p(ctx, x + 4 * s, y + 3 * s, s, s);
  p(ctx, x + 7 * s, y + 3 * s, s, s);

  ctx.fillStyle = mainColor;

  // Neck / chest
  p(ctx, x + 4 * s, y + 5 * s, 6 * s, 2 * s);

  // Arched Back & Body
  p(ctx, x + 5 * s, y + 6 * s, 8 * s, 5 * s);
  p(ctx, x + 7 * s, y + 5 * s, 5 * s, 2 * s);

  // Front Paws
  p(ctx, x + 4 * s, y + 10 * s, 2 * s, 4 * s);
  p(ctx, x + 3 * s, y + 13 * s, 3 * s, s);

  // Hind Legs / Haunch
  p(ctx, x + 10 * s, y + 10 * s, 4 * s, 4 * s);
  p(ctx, x + 9 * s, y + 13 * s, 4 * s, s);

  // Animated Flicking Tail
  if (tailSway === 0) {
    p(ctx, x + 13 * s, y + 9 * s, 2 * s, s);
    p(ctx, x + 14 * s, y + 7 * s, s, 2 * s);
    p(ctx, x + 15 * s, y + 4 * s, s, 3 * s);
    p(ctx, x + 14 * s, y + 3 * s, s, s);
  } else {
    p(ctx, x + 13 * s, y + 9 * s, 2 * s, s);
    p(ctx, x + 15 * s, y + 8 * s, s, 2 * s);
    p(ctx, x + 16 * s, y + 5 * s, s, 3 * s);
    p(ctx, x + 15 * s, y + 4 * s, s, s);
  }
}

/**
 * Altura 2: Pedra Voadora (Meio)
 */
export function drawRock(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  isNight: boolean
): void {
  const mainColor = isNight ? '#FFFFFF' : '#202124';
  const detailColor = isNight ? '#202124' : '#FFFFFF';
  ctx.fillStyle = mainColor;

  const s = 2;
  const x = Math.floor(obs.x);
  const y = Math.floor(obs.y + obs.wobbleOffset);

  // Jagged Floating Asteroid / Rock: 17x13 grid (34x26px)
  p(ctx, x + 4 * s, y + 0 * s, 8 * s, s);
  p(ctx, x + 2 * s, y + 1 * s, 12 * s, 2 * s);
  p(ctx, x + 1 * s, y + 3 * s, 15 * s, 2 * s);
  p(ctx, x + 0 * s, y + 5 * s, 17 * s, 3 * s);
  p(ctx, x + 1 * s, y + 8 * s, 15 * s, 2 * s);
  p(ctx, x + 3 * s, y + 10 * s, 11 * s, 2 * s);
  p(ctx, x + 5 * s, y + 12 * s, 6 * s, s);

  // Crater & crack details (contrast pixels)
  ctx.fillStyle = detailColor;
  // Crater 1
  p(ctx, x + 4 * s, y + 3 * s, 2 * s, s);
  p(ctx, x + 4 * s, y + 4 * s, s, s);
  // Crater 2
  p(ctx, x + 10 * s, y + 6 * s, 3 * s, s);
  p(ctx, x + 11 * s, y + 7 * s, 2 * s, s);
  // Crack line
  p(ctx, x + 6 * s, y + 8 * s, s, s);
  p(ctx, x + 7 * s, y + 9 * s, 2 * s, s);
}

/**
 * Altura 3: Galho de Árvore (Em cima)
 */
export function drawBranch(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  isNight: boolean
): void {
  const mainColor = isNight ? '#FFFFFF' : '#202124';
  const detailColor = isNight ? '#202124' : '#FFFFFF';
  ctx.fillStyle = mainColor;

  const s = 2;
  const x = Math.floor(obs.x);
  const y = 0; // Anchored directly to top ceiling
  const height = Math.floor(obs.height);

  // Trunk descending from top
  p(ctx, x + 8 * s, y, 6 * s, height * 0.45);
  p(ctx, x + 6 * s, y + height * 0.4, 7 * s, height * 0.25);
  p(ctx, x + 4 * s, y + height * 0.6, 6 * s, height * 0.2);

  // Sharp lower branch tip
  p(ctx, x + 3 * s, y + height * 0.8, 4 * s, height * 0.12);
  p(ctx, x + 4 * s, y + height * 0.92, 2 * s, height * 0.08);

  // Side twigs and thorns
  // Left twig
  p(ctx, x + 1 * s, y + height * 0.5, 5 * s, 2 * s);
  p(ctx, x + 0 * s, y + height * 0.55, 3 * s, s);

  // Right twig
  p(ctx, x + 12 * s, y + height * 0.35, 5 * s, 2 * s);
  p(ctx, x + 15 * s, y + height * 0.4, 3 * s, 2 * s);

  // Pixel bark cracks
  ctx.fillStyle = detailColor;
  p(ctx, x + 9 * s, y + height * 0.2, s, 3 * s);
  p(ctx, x + 7 * s, y + height * 0.5, s, 2 * s);
}

/**
 * Draw Ground line and scrolling pebbles/grass
 */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  canvasWidth: number,
  details: GroundDetail[],
  isNight: boolean
): void {
  const color = isNight ? '#FFFFFF' : '#202124';
  ctx.fillStyle = color;

  // Solid ground line (2px height like Chrome Dino)
  ctx.fillRect(0, groundY, canvasWidth, 2);

  // Pixel pebbles & tufts below and on the ground
  for (const item of details) {
    const x = Math.floor(item.x);
    if (x < -20 || x > canvasWidth + 20) continue;

    if (item.type === 0) {
      // Single pebble
      p(ctx, x, groundY + 4, 2, 2);
    } else if (item.type === 1) {
      // Double pebble
      p(ctx, x, groundY + 5, 2, 2);
      p(ctx, x + 4, groundY + 7, 2, 2);
    } else if (item.type === 2) {
      // Little ground bump on the line
      p(ctx, x, groundY - 2, 4, 2);
      p(ctx, x + 1, groundY - 3, 2, 1);
    } else {
      // Small 8-bit grass sprout
      p(ctx, x, groundY - 3, 1, 3);
      p(ctx, x + 2, groundY - 5, 1, 5);
      p(ctx, x + 4, groundY - 2, 1, 2);
    }
  }
}

/**
 * Draw Pixel Clouds (Chrome Dino style)
 */
export function drawCloud(
  ctx: CanvasRenderingContext2D,
  cloud: Cloud,
  isNight: boolean
): void {
  // In day: subtle soft gray #D0D0D0; In night: dark grey #444444
  ctx.fillStyle = isNight ? '#3A3A3C' : '#D1D5DB';

  const x = Math.floor(cloud.x);
  const y = Math.floor(cloud.y);
  const s = 2;

  // Classic Dino cloud 22x6 grid
  p(ctx, x + 6 * s, y + 0 * s, 8 * s, s);
  p(ctx, x + 4 * s, y + 1 * s, 14 * s, s);
  p(ctx, x + 2 * s, y + 2 * s, 18 * s, 2 * s);
  p(ctx, x + 0 * s, y + 4 * s, 22 * s, 2 * s);
}

/**
 * Draw Moon & Stars in Night Mode
 */
export function drawNightSky(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  isNight: boolean,
  nightFade: number // 0 to 1
): void {
  if (nightFade <= 0) return;

  ctx.save();
  ctx.globalAlpha = nightFade;

  // Draw Crescent Moon in top-right
  const s = 2;
  const mx = 680;
  const my = 40;
  ctx.fillStyle = '#FFFFFF';

  // Moon shape (12x12 grid)
  p(ctx, mx + 4 * s, my + 0 * s, 4 * s, s);
  p(ctx, mx + 2 * s, my + 1 * s, 6 * s, s);
  p(ctx, mx + 1 * s, my + 2 * s, 4 * s, s);
  p(ctx, mx + 0 * s, my + 3 * s, 3 * s, 6 * s);
  p(ctx, mx + 1 * s, my + 9 * s, 4 * s, s);
  p(ctx, mx + 2 * s, my + 10 * s, 6 * s, s);
  p(ctx, mx + 4 * s, my + 11 * s, 4 * s, s);

  // Stars
  for (const star of stars) {
    const alpha = (Math.sin(star.twinklePhase) + 1) * 0.35 + 0.3;
    ctx.globalAlpha = nightFade * alpha;
    p(ctx, star.x, star.y, 2, 2);
  }

  ctx.restore();
}
