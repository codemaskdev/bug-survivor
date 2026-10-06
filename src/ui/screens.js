import { VIEW_W, VIEW_H } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { glitchNoise } from '../fx/glitch.js';
import { clockText } from '../core/clock.js';
import { hasBest, bestText, isNewRecord, lastRun } from '../core/records.js';

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
  // Autoplay footage keeps the original ending screen
  if (AUTOPLAY) {
    ctx.restore();
    return;
  }
  if (hasBest()) {
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 210, 63, 0.85)';
    ctx.fillText(`personal best  ${bestText()}`, VIEW_W / 2, statsY + 28);
  }
  if (Math.floor(game.overTime * 2) % 2 === 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.fillText(end.prompt, VIEW_W / 2, statsY + 60);
  }
  ctx.restore();
  if (isNewRecord()) drawRecord(y - 100);
}

// New personal best: a pulsing gold banner and pixel confetti
const CONFETTI = ['#ffd23f', '#00f0ff', '#39ff88', '#ff2e63', '#b06cff'];

function drawRecord(y) {
  const t = game.overTime;
  ctx.save();
  // Confetti rains for a few seconds, then fades out
  ctx.globalAlpha = Math.max(0, Math.min(1, 5 - t));
  for (let i = 0; i < 70; i++) {
    const speed = 90 + glitchNoise(i, 1) * 160;
    const fall = (t * speed + glitchNoise(i, 2) * VIEW_H) % (VIEW_H + 20);
    const x = glitchNoise(i, 3) * VIEW_W + Math.sin(t * 3 + i) * 12;
    const s = 3 + Math.floor(glitchNoise(i, 4) * 3) * 2;
    ctx.fillStyle = CONFETTI[i % CONFETTI.length];
    // Flutter: the piece flattens as it turns over
    const turn = Math.abs(Math.sin(t * (4 + glitchNoise(i, 5) * 6) + i));
    ctx.fillRect(Math.round(x), Math.round(fall - 20), s, Math.max(1, Math.round(s * turn)));
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pop = Math.min(1, t * 4);
  const pulse = 1 + Math.sin(t * 6) * 0.04;
  ctx.translate(VIEW_W / 2, y);
  ctx.scale(pop * pulse, pop * pulse);
  ctx.font = 'bold 34px monospace';
  ctx.fillStyle = '#ffd23f';
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 22;
  ctx.fillText('★ NEW RECORD ★', 0, 0);
  ctx.shadowBlur = 0;
  ctx.font = '14px monospace';
  const what = lastRun.newTime && lastRun.newSmashed ? 'longest run and most bugs smashed'
    : lastRun.newTime ? 'longest run' : 'most bugs smashed';
  ctx.fillStyle = 'rgba(255, 210, 63, 0.85)';
  ctx.fillText(what, 0, 30);
  ctx.restore();
}
