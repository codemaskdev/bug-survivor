import { ctx } from '../core/canvas.js';

// Pixel-art upgrade icons, 16x16, drawn in code in the game's neon style.
// Each map row is 16 characters; '.' is transparent.
const ICONS = {
  linter: {
    colors: { Y: '#ffd23f', d: '#0b0d13' },
    rows: [
      '................',
      '.......YY.......',
      '......YYYY......',
      '......YYYY......',
      '.....YYddYY.....',
      '.....YYddYY.....',
      '....YYYddYYY....',
      '....YYYddYYY....',
      '...YYYYddYYYY...',
      '...YYYYddYYYY...',
      '..YYYYYYYYYYYY..',
      '..YYYYYddYYYYY..',
      '.YYYYYYddYYYYYY.',
      '.YYYYYYYYYYYYYY.',
      '................',
      '................',
    ],
  },
  mech: {
    colors: { O: '#00f0ff', k: '#1a1c24', W: '#e6ebf2' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.OOOOOOOOOOOOOO.',
      '.OkkkkkkkkkkkkO.',
      '.OkWkWkWkWkWkkO.',
      '.OkkkkkkkkkkkkO.',
      '.OkkWkWkWkWkWkO.',
      '.OkkkkkkkkkkkkO.',
      '.OkWkWWWWWWkWkO.',
      '.OkkkkkkkkkkkkO.',
      '.OOOOOOOOOOOOOO.',
      '................',
      '................',
      '................',
    ],
  },
  coffee: {
    colors: { s: '#9fb3c8', M: '#e6ebf2', C: '#7a4a2a', B: '#00f0ff', P: '#9fb3c8' },
    rows: [
      '....s..s........',
      '.....s..s.......',
      '....s..s........',
      '................',
      '..MMMMMMMMMM....',
      '..MCCCCCCCCMMM..',
      '..MMMMMMMMMM..M.',
      '..MBBBBBBBBM..M.',
      '..MMMMMMMMMM..M.',
      '..MMMMMMMMMMMM..',
      '..MMMMMMMMMM....',
      '...MMMMMMMM.....',
      '................',
      '.PPPPPPPPPPPP...',
      '................',
      '................',
    ],
  },
};

const ICON_PIXEL = 3;

// Draws an upgrade's icon centered on (cx, cy), with a soft neon glow
export function drawIcon(key, cx, cy) {
  const icon = ICONS[key];
  if (!icon) return;
  const size = 16 * ICON_PIXEL;
  const left = Math.round(cx - size / 2);
  const top = Math.round(cy - size / 2);
  ctx.save();
  ctx.shadowBlur = 8;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const c = icon.colors[icon.rows[row][col]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.fillRect(left + col * ICON_PIXEL, top + row * ICON_PIXEL, ICON_PIXEL, ICON_PIXEL);
    }
  }
  ctx.restore();
}
