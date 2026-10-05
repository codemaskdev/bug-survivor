import { VIEW_W, VIEW_H, GRID } from '../config.js';
import { ctx } from '../core/canvas.js';
import { viewRect } from '../core/camera.js';

// The endless floor: a neon grid fixed to the world, so it scrolls as
// CodeMask moves. Drawn in world coordinates (inside the camera transform);
// only the lines that are on screen get drawn.
export function drawGrid(time) {
  const v = viewRect(GRID);
  ctx.fillStyle = '#07080d';
  ctx.fillRect(v.left, v.top, v.right - v.left, v.bottom - v.top);

  // Subtle neon grid, gently pulsing; every 5th line is brighter
  const pulse = 0.06 + Math.sin(time * 1.5) * 0.015;
  ctx.lineWidth = 1;
  const x0 = Math.floor(v.left / GRID), x1 = Math.ceil(v.right / GRID);
  const y0 = Math.floor(v.top / GRID), y1 = Math.ceil(v.bottom / GRID);
  for (let i = x0; i <= x1; i++) {
    const major = ((i % 5) + 5) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(i * GRID + 0.5, v.top);
    ctx.lineTo(i * GRID + 0.5, v.bottom);
    ctx.stroke();
  }
  for (let j = y0; j <= y1; j++) {
    const major = ((j % 5) + 5) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(v.left, j * GRID + 0.5);
    ctx.lineTo(v.right, j * GRID + 0.5);
    ctx.stroke();
  }
}

// Darkened screen corners. Drawn in screen coordinates, above the world.
export function drawVignette() {
  const g = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3,
    VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.7
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
