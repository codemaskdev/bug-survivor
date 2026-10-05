import { STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { shake } from '../fx/shake.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// Code Review upgrade: every few seconds a pulse wave rolls out from
// CodeMask, damaging and pushing back every bug it reaches.
const COLOR = '#7aa2ff';
const WAVE_TIME = 0.35;      // seconds for the ring to reach full size

const review = {
  timer: 0,      // seconds until the next pulse
  pulses: [],    // rings on screen: { x, y, age, radius }
};

export function resetReview() {
  review.timer = 0;
  review.pulses = [];
}

function reviewInterval(level) {
  return Math.max(1.5, 4 - (level - 1) * 0.5);
}

function reviewRadius(level) {
  return Math.min(200, 110 + (level - 1) * 15);
}

function reviewDamage(level) {
  return 1 + Math.floor(level / 3);
}

function pulse() {
  const lv = UP.review.level;
  const radius = reviewRadius(lv);
  review.pulses.push({ x: player.x, y: player.y, age: 0, radius });
  shake.amount = Math.min(8, shake.amount + 2);

  for (const b of game.bugs) {
    const dx = b.x - player.x, dy = b.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > radius + b.r) continue;
    if (damageBug(b, reviewDamage(lv), false)) {
      b.dead = true;
      continue;
    }
    // Pushed back harder the closer it was
    const push = 180 + 220 * (1 - Math.min(1, d / radius));
    b.kx = (dx / d) * push;
    b.ky = (dy / d) * push;
    b.stun = Math.max(b.stun, 0.2);
  }
  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
}

export function updateReview() {
  for (const p of review.pulses) p.age += STEP;
  review.pulses = review.pulses.filter((p) => p.age < WAVE_TIME + 0.15);

  if (UP.review.level === 0) return;
  review.timer -= STEP;
  if (review.timer <= 0) {
    pulse();
    review.timer = reviewInterval(UP.review.level);
  }
}

// An expanding ring with a faint fill, fading as it reaches full size
export function drawReview() {
  for (const p of review.pulses) {
    const t = Math.min(1, p.age / WAVE_TIME);
    const eased = 1 - (1 - t) * (1 - t);
    const r = p.radius * eased;
    const fade = 1 - Math.max(0, (p.age - WAVE_TIME * 0.6) / (WAVE_TIME * 0.4 + 0.15));
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = 'rgba(122, 162, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOR;
    ctx.shadowColor = COLOR;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.stroke();
    ctx.restore();
  }
}
