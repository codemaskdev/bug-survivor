import { STEP, LINT_SPEED, LINT_RANGE } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// Linter upgrade: auto-fires at the nearest bug. Each level fires faster.
const linter = {
  timer: 0,
  shots: [],     // shots in flight
};

export function resetLinter() {
  linter.shots = [];
  linter.timer = 0;
}

function linterInterval() {
  return Math.pow(0.8, UP.linter.level - 1);
}

export function updateLinter() {
  if (UP.linter.level > 0) {
    linter.timer -= STEP;
    if (linter.timer <= 0) {
      let best = null, bestD = LINT_RANGE;
      for (const b of game.bugs) {
        const d = Math.hypot(b.x - player.x, b.y - player.y);
        if (d < bestD) { best = b; bestD = d; }
      }
      if (best) {
        const a = Math.atan2(best.y - player.y, best.x - player.x);
        linter.shots.push({ x: player.x, y: player.y, vx: Math.cos(a) * LINT_SPEED, vy: Math.sin(a) * LINT_SPEED, dist: 0 });
        linter.timer = linterInterval();
      }
    }
  }

  for (const l of linter.shots) {
    l.x += l.vx * STEP;
    l.y += l.vy * STEP;
    l.dist += LINT_SPEED * STEP;
    for (const b of game.bugs) {
      if (b.dead) continue;
      if (Math.hypot(b.x - l.x, b.y - l.y) < b.r + 3) {
        if (damageBug(b, 1, false)) b.dead = true;
        l.dist = LINT_RANGE; // shot is spent
        break;
      }
    }
  }
  linter.shots = linter.shots.filter((l) => l.dist < LINT_RANGE);
  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
}

// Little yellow warning squiggles
export function drawLints() {
  ctx.save();
  ctx.strokeStyle = '#ffd23f';
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  for (const l of linter.shots) {
    const a = Math.atan2(l.vy, l.vx);
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-5, -2);
    ctx.lineTo(-2, 2);
    ctx.lineTo(1, -2);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
