import { STEP } from '../../config.js';
import { ctx } from '../../core/canvas.js';
import { player } from '../player.js';
import { moveToward } from './common.js';

// The Friday Deploy boss: a giant, angry, neon-red calendar page.
// It lives in the bug list like any other bug, so every weapon can hit it,
// but it never shows up in waves (boss/deploy.js brings it in at 16:59).
export const BOSS_HP = 210;
const P = 5;                 // size of one boss pixel
const W = 26, H = 30;        // page size in boss pixels
const RED = '#ff2e3e';
const DARK = '#2a0710';
const INK = '#0b0d13';

export const friday = {
  type: 'friday',
  color: RED,
  knockback: 0,              // too big to bounce off CodeMask

  create(b) {
    b.boss = true;
    b.r = 62;
    b.speed = 55;
    b.hp = BOSS_HP;
    b.maxHp = BOSS_HP;
    b.damage = 14;
    b.rage = 0;              // drives the shake when it's angry
  },

  // Lumbers after CodeMask; if left far behind it hurries to catch up
  move(b, d) {
    const speed = d > 450 ? b.speed * 3 : b.speed;
    if (d > b.r + 30) moveToward(b, player.x, player.y, speed);
    b.rage = Math.max(0, b.rage - STEP);
  },

  draw(b, time) {
    const flash = b.flash > 0;
    const shake = b.rage > 0 ? Math.round(Math.sin(time * 60) * 2) : 0;
    const left = Math.round(b.x - (W * P) / 2) + shake;
    const top = Math.round(b.y - (H * P) / 2);
    const px = (cx, cy, w = 1, h = 1) => ctx.fillRect(left + cx * P, top + cy * P, w * P, h * P);

    ctx.save();
    // Neon glow and page. Hits only flash the frame white, so a boss that's
    // being hit all the time still reads as red.
    ctx.shadowColor = flash ? '#ffffff' : RED;
    ctx.shadowBlur = 24;
    ctx.fillStyle = flash ? '#ffffff' : RED;
    px(0, 2, W, H - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = RED;
    px(1, 3, W - 2, H - 4);
    ctx.fillStyle = DARK;
    px(1, 8, W - 2, H - 9);

    // Torn-off corner, bottom right
    ctx.fillStyle = '#07080d';
    px(W - 3, H - 1, 3, 1); px(W - 2, H - 2, 2, 1); px(W - 1, H - 3, 1, 1);

    // Binder rings on top
    ctx.fillStyle = '#9fb3c8';
    for (const rx of [5, 12, 19]) { px(rx, 0, 2, 4); }
    ctx.fillStyle = INK;
    for (const rx of [5, 12, 19]) { px(rx, 1, 2, 1); }

    // Header band with FRIDAY
    ctx.fillStyle = INK;
    ctx.font = `bold ${P * 4}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FRIDAY', left + (W * P) / 2, top + 5.6 * P);

    // Faint calendar grid behind the face
    ctx.fillStyle = 'rgba(255, 46, 62, 0.18)';
    for (let gx = 1; gx < W - 1; gx += 4) px(gx, 9, 1, H - 11);
    for (let gy = 9; gy < H - 1; gy += 4) px(1, gy, W - 2, 1);

    // Angry face: slanted brows, glowing eyes, jagged frown
    ctx.fillStyle = RED;
    px(5, 12, 2, 1); px(7, 13, 2, 1); px(9, 14, 2, 1);      // left brow, slanting down to the middle
    px(19, 12, 2, 1); px(17, 13, 2, 1); px(15, 14, 2, 1);   // right brow
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd23f';
    px(7, 16, 3, 2); px(16, 16, 3, 2);                      // eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = RED;
    px(7, 23, 2, 1); px(9, 22, 2, 1); px(11, 23, 2, 1);     // jagged frown
    px(13, 22, 2, 1); px(15, 23, 2, 1); px(17, 22, 2, 1);
    ctx.restore();
  },
};
