import { VIEW_W, VIEW_H, PLAYER_MAX_HP } from '../config.js';
import { AUTOPLAY, SEED } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { player, playerMaxHp } from '../entities/player.js';
import { xpToNext } from '../entities/commits.js';
import { UPGRADES } from '../upgrades/upgrades.js';
import { revertCountdown } from '../weapons/revert.js';
import { clockText, RUN_SECONDS } from '../core/clock.js';

export function drawHud() {
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '14px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('BUG SURVIVOR', 16, 14);
  ctx.textAlign = 'right';
  ctx.fillText(AUTOPLAY ? `AUTOPLAY  seed ${SEED}   WAVE ${game.wave}` : `WAVE ${game.wave}`, VIEW_W - 16, 14);

  // The in-game clock, top center. Turns red in the last minute.
  const lastMinute = game.roundTime >= RUN_SECONDS - 60;
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px monospace';
  ctx.save();
  ctx.fillStyle = lastMinute ? '#ff2e63' : '#e6ebf2';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 10;
  ctx.fillText(clockText(game.roundTime), VIEW_W / 2, 10);
  ctx.restore();
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';

  // Health bar
  const x = 16, y = 36, w = 200, h = 10;
  // The bar is always 100 HP wide; max HP lost to Burnout shows as a
  // charred segment at the right end
  const frac = player.hp / PLAYER_MAX_HP;
  const maxFrac = playerMaxHp() / PLAYER_MAX_HP;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(x, y, w, h);
  if (maxFrac < 1) {
    const bx = x + Math.round(w * maxFrac);
    ctx.fillStyle = '#3a0d10';
    ctx.fillRect(bx, y, x + w - bx, h);
    ctx.fillStyle = 'rgba(255, 90, 26, 0.5)';
    for (let sx = bx + 2; sx < x + w; sx += 5) ctx.fillRect(sx, y + 2, 2, h - 4);
  }
  ctx.save();
  ctx.fillStyle = player.hp / playerMaxHp() > 0.3 ? '#00f0ff' : '#ff2e63';
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
  ctx.fillRect(16, VIEW_H - 22, VIEW_W - 32, 6);
  ctx.save();
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 8;
  ctx.fillRect(16, VIEW_H - 22, Math.round((VIEW_W - 32) * xpFrac), 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(57, 255, 136, 0.8)';
  ctx.fillText(`LVL ${game.level}   ${game.xp}/${xpToNext()} commits`, 16, VIEW_H - 38);
  const revertIn = revertCountdown();
  if (revertIn !== null) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(240, 80, 51, 0.85)';
    ctx.fillText(`git revert in ${Math.ceil(revertIn)}s`, VIEW_W - 16, VIEW_H - 38);
    ctx.textAlign = 'left';
  }

  // Red flash when hit
  if (game.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 46, 99, ${game.hitFlash * 0.18})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
