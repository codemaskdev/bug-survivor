import { VIEW_W, VIEW_H } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { glitchNoise } from '../fx/glitch.js';
import { clockText } from '../core/clock.js';

// The three ways a run can end
const ENDINGS = {
  over: {
    title: 'BUILD FAILED',
    line: null,
    color: '#ff2e63',
    stats: () => `crashed at ${clockText(game.roundTime)}  ·  wave ${game.wave}  ·  smashed ${game.smashed}`,
    prompt: 'press R to rebuild',
  },
  won: {
    title: 'DEPLOYED TO PRODUCTION.',
    line: 'Have a nice weekend!',
    color: '#39ff88',
    stats: () => `shipped at ${clockText(game.roundTime)}  ·  smashed ${game.smashed}`,
    prompt: 'press R to deploy again',
  },
  timeout: {
    title: 'WEEKEND RUINED.',
    line: "You're on call.",
    color: '#ff6a2e',
    stats: () => `it's ${clockText(game.roundTime)} and the deploy is still running  ·  smashed ${game.smashed}`,
    prompt: 'press R to try again',
  },
};

export function isEnded(state) {
  return state in ENDINGS;
}

export function drawEnding() {
  const end = ENDINGS[game.state];
  ctx.fillStyle = `rgba(5, 6, 10, ${Math.min(0.75, game.overTime * 2)})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${end.title.length > 14 ? 48 : 64}px monospace`;
  const y = VIEW_H / 2 - (end.line ? 30 : 10);
  // Glitchy title: a cyan ghost that jitters behind the colored text
  const j = (glitchNoise(1, Math.floor(game.overTime * 15)) - 0.5) * 8;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.fillText(end.title, VIEW_W / 2 + j, y);
  ctx.fillStyle = end.color;
  ctx.shadowColor = end.color;
  ctx.shadowBlur = 20;
  ctx.fillText(end.title, VIEW_W / 2, y);
  if (end.line) {
    ctx.font = 'bold 30px monospace';
    ctx.fillText(end.line, VIEW_W / 2, y + 50);
  }
  ctx.shadowBlur = 0;

  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
  const statsY = VIEW_H / 2 + (end.line ? 64 : 44);
  ctx.fillText(end.stats(), VIEW_W / 2, statsY);
  if (!AUTOPLAY && Math.floor(game.overTime * 2) % 2 === 0) {
    ctx.fillText(end.prompt, VIEW_W / 2, statsY + 30);
  }
  ctx.restore();
}
