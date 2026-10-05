import { BUG_PIXEL, BUG_SPEED, BUG_DAMAGE } from '../../config.js';
import { ctx } from '../../core/canvas.js';
import { rng } from '../../core/rng.js';
import { glitchNoise } from '../../fx/glitch.js';
import { waveBonusHp } from './common.js';

// Null Pointer: the basic swarm. Fast, fragile, crawls straight at you.
export const nullptr = {
  type: 'nullptr',
  name: 'NULL POINTER',
  from: 1,
  color: '#ff2e63',
  tip: 'fast, weak, comes in swarms',
  countForWave: (wave) => 4 + wave * 2,

  create(b) {
    b.r = 6;
    b.speed = BUG_SPEED * (0.85 + rng() * 0.3);
    b.hp = 1 + waveBonusHp();
    b.damage = BUG_DAMAGE;
  },

  draw(b, time, tick) {
    const frame = FRAMES[Math.floor(time * 12 + b.id) % 2];
    const noise = glitchNoise(b.id, tick);
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.rotate(b.angle + Math.PI / 2);

    // Glitch: now and then the bug splits into a cyan ghost and jitters sideways
    if (noise < 0.12) {
      const jitter = (glitchNoise(b.id + 7, tick) - 0.5) * 6;
      ctx.globalAlpha = 0.6;
      ctx.translate(jitter, 0);
      drawSprite(frame, GLITCH_CYAN);
      ctx.translate(-jitter * 1.6, 0);
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = '#ff2e63';
    ctx.shadowBlur = 6;
    drawSprite(frame, b.flash > 0 ? FLASH_COLORS : COLORS);
    ctx.restore();
  },
};

// Facing up (antennae on top).
// a = antenna, r = shell, R = shell highlight, W = eye, l = leg
const FRAMES = [
  [
    '.a...a.',
    '..rWr..',
    'lrRRRrl',
    '.rRRRr.',
    'lrRRRrl',
    '..r.r..',
  ],
  [
    'a.....a',
    '..rWr..',
    '.rRRRr.',
    'lrRRRrl',
    '.rRRRr.',
    '.l.r.l.',
  ],
];
const COLORS = {
  a: '#ff2e63',
  r: '#ff2e63',
  R: '#ff6b95',
  W: '#ffe3ec',
  l: '#a3133b',
};
const GLITCH_CYAN = { a: '#00f0ff', r: '#00f0ff', R: '#00f0ff', W: '#00f0ff', l: '#00f0ff' };
const FLASH_COLORS = { a: '#fff', r: '#fff', R: '#fff', W: '#fff', l: '#fff' };

function drawSprite(frame, colors) {
  const w = frame[0].length * BUG_PIXEL;
  const h = frame.length * BUG_PIXEL;
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[row].length; col++) {
      const c = colors[frame[row][col]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(col * BUG_PIXEL - w / 2, row * BUG_PIXEL - h / 2, BUG_PIXEL, BUG_PIXEL);
    }
  }
}
