import { ARENA_W, ARENA_H } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { UPGRADES } from '../upgrades/upgrades.js';
import { pickCard } from '../upgrades/levelup.js';
import { drawIcon } from './icons.js';

// Card layout, shared by drawing and mouse clicks
const CARD_W = 220, CARD_H = 260, CARD_GAP = 30;
function cardRect(i) {
  const total = CARD_W * 3 + CARD_GAP * 2;
  return {
    x: (ARENA_W - total) / 2 + i * (CARD_W + CARD_GAP),
    y: (ARENA_H - CARD_H) / 2 + 20,
    w: CARD_W,
    h: CARD_H,
  };
}

function cardAt(px, py) {
  for (let i = 0; i < 3; i++) {
    const r = cardRect(i);
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('mousemove', (e) => {
  if (game.state !== 'levelup' || AUTOPLAY) return;
  const r = canvas.getBoundingClientRect();
  const i = cardAt((e.clientX - r.left) * ARENA_W / r.width, (e.clientY - r.top) * ARENA_H / r.height);
  if (i >= 0) game.cardChoice = i;
});
canvas.addEventListener('click', (e) => {
  if (game.state !== 'levelup' || AUTOPLAY) return;
  const r = canvas.getBoundingClientRect();
  const i = cardAt((e.clientX - r.left) * ARENA_W / r.width, (e.clientY - r.top) * ARENA_H / r.height);
  if (i >= 0) pickCard(i);
});

function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawUpgradeCards() {
  ctx.fillStyle = `rgba(5, 6, 10, ${Math.min(0.75, game.levelupTime * 4)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 16;
  ctx.fillText(`LEVEL UP  ·  LVL ${game.level}`, ARENA_W / 2, cardRect(0).y - 50);
  ctx.restore();

  const slide = Math.min(1, game.levelupTime * 5);
  for (let i = 0; i < 3; i++) {
    const u = UPGRADES[i];
    const r = cardRect(i);
    const selected = i === game.cardChoice;
    const y = r.y + (1 - slide) * 40 - (selected ? 8 : 0);

    ctx.save();
    ctx.globalAlpha = slide;
    ctx.fillStyle = selected ? '#0f1a22' : '#0b0d13';
    ctx.fillRect(r.x, y, r.w, r.h);
    ctx.strokeStyle = selected ? '#00f0ff' : 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 2;
    if (selected) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
    }
    ctx.strokeRect(r.x + 1, y + 1, r.w - 2, r.h - 2);
    ctx.shadowBlur = 0;

    drawIcon(u.key, r.x + r.w / 2, y + 60);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 17px monospace';
    ctx.fillStyle = '#00f0ff';
    for (const [k, line] of wrapText(u.name, r.w - 24).entries()) {
      ctx.fillText(line, r.x + r.w / 2, y + 112 + k * 20);
    }

    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
    for (const [k, line] of wrapText(u.describe(u.level), r.w - 30).entries()) {
      ctx.fillText(line, r.x + r.w / 2, y + 164 + k * 17);
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#39ff88';
    ctx.fillText(u.level === 0 ? 'NEW' : `LV ${u.level} → ${u.level + 1}`, r.x + r.w / 2, y + r.h - 40);

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, y + r.h - 18);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.fillText(AUTOPLAY ? 'bot is choosing…' : '1 / 2 / 3, click, or ← → + Enter',
    ARENA_W / 2, cardRect(0).y + CARD_H + 40);
  ctx.restore();
}
