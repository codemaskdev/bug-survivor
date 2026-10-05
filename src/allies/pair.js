import { STEP, VIEW_W, VIEW_H } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { addPopup, smashFx } from '../fx/particles.js';
import { shake } from '../fx/shake.js';
import { sfxPairDrop, sfxGun } from '../fx/sound.js';
import { player } from '../entities/player.js';
import { damageBug, flushNewBugs } from '../entities/bugs/index.js';

// The Pair Programmer: backup for the Friday Deploy fight.
// Unlocks after you lose to the boss once (killed during the fight, or the
// clock hits 17:00). Then, once per run while the boss is up, B calls him:
// he drops in, follows CodeMask and fires two orange machine guns for 15 s,
// one at the boss and one at the bugs, then leaves.
const STAY = 15;             // seconds he fights
const DROP_TIME = 0.5;       // falling in
const LEAVE_TIME = 0.6;      // jumping back out
const FIRE_EVERY = 1 / 10;   // seconds between shots, per gun
const BULLET_SPEED = 700;
const BULLET_LIFE = 0.8;
const COLOR = '#ffa230';     // warm orange: the opposite of CodeMask's cyan
const GUN = '#ffc04d';
const UNLOCK_KEY = 'bug-survivor-pair-unlocked';

const pair = {
  unlocked: loadUnlocked(),  // survives restarts (and page reloads when playing by hand)
  used: false,               // called this run
  phase: 'off',              // off -> drop -> fight -> leave -> off
  t: 0,
  x: 0, y: 0,
  guns: [{ timer: 0, angle: 0, flash: 0 }, { timer: FIRE_EVERY / 2, angle: Math.PI, flash: 0 }],
  bullets: [],               // { x, y, vx, vy, age, pierce, hit }
  ring: 0,                   // landing shockwave, 0..1
};

// Autoplay must replay exactly, so it never reads saved progress
function loadUnlocked() {
  if (AUTOPLAY) return false;
  try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; }
}

export function unlockPair() {
  if (pair.unlocked) return;
  pair.unlocked = true;
  if (!AUTOPLAY) {
    try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* private mode */ }
  }
}

export function resetPair() {
  pair.used = false;
  pair.phase = 'off';
  pair.bullets = [];
}

function bossUp() {
  return game.bugs.some((b) => b.boss);
}

export function canCallPair() {
  return pair.unlocked && !pair.used && game.state === 'playing' && bossUp();
}

export function callPair() {
  if (!canCallPair()) return;
  pair.used = true;
  pair.phase = 'drop';
  pair.t = 0;
  pair.x = player.x + 40;
  pair.y = player.y;
}

// Where he stands: beside CodeMask, on the other side from where it's facing
function homeSpot() {
  const side = player.lookX > 0 ? -1 : 1;
  return { x: player.x + side * 62, y: player.y - 10 };
}

function nearest(list) {
  let best = null, bestD = Infinity;
  for (const b of list) {
    const d = Math.hypot(b.x - pair.x, b.y - pair.y);
    if (d < bestD) { best = b; bestD = d; }
  }
  return best;
}

export function updatePair() {
  // Bullets keep flying even after he leaves
  for (const k of pair.bullets) {
    k.age += STEP;
    k.x += k.vx * STEP;
    k.y += k.vy * STEP;
    for (const b of game.bugs) {
      if (b.dead || k.hit.has(b)) continue;
      if (Math.hypot(b.x - k.x, b.y - k.y) < b.r + 3) {
        k.hit.add(b);
        if (damageBug(b, 1, false)) b.dead = true;
        // Shots meant for the boss punch through small bugs on the way
        if (!k.pierce || b.boss) {
          k.age = BULLET_LIFE;
          break;
        }
      }
    }
  }
  pair.bullets = pair.bullets.filter((k) => k.age < BULLET_LIFE);
  game.bugs = game.bugs.filter((b) => !b.dead);
  flushNewBugs();
  for (const g of pair.guns) if (g.flash > 0) g.flash -= STEP;
  if (pair.ring > 0) pair.ring = Math.max(0, pair.ring - STEP * 1.5);

  if (pair.phase === 'off') return;
  pair.t += STEP;
  const home = homeSpot();

  if (pair.phase === 'drop') {
    pair.x = home.x;
    pair.y = home.y;
    if (pair.t >= DROP_TIME) {
      // Touchdown: shockwave, shake, dust, and a shout
      pair.phase = 'fight';
      pair.t = 0;
      pair.ring = 1;
      shake.amount = 10;
      sfxPairDrop();
      for (let i = 0; i < 6; i++) smashFx(pair.x + (i - 2.5) * 10, pair.y + 20, false, i % 2 ? COLOR : '#9fb3c8');
      addPopup({ x: pair.x, y: pair.y - 48, text: 'PAIR PROGRAMMER!', size: 22, life: 0.7, tilt: 0, color: COLOR }, 9999);
    }
    return;
  }

  if (pair.phase === 'leave') {
    if (pair.t >= LEAVE_TIME) pair.phase = 'off';
    return;
  }

  // Fighting: stick close to CodeMask, both guns blazing
  const dx = home.x - pair.x, dy = home.y - pair.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) {
    const step = Math.min(d, (220 + d * 3) * STEP);
    pair.x += (dx / d) * step;
    pair.y += (dy / d) * step;
  }

  const boss = game.bugs.find((b) => b.boss);
  const small = nearest(game.bugs.filter((b) => !b.boss));
  // Left gun on the boss, right gun on the bugs; each takes the other's
  // target when its own is missing
  const targets = [boss || small, small || boss];
  pair.guns.forEach((g, i) => {
    const target = targets[i];
    if (!target) return;
    g.angle = Math.atan2(target.y - pair.y, target.x - pair.x);
    g.timer -= STEP;
    if (g.timer > 0) return;
    g.timer = FIRE_EVERY;
    g.flash = 0.05;
    const mx = pair.x + (i === 0 ? FIST_X : -FIST_X) + Math.cos(g.angle) * 40;
    const my = pair.y + FIST_Y + Math.sin(g.angle) * 40;
    pair.bullets.push({
      x: mx, y: my, vx: Math.cos(g.angle) * BULLET_SPEED, vy: Math.sin(g.angle) * BULLET_SPEED, age: 0,
      pierce: target.boss, hit: new Set(),
    });
    sfxGun();
  });

  if (pair.t >= STAY) {
    pair.phase = 'leave';
    pair.t = 0;
    addPopup({ x: pair.x, y: pair.y - 48, text: 'brb, standup', size: 16, life: 0.7, tilt: 0, color: COLOR }, 9999);
  }
}

// ---------- Drawing ----------
// A buff bro: short hair, shades, beard, big traps and arms, dark hoodie with
// an orange neon outline and drawstrings, fists holding the guns.
// 3 px pixels: half again as tall as CodeMask. No logos.
// K = hair, S = skin, G = shades, g = shade glint, B = beard,
// O = orange outline, D = hoodie, s = drawstring
const P = 3;
const SPRITE = [
  '.........KKKKKK.........',
  '........KKKKKKKK........',
  '........KSSSSSSK........',
  '........SGGgGGgS........',
  '........SSSSSSSS........',
  '........SBSSSSBS........',
  '.........BBBBBB.........',
  '......OOOOOOOOOOOO......',
  '....OOODDDDDDDDDDOOO....',
  '...ODDDDDDDDDDDDDDDDO...',
  '..ODDDDDDsDDDDsDDDDDDO..',
  '.ODDDODDDsDDDDsDDDODDDO.',
  '.ODDDODDDDDDDDDDDDODDDO.',
  '.ODDDODDDDDDDDDDDDODDDO.',
  '.ODDDODDDDDDDDDDDDODDDO.',
  '.OSSSODDDDDDDDDDDDOSSSO.',
  '.OOOOODDDDDDDDDDDDOOOOO.',
  '.....ODDDDDDDDDDDDO.....',
  '.....ODDDDDOODDDDDO.....',
  '.....ODDDDO..ODDDDO.....',
  '.....OOOOOO..OOOOOO.....',
];
const COLORS = {
  K: '#3a2414', S: '#d39a6a', G: '#0b0d13', g: COLOR, B: '#5a3a20',
  O: COLOR, D: '#2b2d36', s: COLOR,
};
const W = SPRITE[0].length * P, H = SPRITE.length * P;
// Where the fists are, relative to his center (the guns sit there)
const FIST_X = 3.5 * P + P / 2 - W / 2;        // left fist; the right one is mirrored
const FIST_Y = 15.5 * P - H / 2;

function drawGun(x, y, angle, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#0b0d13';                // dark outline, so the gun reads against his orange outline
  ctx.fillRect(-8, -7, 36, 14);
  ctx.fillRect(0, 5, 12, 10);
  ctx.shadowColor = GUN;
  ctx.shadowBlur = 6;
  ctx.fillStyle = GUN;
  ctx.fillRect(-6, -5, 32, 10);             // orange body
  ctx.fillRect(2, 5, 8, 8);                 // ammo drum
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a1c24';
  ctx.fillRect(-6, -1, 32, 2);              // dark seam
  ctx.fillRect(26, -2, 10, 4);              // barrel
  if (flash > 0) {
    ctx.fillStyle = '#fff3c4';
    ctx.shadowColor = COLOR;
    ctx.shadowBlur = 14;
    ctx.fillRect(36, -5, 9, 10);            // muzzle flash
  }
  ctx.restore();
}

export function drawPair() {
  // Tracers
  if (pair.bullets.length) {
    ctx.save();
    ctx.strokeStyle = COLOR;
    ctx.shadowColor = COLOR;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 2;
    for (const k of pair.bullets) {
      ctx.beginPath();
      ctx.moveTo(k.x, k.y);
      ctx.lineTo(k.x - k.vx * 0.012, k.y - k.vy * 0.012);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Landing shockwave
  if (pair.ring > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 162, 48, ${pair.ring})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(pair.x, pair.y + H / 2, 30 + (1 - pair.ring) * 120, 10 + (1 - pair.ring) * 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (pair.phase === 'off') return;
  // Falls in from above the screen, jumps back out the same way
  let lift = 0;
  if (pair.phase === 'drop') lift = (1 - pair.t / DROP_TIME) ** 2 * (VIEW_H * 0.7);
  if (pair.phase === 'leave') lift = (pair.t / LEAVE_TIME) ** 2 * (VIEW_H * 0.7);
  const left = Math.round(pair.x - W / 2), top = Math.round(pair.y - H / 2 - lift);

  ctx.save();
  // Warm glow so he stands out next to cyan CodeMask
  const glow = ctx.createRadialGradient(pair.x, pair.y - lift, 8, pair.x, pair.y - lift, 50);
  glow.addColorStop(0, 'rgba(255, 162, 48, 0.18)');
  glow.addColorStop(1, 'rgba(255, 162, 48, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(pair.x - 50, pair.y - lift - 50, 100, 100);
  for (let r = 0; r < SPRITE.length; r++) {
    for (let c = 0; c < SPRITE[r].length; c++) {
      const ch = SPRITE[r][c];
      const col = COLORS[ch];
      if (!col) continue;
      const neon = ch === 'O' || ch === 's' || ch === 'g';
      ctx.shadowColor = neon ? COLOR : 'transparent';
      ctx.shadowBlur = neon ? 6 : 0;
      ctx.fillStyle = col;
      ctx.fillRect(left + c * P, top + r * P, P, P);
    }
  }
  ctx.restore();

  // Two machine guns in his fists, always in front so they stay readable
  const [gl, gr] = pair.guns;
  drawGun(left + W / 2 + FIST_X, top + H / 2 + FIST_Y, gl.angle, gl.flash);
  drawGun(left + W / 2 - FIST_X, top + H / 2 + FIST_Y, gr.angle, gr.flash);

  // Time left, over his head
  if (pair.phase === 'fight') {
    const frac = 1 - pair.t / STAY;
    ctx.fillStyle = 'rgba(255, 162, 48, 0.25)';
    ctx.fillRect(left, top - 8, W, 3);
    ctx.fillStyle = COLOR;
    ctx.fillRect(left, top - 8, Math.round(W * frac), 3);
  }
}

// "Press B" hint, screen-fixed above the XP bar
export function drawPairHint(time) {
  if (!canCallPair()) return;
  const a = 0.6 + Math.sin(time * 5) * 0.3;
  ctx.save();
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255, 162, 48, ${a})`;
  ctx.shadowColor = COLOR;
  ctx.shadowBlur = 12;
  ctx.fillText('Press B — call your Pair Programmer', VIEW_W / 2, VIEW_H - 64);
  ctx.restore();
}
