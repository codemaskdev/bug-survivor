import { STEP } from '../../config.js';
import { ctx } from '../../core/canvas.js';
import { waveBonusHp } from './common.js';

const START_R = 8;
const MAX_R = 34;
const GROW = 2.2;       // px of radius per second

function hpForSize(r) {
  return 1 + Math.floor((r - START_R) / 6) + waveBonusHp();
}

// Memory Leak (wave 3+): slow purple blob that grows, and gains HP as it grows.
export const leak = {
  type: 'leak',
  name: 'MEMORY LEAK',
  from: 3,
  color: '#a855ff',
  tip: 'keeps growing. kill it early',
  countForWave: (wave) => 1 + Math.floor((wave - 3) / 6),
  knockback: 30,

  create(b) {
    b.r = START_R;
    b.speed = 42;
    b.hp = hpForSize(b.r);
    b.maxHp = b.hp;
    b.damage = 12;
  },

  grow(b) {
    b.r = Math.min(MAX_R, b.r + GROW * STEP);
    const maxHp = hpForSize(b.r);
    if (maxHp > b.maxHp) {
      b.hp += maxHp - b.maxHp;
      b.maxHp = maxHp;
    }
  },

  // Bigger leaks hit harder (up to 18 at full size)
  contactDamage(b) {
    return b.damage + Math.floor((b.r - START_R) / 9) * 2;
  },

  // A wobbly purple pixel blob with goofy eyes, dripping as it grows
  draw(b, time) {
    const r = b.r;
    const P = 2;
    const flash = b.flash > 0;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));

    // Soft glow behind (a gradient is much cheaper than shadowBlur per pixel)
    const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.6);
    g.addColorStop(0, 'rgba(168, 85, 255, 0.25)');
    g.addColorStop(1, 'rgba(168, 85, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);

    const n = Math.ceil(r * 1.15 / P);
    for (let gy = -n; gy <= n; gy++) {
      for (let gx = -n; gx <= n; gx++) {
        const x = gx * P, y = gy * P;
        const d = Math.hypot(x, y);
        const a = Math.atan2(y, x);
        const edge = r * (1 + Math.sin(a * 5 + time * 3 + b.id) * 0.07 + Math.sin(a * 3 - time * 2) * 0.05);
        if (d > edge) continue;
        let c = '#a855ff';
        if (d > edge - P * 1.2) c = '#4b1b8c';
        else if (x < -r * 0.2 && y < -r * 0.2 && d < r * 0.7) c = '#d3a6ff';
        ctx.fillStyle = flash ? '#fff' : c;
        ctx.fillRect(x - P / 2, y - P / 2, P, P);
      }
    }

    // Drips that fall off the bottom
    ctx.fillStyle = flash ? '#fff' : '#a855ff';
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.8 + i / 3 + b.id * 0.13) % 1;
      const dx = (i - 1) * r * 0.45;
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(Math.round(dx), Math.round(r * 0.85 + t * 10), P, P);
    }
    ctx.globalAlpha = 1;

    // Eyes look at CodeMask
    const e = Math.max(2, Math.round(r / 6)) * 2 / 2;
    const lx = Math.cos(b.angle) * e * 0.5, ly = Math.sin(b.angle) * e * 0.5;
    for (const side of [-1, 1]) {
      const ex = Math.round(side * r * 0.32 - e / 2), ey = Math.round(-r * 0.15 - e / 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(ex, ey, e + 2, e + 2);
      ctx.fillStyle = '#1a0533';
      ctx.fillRect(Math.round(ex + 1 + lx * 0.6), Math.round(ey + 1 + ly * 0.6), Math.max(2, e / 1.5), Math.max(2, e / 1.5));
    }
    ctx.restore();
  },
};
