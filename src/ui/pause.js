import { VIEW_W, VIEW_H } from '../config.js';
import { canvas, ctx } from '../core/canvas.js';
import { game, session, botPlays } from '../core/state.js';
import { resetGame } from '../core/game.js';
import { isEnded } from './screens.js';
import { isMuted, toggleMute, sfxSelect } from '../fx/sound.js';

// Esc pauses a run (also while the upgrade cards are up) and shows a small
// menu: Resume, Restart, Sound. Arrows/WS + Enter/Space, or the mouse.
// Not available to the bot: autoplay and the attract demo never pause.

const ITEMS = [
  { label: () => 'RESUME', run: resume },
  { label: () => 'RESTART', run: restart },
  { label: () => `SOUND: ${isMuted() ? 'OFF' : 'ON'}`, run: toggleMute },
];
const ITEM_W = 300, ITEM_H = 40, ITEM_GAP = 12, TOP = 270;
let choice = 0;

function itemRect(i) {
  return { x: (VIEW_W - ITEM_W) / 2, y: TOP + i * (ITEM_H + ITEM_GAP), w: ITEM_W, h: ITEM_H };
}

function itemAt(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * VIEW_W / r.width;
  const y = (e.clientY - r.top) * VIEW_H / r.height;
  return ITEMS.findIndex((_, i) => {
    const b = itemRect(i);
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  });
}

function resume() {
  session.paused = false;
  // Upgrade cards slide back in and ignore picks for a moment, so the
  // click or key that resumed doesn't also take the card under it
  if (game.state === 'levelup') game.levelupTime = 0;
}

function restart() {
  session.paused = false;
  resetGame();
}

function canPause() {
  return !botPlays() && !isEnded(game.state);
}

function activate(i) {
  sfxSelect();
  ITEMS[i].run();
}

canvas.addEventListener('mousemove', (e) => {
  if (!session.paused) return;
  const i = itemAt(e);
  if (i >= 0) choice = i;
  canvas.style.cursor = i >= 0 ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  if (!session.paused) return;
  const i = itemAt(e);
  if (i >= 0) activate(i);
  if (!session.paused) canvas.style.cursor = '';
});

// Returns true when the key is used up here. While paused every key except
// M (mute, handled in input.js) belongs to the menu.
export function handlePauseKey(code) {
  if (!session.paused) {
    if (code !== 'Escape' || !canPause()) return false;
    session.paused = true;
    choice = 0;
    return true;
  }
  if (code === 'Escape') resume();
  else if (code === 'ArrowUp' || code === 'KeyW') choice = (choice + ITEMS.length - 1) % ITEMS.length;
  else if (code === 'ArrowDown' || code === 'KeyS') choice = (choice + 1) % ITEMS.length;
  else if (code === 'Enter' || code === 'Space') activate(choice);
  return code !== 'KeyM';
}

export function drawPause(time) {
  ctx.fillStyle = 'rgba(5, 6, 10, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = 'rgba(255, 46, 99, 0.6)';
  ctx.fillText('PAUSED', VIEW_W / 2 + 3, 192);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 20;
  ctx.fillText('PAUSED', VIEW_W / 2, 190);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 20px monospace';
  ITEMS.forEach((item, i) => {
    const r = itemRect(i);
    const on = i === choice;
    ctx.fillStyle = on ? 'rgba(0, 240, 255, 0.14)' : 'rgba(5, 6, 10, 0.6)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? '#00f0ff' : 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = on ? 2 : 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.fillStyle = on ? '#00f0ff' : 'rgba(230, 235, 242, 0.75)';
    if (on) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
    }
    ctx.fillText(on ? `▶ ${item.label()} ◀` : item.label(), VIEW_W / 2, r.y + r.h / 2 + 1);
    ctx.shadowBlur = 0;
  });

  ctx.font = '13px monospace';
  ctx.fillStyle = `rgba(230, 235, 242, ${0.5 + Math.sin(time * 3) * 0.15})`;
  ctx.fillText('↑ ↓ choose  ·  Enter select  ·  Esc resume', VIEW_W / 2, TOP + ITEMS.length * (ITEM_H + ITEM_GAP) + 24);
  ctx.restore();
}
