import { VIEW_W, STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { glitchNoise } from '../fx/glitch.js';

// "NEW BUG: ..." announcements, shown one at a time
let banners = [];

export function resetBanners() {
  banners = [];
}

export function showBanner(text, tip, color) {
  banners.push({ text, tip, color, life: 2.8 });
}

export function updateBanners() {
  if (banners.length) {
    banners[0].life -= STEP;
    if (banners[0].life <= 0) banners.shift();
  }
}

// Slides in with a glitch, in the species' color
export function drawBanner() {
  const b = banners[0];
  if (!b) return;
  const age = 2.8 - b.life;
  const inT = Math.min(1, age / 0.25);
  const alpha = Math.min(1, b.life / 0.4) * inT;
  const y = 130;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.7)';
  ctx.fillRect(0, y - 34, VIEW_W, 68);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, y - 34, VIEW_W, 2);
  ctx.fillRect(0, y + 32, VIEW_W, 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px monospace';
  const x = VIEW_W / 2 + (1 - inT) * -120;
  const j = glitchNoise(3, Math.floor(age * 15)) < 0.3 ? (glitchNoise(4, Math.floor(age * 15)) - 0.5) * 10 : 0;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.fillText(b.text, x + j, y - 6);
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 16;
  ctx.fillText(b.text, x, y - 6);
  ctx.shadowBlur = 0;
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
  ctx.fillText(b.tip, x, y + 18);
  ctx.restore();
}
