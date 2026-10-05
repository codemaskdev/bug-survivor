import { ARENA_W, ARENA_H, STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UP } from '../upgrades/upgrades.js';
import { smashFx, addPopup } from '../fx/particles.js';
import { shake } from '../fx/shake.js';

// git revert upgrade (rare): every 30 seconds, every bug on screen is undone.
// Reverted bugs never happened, so they drop no commits.
// The first revert fires shortly after picking the card; levels shorten the wait.
const FIRST_DELAY = 2;
const FLASH_TIME = 0.6;

const revert = {
  wasActive: false,
  timer: 0,      // seconds until the next revert
  flash: 0,      // > 0 while the screen flash fades
};

export function resetRevert() {
  revert.wasActive = false;
  revert.timer = 0;
  revert.flash = 0;
}

function revertInterval(level) {
  return Math.max(12, 30 * Math.pow(0.85, level - 1));
}

// Seconds until the next revert, or null if the card isn't owned (for the HUD)
export function revertCountdown() {
  return UP.revert.level > 0 ? Math.max(0, revert.timer) : null;
}

function wipe() {
  const onScreen = (b) => b.x >= 0 && b.x <= ARENA_W && b.y >= 0 && b.y <= ARENA_H;
  for (const b of game.bugs) {
    if (onScreen(b)) smashFx(b.x, b.y, false, '#f05033');
  }
  game.bugs = game.bugs.filter((b) => !onScreen(b));
  revert.flash = FLASH_TIME;
  shake.amount = Math.min(10, shake.amount + 8);
  addPopup({ x: ARENA_W / 2, y: ARENA_H / 2, text: '$ git revert HEAD', size: 26, life: 0.7, tilt: 0, color: '#f05033' }, 9999);
}

export function updateRevert() {
  if (revert.flash > 0) revert.flash -= STEP;
  if (UP.revert.level === 0) return;
  if (!revert.wasActive) {
    revert.wasActive = true;
    revert.timer = FIRST_DELAY;
  }
  revert.timer -= STEP;
  if (revert.timer <= 0) {
    wipe();
    revert.timer = revertInterval(UP.revert.level);
  }
}

// Full-screen flash plus a "rewind" scanline sweeping up the arena
export function drawRevert() {
  if (revert.flash <= 0) return;
  const t = 1 - revert.flash / FLASH_TIME;
  ctx.save();
  ctx.fillStyle = `rgba(240, 80, 51, ${0.35 * (1 - t)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const y = ARENA_H * (1 - t);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowColor = '#f05033';
  ctx.shadowBlur = 20;
  ctx.fillRect(0, Math.round(y), ARENA_W, 3);
  ctx.restore();
}
