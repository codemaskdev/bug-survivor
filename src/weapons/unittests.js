import { STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// Unit Tests upgrade: green ✓ shields orbiting CodeMask.
// Level 1 gives two shields, each level adds one (up to 8).
const ORBIT_R = 44;
const ORBIT_SPEED = 3.2;     // radians per second
const SHIELD_R = 6;          // hit radius
const REHIT = 0.4;           // seconds before the same bug can be hit again

const tests = { angle: 0 };

export function resetTests() {
  tests.angle = 0;
}

function shieldCount() {
  return UP.tests.level === 0 ? 0 : Math.min(8, UP.tests.level + 1);
}

function shieldPositions() {
  const n = shieldCount();
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = tests.angle + (i / n) * Math.PI * 2;
    out.push({ x: player.x + Math.cos(a) * ORBIT_R, y: player.y + Math.sin(a) * ORBIT_R });
  }
  return out;
}

export function updateTests() {
  if (UP.tests.level === 0) return;
  tests.angle += ORBIT_SPEED * STEP;

  for (const s of shieldPositions()) {
    for (const b of game.bugs) {
      if (b.dead) continue;
      if (game.roundTime - (b.testHitAt ?? -1) < REHIT) continue;
      const dx = b.x - s.x, dy = b.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < b.r + SHIELD_R) {
        b.testHitAt = game.roundTime;
        if (damageBug(b, 1, false)) {
          b.dead = true;
        } else {
          b.x += (dx / d) * 10;   // bounce off the shield
          b.y += (dy / d) * 10;
        }
      }
    }
  }
  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
}

// Little green shields with a white check mark
const SHIELD = [
  'GGGGGG',
  'GggggG',
  'GgggWG',
  'GWgWgG',
  'GgWggG',
  '.GggG.',
  '..GG..',
];
const COLORS = { G: '#5dff6a', g: '#0f3d1f', W: '#e6ffe9' };

export function drawTests() {
  if (UP.tests.level === 0) return;
  const P = 2;
  ctx.save();
  ctx.shadowColor = '#5dff6a';
  ctx.shadowBlur = 8;
  for (const s of shieldPositions()) {
    const left = Math.round(s.x - 3 * P), top = Math.round(s.y - 3.5 * P);
    for (let row = 0; row < SHIELD.length; row++) {
      for (let col = 0; col < 6; col++) {
        const c = COLORS[SHIELD[row][col]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(left + col * P, top + row * P, P, P);
      }
    }
  }
  ctx.restore();
}
