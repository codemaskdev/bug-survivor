import { ARENA_W, ARENA_H, PLAYER_MAX_HP } from '../config.js';
import { AUTOPLAY, SEED } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { player } from '../entities/player.js';
import { xpToNext } from '../entities/commits.js';
import { UPGRADES } from '../upgrades/upgrades.js';
import { revertCountdown } from '../weapons/revert.js';

export function drawHud() {
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '14px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('BUG SURVIVOR', 16, 14);
  ctx.textAlign = 'right';
  ctx.fillText(AUTOPLAY ? `AUTOPLAY  seed ${SEED}   WAVE ${game.wave}` : `WAVE ${game.wave}`, ARENA_W - 16, 14);
  ctx.textAlign = 'left';

  // Health bar
  const x = 16, y = 36, w = 200, h = 10;
  const frac = player.hp / PLAYER_MAX_HP;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.fillStyle = frac > 0.3 ? '#00f0ff' : '#ff2e63';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8;
  ctx.fillRect(x, y, Math.round(w * frac), h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '11px monospace';
  ctx.fillText(`HP ${player.hp}`, x + w + 10, y - 1);
  ctx.fillText(`SMASHED ${game.smashed}`, x, y + 18);
  const owned = UPGRADES.filter((u) => u.level > 0).map((u) => `${u.short} ${u.level}`);
  if (owned.length) ctx.fillText(owned.join('  ·  '), x, y + 34);

  // XP bar along the bottom edge
  const xpFrac = Math.min(1, game.xp / xpToNext());
  ctx.fillStyle = 'rgba(57, 255, 136, 0.12)';
  ctx.fillRect(16, ARENA_H - 22, ARENA_W - 32, 6);
  ctx.save();
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 8;
  ctx.fillRect(16, ARENA_H - 22, Math.round((ARENA_W - 32) * xpFrac), 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(57, 255, 136, 0.8)';
  ctx.fillText(`LVL ${game.level}   ${game.xp}/${xpToNext()} commits`, 16, ARENA_H - 38);
  const revertIn = revertCountdown();
  if (revertIn !== null) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(240, 80, 51, 0.85)';
    ctx.fillText(`git revert in ${Math.ceil(revertIn)}s`, ARENA_W - 16, ARENA_H - 38);
    ctx.textAlign = 'left';
  }

  // Red flash when hit
  if (game.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 46, 99, ${game.hitFlash * 0.18})`;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }
}
