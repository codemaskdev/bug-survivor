import { ARENA_W, ARENA_H, PIXEL, STEP, PLAYER_SPEED, PLAYER_MAX_HP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { UP } from '../upgrades/upgrades.js';
import { swing } from '../weapons/keyboard.js';

// ---------- CodeMask sprite ----------
// O = neon outline, H = hoodie, h = hoodie fold, F = dark face.
// Eyes are drawn separately so they can look where CodeMask walks.
const SPRITE = [
  '...OOOOOO...',
  '..OHHHHHHO..',
  '.OHHHHHHHHO.',
  '.OHFFFFFFHO.',
  '.OHFFFFFFHO.',
  '.OHFFFFFFHO.',
  '.OHHFFFFHHO.',
  'OHHHHHHHHHHO',
  'OHhHHHHHHhHO',
  'OHhHHHHHHhHO',
  'OHHHHHHHHHHO',
  '.OHHHOOHHHO.',
  '.OOOO..OOOO.',
];
const SPRITE_COLORS = {
  O: '#1b3a4a',
  H: '#0d0e12',
  h: '#1a1c24',
  F: '#050507',
};
const EYE_COLOR = '#00f0ff';
const SPRITE_W = SPRITE[0].length * PIXEL;
const SPRITE_H = SPRITE.length * PIXEL;

export const player = {
  x: ARENA_W / 2,
  y: ARENA_H / 2,
  lookX: 0,      // -1, 0, 1: where the eyes point
  lookY: 0,
  walkTime: 0,
  moving: false,
  hp: PLAYER_MAX_HP,
  hurtTimer: 0,  // > 0 while invulnerable after a hit
  facing: 0,     // radians, direction of the last movement (0 = right)
};

export function resetPlayer() {
  player.x = ARENA_W / 2;
  player.y = ARENA_H / 2;
  player.lookX = 0;
  player.lookY = 0;
  player.hp = PLAYER_MAX_HP;
  player.hurtTimer = 0;
  player.facing = 0;
}

// Coffee upgrade: +15% speed per level
function playerSpeed() {
  return PLAYER_SPEED * (1 + UP.coffee.level * 0.15);
}

// Moves CodeMask by an input direction (any length) and keeps it inside the arena
export function movePlayer(input) {
  const len = Math.hypot(input.x, input.y);
  player.moving = len > 0;

  if (player.moving) {
    const nx = input.x / len;
    const ny = input.y / len;
    player.x += nx * playerSpeed() * STEP;
    player.y += ny * playerSpeed() * STEP;
    player.lookX = Math.abs(nx) > 0.3 ? Math.sign(nx) : 0;
    player.lookY = Math.abs(ny) > 0.3 ? Math.sign(ny) : 0;
    player.facing = Math.atan2(ny, nx);
    player.walkTime += STEP;
  } else {
    player.walkTime = 0;
  }

  // Keep CodeMask inside the arena walls
  const halfW = SPRITE_W / 2;
  const halfH = SPRITE_H / 2;
  player.x = Math.max(halfW + 4, Math.min(ARENA_W - halfW - 4, player.x));
  player.y = Math.max(halfH + 4, Math.min(ARENA_H - halfH - 4, player.y));
}

export function drawPlayer(time) {
  // Flicker while invulnerable after a hit
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 20) % 2 === 0) return;

  // Little bounce while walking, slow breathing while idle
  const bob = player.moving
    ? Math.round(Math.abs(Math.sin(player.walkTime * 14)) * -1) * PIXEL
    : (Math.sin(time * 2) > 0.6 ? -1 : 0);
  const left = Math.round(player.x - SPRITE_W / 2);
  const top = Math.round(player.y - SPRITE_H / 2) + bob;

  // Shadow on the floor
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + SPRITE_H / 2 + 2, SPRITE_W / 2.2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  for (let row = 0; row < SPRITE.length; row++) {
    for (let col = 0; col < SPRITE[row].length; col++) {
      const c = SPRITE_COLORS[SPRITE[row][col]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(left + col * PIXEL, top + row * PIXEL, PIXEL, PIXEL);
    }
  }

  // Eyes: two glowing cyan pixels that look where CodeMask walks.
  // A quick blink every few seconds.
  const blinking = (time % 4) < 0.12;
  if (blinking) return;
  // Mid-swing, the eyes follow the keyboard instead of the feet
  let lookX = player.lookX, lookY = player.lookY;
  if (swing.timer > 0) {
    const cx = Math.cos(swing.angle), cy = Math.sin(swing.angle);
    lookX = Math.abs(cx) > 0.3 ? Math.sign(cx) : 0;
    lookY = Math.abs(cy) > 0.3 ? Math.sign(cy) : 0;
  }
  const eyeRow = 4 + Math.max(0, lookY) - Math.max(0, -lookY);
  const eyeCols = [4 + lookX, 7 + lookX];
  ctx.save();
  ctx.fillStyle = EYE_COLOR;
  ctx.shadowColor = EYE_COLOR;
  ctx.shadowBlur = 10;
  for (const col of eyeCols) {
    ctx.fillRect(left + col * PIXEL, top + eyeRow * PIXEL, PIXEL, PIXEL);
  }
  ctx.restore();
}
