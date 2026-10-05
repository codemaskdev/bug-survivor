import { STEP, PLAYER_SPEED, PLAYER_MAX_HP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { UP } from '../upgrades/upgrades.js';
import { swing } from '../weapons/keyboard.js';

// ---------- CodeMask sprite ----------
// Mini version of the CodeMask avatar, drawn with 2 px pixels.
// O = bright cyan neon outline, H = black hoodie, h = hoodie fold,
// F = dark face, s = cyan drawstring, S = drawstring tip.
// Eyes are drawn separately so they can look where CodeMask walks.
// Cyan is the hero's color: no bug uses it.
const HERO_PIXEL = 2;
const SPRITE = [
  '.....OOOOOOOO.....',
  '...OOHHHHHHHHOO...',
  '..OHHHHHHHHHHHHO..',
  '.OHHHFFFFFFFFHHHO.',
  '.OHHFFFFFFFFFFHHO.',
  '.OHFFFFFFFFFFFFHO.',
  '.OHFFFFFFFFFFFFHO.',
  '.OHFFFFFFFFFFFFHO.',
  '.OHHFFFFFFFFFFHHO.',
  '.OHHHFFFFFFFFHHHO.',
  'OHHHHHHHHHHHHHHHHO',
  'OHHHHsHHHHHHsHHHHO',
  'OHhHHsHHHHHHsHHhHO',
  'OHhHHsHHHHHHsHHhHO',
  'OHhHHSHHHHHHSHHhHO',
  'OHHHHHHHHHHHHHHHHO',
  'OHHHHHHHHHHHHHHHHO',
  '.OHHHHHOOOOHHHHHO.',
  '.OHHHHO....OHHHHO.',
  '.OOOOOO....OOOOOO.',
];
const SPRITE_COLORS = {
  O: '#00f0ff',
  H: '#0d0e12',
  h: '#1a1c24',
  F: '#050507',
  s: '#00c8e0',
  S: '#b8fbff',
};
// The avatar's eyes: wide on top, narrowing down and in (right eye mirrored)
const EYE_L = ['####', '.###', '..##'];
const EYE_R = ['####', '###.', '##..'];
const EYE_COLOR = '#3cebff';
const SPRITE_W = SPRITE[0].length * HERO_PIXEL;
const SPRITE_H = SPRITE.length * HERO_PIXEL;

// World coordinates; the world is endless and CodeMask starts at its origin
export const player = {
  x: 0,
  y: 0,
  lookX: 0,      // -1, 0, 1: where the eyes point
  lookY: 0,
  walkTime: 0,
  moving: false,
  hp: PLAYER_MAX_HP,
  hurtTimer: 0,  // > 0 while invulnerable after a hit
  facing: 0,     // radians, direction of the last movement (0 = right)
};

export function resetPlayer() {
  player.x = 0;
  player.y = 0;
  player.lookX = 0;
  player.lookY = 0;
  player.hp = PLAYER_MAX_HP;
  player.hurtTimer = 0;
  player.facing = 0;
}

// Burnout upgrade: every level burns away 10 max HP
export function playerMaxHp() {
  return PLAYER_MAX_HP - UP.burnout.level * 10;
}

// Coffee upgrade: +15% speed per level
function playerSpeed() {
  return PLAYER_SPEED * (1 + UP.coffee.level * 0.15);
}

// Moves CodeMask by an input direction (any length). No walls: the world is endless.
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
}

export function drawPlayer(time) {
  // Soft cyan glow and a pulsing ring on the ground, so CodeMask is easy to
  // find in a crowd. Drawn even while flickering after a hit.
  const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, 46);
  glow.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
  glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 46, player.y - 46, 92, 92);
  const pulse = 0.45 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + SPRITE_H / 2 + 1, SPRITE_W / 1.7, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Flicker while invulnerable after a hit
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 20) % 2 === 0) return;

  // Little bounce while walking, slow breathing while idle
  const bob = player.moving
    ? Math.round(Math.abs(Math.sin(player.walkTime * 14)) * -1) * HERO_PIXEL * 1.5
    : (Math.sin(time * 2) > 0.6 ? -1 : 0);
  const left = Math.round(player.x - SPRITE_W / 2);
  const top = Math.round(player.y - SPRITE_H / 2) + bob;

  // Body, with the neon outline glowing
  ctx.save();
  for (let row = 0; row < SPRITE.length; row++) {
    for (let col = 0; col < SPRITE[row].length; col++) {
      const ch = SPRITE[row][col];
      const c = SPRITE_COLORS[ch];
      if (!c) continue;
      const neon = ch === 'O' || ch === 's' || ch === 'S';
      ctx.shadowColor = neon ? '#00f0ff' : 'transparent';
      ctx.shadowBlur = neon ? 6 : 0;
      ctx.fillStyle = c;
      ctx.fillRect(left + col * HERO_PIXEL, top + row * HERO_PIXEL, HERO_PIXEL, HERO_PIXEL);
    }
  }
  ctx.restore();

  // Eyes: glowing trapezoids that look where CodeMask walks.
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
  const eyeTop = 5 + lookY;
  ctx.save();
  ctx.fillStyle = EYE_COLOR;
  ctx.shadowColor = EYE_COLOR;
  ctx.shadowBlur = 10;
  for (const [eye, col0] of [[EYE_L, 4 + lookX], [EYE_R, 10 + lookX]]) {
    for (let r = 0; r < eye.length; r++) {
      for (let c = 0; c < eye[r].length; c++) {
        if (eye[r][c] !== '#') continue;
        ctx.fillRect(left + (col0 + c) * HERO_PIXEL, top + (eyeTop + r) * HERO_PIXEL, HERO_PIXEL, HERO_PIXEL);
      }
    }
  }
  ctx.restore();
}
