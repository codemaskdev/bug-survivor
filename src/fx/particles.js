import { STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { fxRng } from '../core/rng.js';
import { UP } from '../upgrades/upgrades.js';
import { shake, updateShake } from './shake.js';

export const fx = {
  particles: [],   // flying keycaps and bug bits
  popups: [],      // "CLACK!" texts
};

export function resetFx() {
  fx.particles = [];
  fx.popups = [];
}

// Adds a pop-up text, replacing any older one within `radius` of the same spot
export function addPopup(popup, radius) {
  fx.popups = fx.popups.filter((p) => Math.hypot(p.x - popup.x, p.y - popup.y) > radius);
  fx.popups.push(popup);
}

// Merge Conflict splitting: a burst of conflict markers
export function splitFx(x, y) {
  shake.amount = Math.min(8, shake.amount + 2);
  addPopup({ x, y: y - 16, text: '<<<<<<< =======', size: 13, life: 0.6, tilt: 0, color: '#ffe14d' }, 40);
  for (let i = 0; i < 8; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 60 + fxRng() * 120;
    fx.particles.push({
      kind: 'bit',
      color: i % 2 ? '#3d8bff' : '#ffe14d',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: 0, spin: 0, letter: '',
      life: 0.3 + fxRng() * 0.3,
    });
  }
}

const KEYCAP_LETTERS = 'QWERTYASDFGHZXCV{};/<>';

export function smashFx(x, y, fromKeyboard, color) {
  // Keycaps pop off and tumble away (only when the keyboard did it)
  const caps = fromKeyboard ? 2 + Math.floor(fxRng() * 2) + UP.mech.level : 0;
  for (let i = 0; i < caps; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 90 + fxRng() * 120;
    fx.particles.push({
      kind: 'cap',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 80,
      rot: fxRng() * Math.PI,
      spin: (fxRng() - 0.5) * 16,
      letter: KEYCAP_LETTERS[Math.floor(fxRng() * KEYCAP_LETTERS.length)],
      life: 0.6 + fxRng() * 0.3,
    });
  }
  // Plus a few bug bits in the bug's color
  for (let i = 0; i < 5; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 60 + fxRng() * 140;
    fx.particles.push({
      kind: 'bit',
      color,
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: 0, spin: 0, letter: '',
      life: 0.25 + fxRng() * 0.25,
    });
  }
}

export function updateFx() {
  for (const p of fx.particles) {
    p.life -= STEP;
    p.x += p.vx * STEP;
    p.y += p.vy * STEP;
    p.vx *= 0.94;
    p.vy = p.vy * 0.94 + (p.kind === 'cap' ? 500 * STEP : 0);
    p.rot += p.spin * STEP;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);

  for (const p of fx.popups) {
    p.life -= STEP;
    p.y -= 40 * STEP;
  }
  fx.popups = fx.popups.filter((p) => p.life > 0);

  updateShake();
}

export function drawFx() {
  for (const p of fx.particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.translate(p.x, p.y);
    if (p.kind === 'cap') {
      ctx.rotate(p.rot);
      ctx.fillStyle = '#9fb3c8';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#e6ebf2';
      ctx.fillRect(-4, -5, 8, 7);
      ctx.fillStyle = '#1a1c24';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.letter, 0, -1.5);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-1, -1, 2, 2);
    }
    ctx.restore();
  }

  for (const p of fx.popups) {
    const age = 0.7 - p.life;
    const pop = age < 0.08 ? 0.6 + age / 0.08 * 0.6 : 1.2 - Math.min(0.2, (age - 0.08) * 2);
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    ctx.scale(pop, pop);
    ctx.font = `bold ${p.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#05060a';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.color || '#fff36b';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}
