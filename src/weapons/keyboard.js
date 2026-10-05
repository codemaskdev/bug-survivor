import { STEP, SWING_TIME, SWING_COOLDOWN, SWING_REACH, SWING_ARC } from '../config.js';
import { ctx } from '../core/canvas.js';
import { fxRng } from '../core/rng.js';
import { game } from '../core/state.js';
import { angleDiff } from '../core/math.js';
import { UP } from '../upgrades/upgrades.js';
import { addPopup } from '../fx/particles.js';
import { shake } from '../fx/shake.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// CodeMask's keyboard: Space or J swings it in an arc in front of CodeMask.
export const swing = {
  timer: 0,      // > 0 while the arc is in the air
  cooldown: 0,   // > 0 until the next swing is allowed
  angle: 0,      // center of the arc
  id: undefined, // which swing this is (a bug is hit at most once per swing)
};
let swingCount = 0;

export function resetSwing() {
  swing.timer = 0;
  swing.cooldown = 0;
}

// Mechanical Keyboard upgrade: wider, longer, harder swings
export function swingArc() {
  return Math.min(Math.PI * 2, SWING_ARC + UP.mech.level * (Math.PI / 6));
}
export function swingReach() {
  return SWING_REACH + UP.mech.level * 8;
}
function swingDamage() {
  return 1 + UP.mech.level;
}

export function startSwing(angle) {
  if (swing.cooldown > 0) return;
  swing.id = swingCount++;
  swing.angle = angle;
  swing.timer = SWING_TIME;
  swing.cooldown = SWING_COOLDOWN;
}

// Any bug inside the arc while the keyboard is in the air gets smashed
export function updateSwing() {
  if (swing.cooldown > 0) swing.cooldown -= STEP;
  if (swing.timer <= 0) return;
  swing.timer -= STEP;

  const hits = [];
  const reach = swingReach();
  const arc = swingArc();
  game.bugs = game.bugs.filter((b) => {
    if (b.swingId === swing.id) return true;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const inReach = Math.hypot(dx, dy) < reach + b.r;
    const inArc = Math.abs(angleDiff(Math.atan2(dy, dx), swing.angle)) < arc / 2;
    if (!inReach || !inArc) return true;
    b.swingId = swing.id;
    hits.push(b);
    return !damageBug(b, swingDamage(), true);
  });
  flushNewBugs();
  if (hits.length === 0) return;

  // A mechanical keyboard is louder: bigger CLACK, more !, more shake
  const loud = UP.mech.level;
  shake.amount = Math.min(6 + Math.min(loud, 2), shake.amount + 2 + hits.length + loud);
  const cx = hits.reduce((s, b) => s + b.x, 0) / hits.length;
  const cy = hits.reduce((s, b) => s + b.y, 0) / hits.length;
  const word = 'CLACK' + '!'.repeat(1 + Math.min(loud, 2));
  // The newest CLACK replaces any older one in the same spot, so they don't pile up
  addPopup({
    x: cx,
    y: cy - 10,
    text: hits.length > 1 ? `${word} x${hits.length}` : word,
    size: 18 + Math.min(loud, 4) * 3,
    life: 0.7,
    tilt: (fxRng() - 0.5) * 0.4,
  }, 60);
}

// The keyboard sweeps across the arc, leaving a faint cyan swoosh
export function drawSwing() {
  if (swing.timer <= 0) return;
  const t = 1 - swing.timer / SWING_TIME;
  const eased = 1 - (1 - t) * (1 - t);
  const arc = swingArc();
  const reach = swingReach();
  const start = swing.angle - arc / 2;
  const now = start + arc * eased;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 * (1 - t * 0.5)})`;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, reach * 0.68, start, now);
  ctx.stroke();

  ctx.rotate(now);
  const r = Math.round(reach * 0.56);
  // Body (long side along the arc)
  ctx.fillStyle = '#9fb3c8';
  ctx.fillRect(r - 7, -18, 14, 36);
  ctx.fillStyle = '#1a1c24';
  ctx.fillRect(r - 5, -16, 10, 32);
  // Keys: 2 rows of 6 light caps
  ctx.fillStyle = '#e6ebf2';
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(r - 4 + row * 5, -15 + k * 5, 3, 3);
    }
  }
  ctx.restore();
}
