import { STEP } from '../config.js';
import { rng } from '../core/rng.js';
import { game } from '../core/state.js';
import { player } from '../entities/player.js';
import { swing, swingReach, startSwing } from '../weapons/keyboard.js';

// ---------- Autoplay brain ----------
// Wanders between random points around CodeMask, pausing now and then,
// steers away from any bug that gets too close, picks up commits,
// and swings at bugs in reach.
const bot = { tx: 0, ty: 0, wait: 0 };
const BOT_FEAR_RADIUS = 110;

export function resetBot() {
  bot.tx = player.x;
  bot.ty = player.y;
  bot.wait = 0;
}

export function readAutoplay() {
  let fx = 0, fy = 0;
  for (const b of game.bugs) {
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < BOT_FEAR_RADIUS) {
      const w = (BOT_FEAR_RADIUS - d) / BOT_FEAR_RADIUS;
      fx += (dx / d) * w;
      fy += (dy / d) * w;
    }
  }
  const scared = Math.hypot(fx, fy) > 0.05;

  // Go grab the nearest commit, if there's one worth walking to
  let bestC = null, bestCD = 300;
  for (const c of game.commits) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bestCD) { bestC = c; bestCD = d; }
  }
  if (bestC) {
    bot.tx = bestC.x;
    bot.ty = bestC.y;
    bot.wait = 0;
  }

  if (!scared && bot.wait > 0) {
    bot.wait -= STEP;
    return { x: 0, y: 0 };
  }
  let dx = bot.tx - player.x;
  let dy = bot.ty - player.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 6) {
    bot.tx = player.x + (rng() - 0.5) * 600;
    bot.ty = player.y + (rng() - 0.5) * 400;
    bot.wait = rng() < 0.3 ? 0.3 + rng() * 0.6 : 0;
    return { x: 0, y: 0 };
  }
  dx /= dist;
  dy /= dist;
  return { x: dx * 0.6 + fx * 3, y: dy * 0.6 + fy * 3 };
}

// Turn toward the closest bug in reach and swing at it
export function autoplaySwing() {
  let best = null, bestD = swingReach() * 0.9;
  for (const b of game.bugs) {
    const d = Math.hypot(b.x - player.x, b.y - player.y) - b.r;
    if (d < bestD) { best = b; bestD = d; }
  }
  if (!best || swing.cooldown > 0) return;
  player.facing = Math.atan2(best.y - player.y, best.x - player.x);
  startSwing(player.facing);
}
