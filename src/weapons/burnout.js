import { STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { glitchNoise } from '../fx/glitch.js';
import { player, playerMaxHp } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// Burnout upgrade: while CodeMask moves it leaves a trail of fire. Bugs that
// touch a flame catch fire and burn for a moment. Higher levels make the
// trail last longer and burn hotter. The price: -10 max HP per level.
const DROP_EVERY = 0.05;     // seconds between flames while moving
const FLAME_R = 9;           // touch radius of one flame
const BURN_TIME = 1.5;       // a bug keeps burning this long after leaving the fire

const burnout = {
  flames: [],      // { x, y, age, life, id }
  dropTimer: 0,
  nextId: 0,
};

export function resetBurnout() {
  burnout.flames = [];
  burnout.dropTimer = 0;
}

function trailLife(level) {
  return 0.8 + 0.4 * level;            // 1.2 s at level 1, 2.8 s at level 5
}

function burnDps(level) {
  return 1 + 0.75 * level;             // 1.75 HP/s at level 1, 4.75 at level 5
}

export function updateBurnout() {
  // Losing max HP can't leave CodeMask above its new max
  player.hp = Math.min(player.hp, playerMaxHp());

  for (const f of burnout.flames) f.age += STEP;
  burnout.flames = burnout.flames.filter((f) => f.age < f.life);

  const lv = UP.burnout.level;
  if (lv > 0 && player.moving) {
    burnout.dropTimer -= STEP;
    if (burnout.dropTimer <= 0) {
      burnout.flames.push({ x: player.x, y: player.y + 12, age: 0, life: trailLife(lv), id: burnout.nextId++ });
      burnout.dropTimer = DROP_EVERY;
    }
  }

  // Touching any flame (re)ignites a bug
  if (burnout.flames.length) {
    for (const b of game.bugs) {
      for (const f of burnout.flames) {
        if (Math.abs(b.x - f.x) > FLAME_R + b.r || Math.abs(b.y - f.y) > FLAME_R + b.r) continue;
        if (Math.hypot(b.x - f.x, b.y - f.y) < FLAME_R + b.r) {
          b.burn = BURN_TIME;
          break;
        }
      }
    }
  }

  // Burning bugs lose HP over time; damage lands in whole points
  const dps = burnDps(Math.max(1, lv));
  for (const b of game.bugs) {
    if (!(b.burn > 0)) continue;
    b.burn -= STEP;
    b.burnAcc = (b.burnAcc ?? 0) + dps * STEP;
    if (b.burnAcc >= 1) {
      const dmg = Math.floor(b.burnAcc);
      b.burnAcc -= dmg;
      if (damageBug(b, dmg, false)) b.dead = true;
    }
  }
  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
}

// Neon pixel fire: each flame is a flickering stack of red, orange and
// yellow pixels that shrinks as it burns out.
const FIRE = ['#ff2e00', '#ff5a1a', '#ff8c1a', '#ffd23f'];

function drawFlame(x, y, size, flicker) {
  const P = 2;
  const h = Math.max(1, Math.round(size * 7 + flicker));   // rows tall
  for (let row = 0; row < h; row++) {
    const w = Math.max(1, Math.round((h - row) * 0.8));       // narrower toward the tip
    const color = FIRE[Math.min(FIRE.length - 1, Math.floor((row / h) * FIRE.length))];
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - (w * P) / 2), Math.round(y - row * P), w * P, P);
  }
}

export function drawBurnout(time) {
  const tick = Math.floor(time * 15);
  if (burnout.flames.length) {
    ctx.save();
    // Soft glow under the trail
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 70, 20, 0.14)';
    for (const f of burnout.flames) {
      ctx.beginPath();
      ctx.arc(f.x, f.y - 5, 13 * (1 - f.age / f.life) + 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const f of burnout.flames) {
      const left = 1 - f.age / f.life;
      const flicker = (glitchNoise(f.id, tick) - 0.5) * 2;
      drawFlame(f.x + flicker, f.y, left, flicker);
    }
    ctx.restore();
  }

  // Bugs that are on fire get a little flame on top
  for (const b of game.bugs) {
    if (!(b.burn > 0)) continue;
    const flicker = (glitchNoise(b.id + 101, tick) - 0.5) * 2;
    drawFlame(b.x + flicker, b.y - b.r - 1, 0.6, flicker);
  }
}
