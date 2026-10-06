import { VIEW_W, VIEW_H, VIDEO_URL } from '../config.js';
import { canvas, ctx } from '../core/canvas.js';
import { session } from '../core/state.js';
import { startGame } from '../core/game.js';
import { glitchNoise } from '../fx/glitch.js';
import { isMuted } from '../fx/sound.js';

// The start screen, drawn over the attract demo (the bot playing, dimmed).
// The middle of the screen stays clear so CodeMask is visible fighting there.
// Space starts a run; the "Watch how it was made" line is a clickable link.

// Two columns: [key, what it does, column x where keys end]
const CONTROLS = [
  ['WASD / ← ↑ → ↓', () => 'move', 300],
  ['SPACE / J', () => 'swing the keyboard', 300],
  ['B', () => 'call Pair Programmer (boss)', 300],
  ['M', () => `mute  (sound ${isMuted() ? 'OFF' : 'ON'})`, 630],
  ['ESC', () => 'pause', 630],
];

// The video link's hit box, shared by drawing and the mouse
const LINK = { x: VIEW_W / 2 - 150, y: 586, w: 300, h: 30 };
let linkHover = false;

function overLink(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * VIEW_W / r.width;
  const y = (e.clientY - r.top) * VIEW_H / r.height;
  return x >= LINK.x && x <= LINK.x + LINK.w && y >= LINK.y && y <= LINK.y + LINK.h;
}

canvas.addEventListener('mousemove', (e) => {
  linkHover = session.title && overLink(e);
  canvas.style.cursor = linkHover ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  if (session.title && overLink(e)) window.open(VIDEO_URL, '_blank', 'noopener');
});

// Keys on the start screen. Returns true when the key is used up here, so
// it doesn't also count as a swing or a restart. M (mute) still works.
export function handleTitleKey(code) {
  if (!session.title) return false;
  if (code === 'Space' || code === 'Enter') {
    startGame();
    linkHover = false;
    canvas.style.cursor = '';
  }
  return code !== 'KeyM';
}

export function drawTitle(time) {
  ctx.fillStyle = 'rgba(5, 6, 10, 0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title: cyan neon with a pink ghost that glitches now and then
  const tick = Math.floor(time * 15);
  const j = glitchNoise(11, tick) < 0.2 ? (glitchNoise(12, tick) - 0.5) * 12 : 0;
  ctx.font = 'bold 76px monospace';
  ctx.fillStyle = 'rgba(255, 46, 99, 0.6)';
  ctx.fillText('BUG SURVIVOR', VIEW_W / 2 + 3 + j, 82);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 24;
  ctx.fillText('BUG SURVIVOR', VIEW_W / 2, 80);
  ctx.shadowBlur = 0;

  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
  ctx.fillText('FRI 16:57. Three minutes until the weekend.', VIEW_W / 2, 134);
  ctx.fillText('Smash the bugs, grab the commits, survive the Friday Deploy.', VIEW_W / 2, 156);

  // Press Space, pulsing
  ctx.font = 'bold 28px monospace';
  ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.4;
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 16;
  ctx.fillText('PRESS SPACE TO START', VIEW_W / 2, 412);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Controls panel
  const px = 140, py = 440, pw = VIEW_W - 280, ph = 96;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.6)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  ctx.font = '15px monospace';
  CONTROLS.forEach(([key, action, kx], i) => {
    const y = py + 24 + (i % 3) * 24;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(key, kx, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
    ctx.fillText(action(), kx + 16, y);
  });
  ctx.textAlign = 'center';

  // How it was made
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.7)';
  ctx.fillText('Built entirely by Claude Code — no hand-written code', VIEW_W / 2, 570);
  ctx.font = 'bold 17px monospace';
  ctx.fillStyle = '#ff2e63';
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = linkHover ? 18 : 8;
  const label = '▶ Watch how it was made';
  const ly = LINK.y + LINK.h / 2;
  ctx.fillText(label, VIEW_W / 2, ly);
  if (linkHover) {
    const w = ctx.measureText(label).width;
    ctx.fillRect(VIEW_W / 2 - w / 2, ly + 11, w, 2);
  }
  ctx.shadowBlur = 0;

  // A small tag so it's clear the game behind is a demo, not you
  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  ctx.fillStyle = Math.floor(time * 2) % 2 ? 'rgba(255, 46, 99, 0.9)' : 'rgba(255, 46, 99, 0.3)';
  ctx.fillRect(16, 18, 7, 7);
  ctx.fillStyle = 'rgba(230, 235, 242, 0.6)';
  ctx.fillText('DEMO  the bot is playing', 30, 22);
  ctx.restore();
}
