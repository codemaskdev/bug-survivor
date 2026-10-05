import { ARENA_W, ARENA_H, GRID } from '../config.js';
import { ctx } from '../core/canvas.js';

export function drawArena(time) {
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Subtle neon grid, gently pulsing
  const pulse = 0.06 + Math.sin(time * 1.5) * 0.015;
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA_W; x += GRID) {
    const major = (x / GRID) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, ARENA_H);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA_H; y += GRID) {
    const major = (y / GRID) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(ARENA_W, y + 0.5);
    ctx.stroke();
  }

  // Vignette
  const g = ctx.createRadialGradient(
    ARENA_W / 2, ARENA_H / 2, ARENA_H * 0.3,
    ARENA_W / 2, ARENA_H / 2, ARENA_W * 0.7
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Glowing arena border
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, ARENA_W - 4, ARENA_H - 4);
  ctx.restore();
}
