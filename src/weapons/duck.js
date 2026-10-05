import { STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { fxRng } from '../core/rng.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { addPopup } from '../fx/particles.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// Rubber Duck upgrade: a little duck companion that waddles after CodeMask,
// flies at the nearest bug, pecks it and squeaks. Levels peck faster and harder.
const FOLLOW_OFFSET_X = -24, FOLLOW_OFFSET_Y = 16;
const HUNT_RANGE = 170;      // only hunts bugs this close to CodeMask

const duck = {
  active: false,
  x: 0, y: 0,
  mode: 'follow',  // follow -> attack -> follow
  target: null,
  cooldown: 0,
  facing: 1,       // 1 = right, -1 = left
  peck: 0,         // > 0 right after a peck (beak open)
  moving: false,
  walk: 0,
};

export function resetDuck() {
  duck.active = false;
  duck.mode = 'follow';
  duck.target = null;
  duck.cooldown = 0;
  duck.peck = 0;
}

function peckInterval(level) {
  return Math.max(0.35, 0.9 * Math.pow(0.85, level - 1));
}

function peckDamage(level) {
  return 1 + Math.floor((level - 1) / 2);
}

function flyToward(tx, ty, speed) {
  const dx = tx - duck.x, dy = ty - duck.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return d;
  const stepLen = Math.min(d, speed * STEP);
  duck.x += (dx / d) * stepLen;
  duck.y += (dy / d) * stepLen;
  if (Math.abs(dx) > 0.5) duck.facing = Math.sign(dx);
  return d;
}

export function updateDuck() {
  const lv = UP.duck.level;
  if (lv === 0) return;
  if (!duck.active) {
    duck.active = true;
    duck.x = player.x + FOLLOW_OFFSET_X;
    duck.y = player.y + FOLLOW_OFFSET_Y;
  }
  if (duck.cooldown > 0) duck.cooldown -= STEP;
  if (duck.peck > 0) duck.peck -= STEP;

  if (duck.mode === 'follow') {
    // Stays behind CodeMask: on the left when walking right, and vice versa
    const side = player.lookX < 0 ? -1 : 1;
    const tx = player.x + FOLLOW_OFFSET_X * side, ty = player.y + FOLLOW_OFFSET_Y;
    const d = flyToward(tx, ty, 140 + Math.hypot(tx - duck.x, ty - duck.y) * 3);
    duck.moving = d > 2;

    if (duck.cooldown <= 0) {
      let best = null, bestD = HUNT_RANGE;
      for (const b of game.bugs) {
        const db = Math.hypot(b.x - player.x, b.y - player.y);
        if (db < bestD) { best = b; bestD = db; }
      }
      if (best) {
        duck.mode = 'attack';
        duck.target = best;
      }
    }
  } else {
    const b = duck.target;
    if (!b || b.dead || !game.bugs.includes(b)) {
      duck.mode = 'follow';
      duck.target = null;
    } else {
      duck.moving = true;
      const d = flyToward(b.x, b.y, 320 + lv * 20);
      if (d < b.r + 5) {
        if (damageBug(b, peckDamage(lv), false)) b.dead = true;
        duck.peck = 0.15;
        duck.cooldown = peckInterval(lv);
        duck.mode = 'follow';
        duck.target = null;
        addPopup({ x: duck.x, y: duck.y - 14, text: 'squeak!', size: 11, life: 0.7, tilt: (fxRng() - 0.5) * 0.5, color: '#ffd23f' }, 24);
      }
    }
  }
  if (duck.moving) duck.walk += STEP;

  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
}

// Yellow rubber duck, facing right; mirrored when it faces left.
// Y = body, w = wing, B = beak, E = eye. The beak opens wider for a moment after a peck.
const DUCK = [
  '...YYY....',
  '..YYYYY...',
  '..YYEYYBB.',
  '..YYYYY...',
  'Y.YYYYYY..',
  'YYYwwwYYY.',
  'YYYYwwYYY.',
  '.YYYYYYY..',
];
const DUCK_PECK_ROW = '..YYEYYBBB';
const COLORS = { Y: '#ffd23f', w: '#e0a800', B: '#ff8c1a', E: '#0b0d13' };

export function drawDuck() {
  if (!duck.active) return;
  const P = 2;
  const w = 10 * P, h = DUCK.length * P;
  const bob = duck.moving ? Math.round(Math.abs(Math.sin(duck.walk * 12)) * -2) : 0;
  const left = Math.round(duck.x - w / 2), top = Math.round(duck.y - h / 2) + bob;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 210, 63, 0.10)';
  ctx.beginPath();
  ctx.ellipse(duck.x, duck.y + h / 2 + 2, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 6;
  for (let row = 0; row < DUCK.length; row++) {
    const line = row === 2 && duck.peck > 0 ? DUCK_PECK_ROW : DUCK[row];
    for (let col = 0; col < line.length; col++) {
      const c = COLORS[line[col]];
      if (!c) continue;
      const x = duck.facing > 0 ? col : 9 - col;
      ctx.fillStyle = c;
      ctx.fillRect(left + x * P, top + row * P, P, P);
    }
  }
  ctx.restore();
}
