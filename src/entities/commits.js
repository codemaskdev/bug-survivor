import { STEP, COMMIT_PICKUP, COMMIT_MAGNET } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { player } from './player.js';
import { openUpgradeCards } from '../upgrades/levelup.js';

// Commits are XP: dead bugs drop them, CodeMask walks over them to collect.
const COMMIT_FORGET = 1400;  // px: commits this far away are gone for good

export function xpToNext() {
  return 5 + (game.level - 1) * 4;
}

export function dropCommit(x, y) {
  game.commits.push({ x, y, age: 0 });
}

export function updateCommits() {
  for (const c of game.commits) {
    c.age += STEP;
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < COMMIT_PICKUP) {
      c.taken = true;
      game.xp++;
    } else if (d < COMMIT_MAGNET) {
      const pull = 260 * (1 - d / COMMIT_MAGNET) + 60;
      c.x += (dx / d) * pull * STEP;
      c.y += (dy / d) * pull * STEP;
    }
  }
  // Commits left far behind in the endless world are dropped
  game.commits = game.commits.filter((c) => !c.taken && Math.hypot(player.x - c.x, player.y - c.y) < COMMIT_FORGET);

  if (game.xp >= xpToNext()) {
    game.xp -= xpToNext();
    game.level++;
    openUpgradeCards();
  }
}

// Small glowing green dots that bob a little
export function drawCommits(time) {
  ctx.save();
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 8;
  for (const c of game.commits) {
    const pop = Math.min(1, c.age * 6);
    const s = Math.round(5 * pop) || 1;
    const bob = Math.round(Math.sin(time * 5 + c.x * 0.1) * 1.5);
    ctx.fillRect(Math.round(c.x - s / 2), Math.round(c.y - s / 2) + bob, s, s);
  }
  ctx.restore();
}
