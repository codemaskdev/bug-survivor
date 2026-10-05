import { STEP } from '../../config.js';
import { ctx } from '../../core/canvas.js';
import { rng } from '../../core/rng.js';
import { player } from '../player.js';
import { waveBonusHp, moveToward } from './common.js';

const ORBIT_R = 140;
const DASH_SPEED = 520;

// Infinite Loop (wave 5+): orange ring that circles you, then dashes in.
export const loop = {
  type: 'loop',
  name: 'INFINITE LOOP',
  from: 5,
  color: '#ff8c1a',
  tip: 'circles you, then dashes in',
  countForWave: (wave) => 1 + Math.floor((wave - 5) / 6),

  create(b) {
    b.r = 8;
    b.speed = 150;
    b.hp = 2 + waveBonusHp();
    b.damage = 15;
    b.phase = 'approach';    // approach -> orbit -> windup -> dash -> approach
    b.timer = 0;
    b.orbitDir = rng() < 0.5 ? 1 : -1;
    b.spin = 0;
    b.trail = [];
  },

  move(b, d) {
    b.spin += (b.phase === 'windup' ? 22 : 9) * STEP;
    b.timer -= STEP;
    if (b.phase === 'approach') {
      moveToward(b, player.x, player.y, b.speed);
      if (d < ORBIT_R + 10) {
        b.phase = 'orbit';
        b.timer = 1.8 + rng() * 1.8;
      }
    } else if (b.phase === 'orbit') {
      // Slide around CodeMask, easing back to the orbit radius
      const a = Math.atan2(b.y - player.y, b.x - player.x) + b.orbitDir * 1.5 * STEP;
      const r = d + (ORBIT_R - d) * 0.08;
      b.x = player.x + Math.cos(a) * r;
      b.y = player.y + Math.sin(a) * r;
      if (b.timer <= 0) {
        b.phase = 'windup';
        b.timer = 0.4;
      }
    } else if (b.phase === 'windup') {
      // Stops and revs up: the tell before the dash
      if (b.timer <= 0) {
        b.phase = 'dash';
        b.timer = 0.5;
        b.dashAngle = Math.atan2(player.y - b.y, player.x - b.x);
      }
    } else if (b.phase === 'dash') {
      b.x += Math.cos(b.dashAngle) * DASH_SPEED * STEP;
      b.y += Math.sin(b.dashAngle) * DASH_SPEED * STEP;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 8) b.trail.shift();
      if (b.timer <= 0) b.phase = 'approach';
    }
    if (b.phase !== 'dash' && b.trail.length) b.trail.shift();
  },

  // After bumping into CodeMask it backs off and starts circling again
  onContact(b) {
    b.phase = 'approach';
  },

  // A spinning orange ↻ ring. Flashes white right before it dashes.
  draw(b, time) {
    ctx.save();
    // Dash trail
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      ctx.globalAlpha = (i + 1) / b.trail.length * 0.35;
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.translate(Math.round(b.x), Math.round(b.y));
    const winding = b.phase === 'windup';
    const blink = winding && Math.floor(time * 20) % 2 === 0;
    const color = b.flash > 0 || blink ? '#ffffff' : '#ff8c1a';
    const r = b.r * (winding ? 1.2 : 1);
    ctx.rotate(b.spin * b.orbitDir);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = '#ff8c1a';
    ctx.shadowBlur = winding ? 16 : 8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 1.55);
    ctx.stroke();
    // Arrowhead at the end of the ring
    const ax = Math.cos(Math.PI * 1.55) * r, ay = Math.sin(Math.PI * 1.55) * r;
    ctx.beginPath();
    ctx.moveTo(ax - 4, ay - 1);
    ctx.lineTo(ax + 4, ay - 1);
    ctx.lineTo(ax, ay + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1, -1, 3, 3);
    ctx.restore();
  },
};
