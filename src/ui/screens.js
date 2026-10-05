import { VIEW_W, VIEW_H } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { glitchNoise } from '../fx/glitch.js';
import { clockText } from '../core/clock.js';

export function drawGameOver() {
  ctx.fillStyle = `rgba(5, 6, 10, ${Math.min(0.75, game.overTime * 2)})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px monospace';
  // Glitchy title: a cyan ghost that jitters behind the red text
  const j = (glitchNoise(1, Math.floor(game.overTime * 15)) - 0.5) * 8;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.fillText('BUILD FAILED', VIEW_W / 2 + j, VIEW_H / 2 - 10);
  ctx.fillStyle = '#ff2e63';
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 20;
  ctx.fillText('BUILD FAILED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.shadowBlur = 0;

  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
  ctx.fillText(`crashed at ${clockText(game.roundTime)}  ·  wave ${game.wave}  ·  smashed ${game.smashed}`, VIEW_W / 2, VIEW_H / 2 + 44);
  if (!AUTOPLAY && Math.floor(game.overTime * 2) % 2 === 0) {
    ctx.fillText('press R to rebuild', VIEW_W / 2, VIEW_H / 2 + 74);
  }
  ctx.restore();
}
