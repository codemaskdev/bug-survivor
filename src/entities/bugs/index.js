import { ARENA_W, ARENA_H, STEP, PLAYER_RADIUS, HIT_COOLDOWN } from '../../config.js';
import { rng } from '../../core/rng.js';
import { game } from '../../core/state.js';
import { smashFx } from '../../fx/particles.js';
import { showBanner } from '../../ui/banner.js';
import { player } from '../player.js';
import { dropCommit } from '../commits.js';
import { moveToward } from './common.js';
import { nullptr } from './nullptr.js';
import { leak } from './leak.js';
import { loop } from './loop.js';
import { merge, mergeOurs, mergeTheirs } from './merge.js';

// ---------- Bug species registry ----------
// To add a species: create a file next to this one exporting an object with
//   type, color, create(b), draw(b, time, tick)
// plus, if it shows up in waves: name, from, tip, countForWave(wave).
// Optional hooks: grow(b), move(b, distToPlayer), contactDamage(b),
//   knockback, onContact(b), onHit(b, spawn) -> true if it handled the hit.
// Then add it to the lists below.

// Wave species, in spawn order
const WAVE_SPECIES = [nullptr, leak, loop, merge];

const TYPES = Object.fromEntries(
  [nullptr, leak, loop, merge, mergeOurs, mergeTheirs].map((s) => [s.type, s])
);

let seenSpecies = new Set();
let newBugs = [];            // bugs born mid-update (merge splits)

export function resetBugs() {
  seenSpecies = new Set();
  newBugs = [];
}

export function makeBug(type, x, y) {
  const b = {
    id: game.nextBugId++,
    type,
    x, y,
    angle: 0,
    stun: 0,
    flash: 0,        // white flash when hit but not dead
    swingId: -1,     // last swing that hit this bug (one hit per swing)
  };
  TYPES[type].create(b);
  return b;
}

function edgePoint(edge) {
  const t = rng();
  if (edge === 0) return { x: t * ARENA_W, y: -14 };              // top
  if (edge === 1) return { x: ARENA_W + 14, y: t * ARENA_H };     // right
  if (edge === 2) return { x: t * ARENA_W, y: ARENA_H + 14 };     // bottom
  return { x: -14, y: t * ARENA_H };                              // left
}

// Each wave is bigger than the last and pours in from one or two edges.
// New species join the mix gradually.
export function spawnWave() {
  game.wave++;
  const wave = game.wave;
  const roster = [];
  for (const sp of WAVE_SPECIES) {
    if (wave < sp.from) continue;
    for (let i = 0; i < sp.countForWave(wave); i++) roster.push(sp.type);
  }

  const edges = [Math.floor(rng() * 4)];
  if (wave >= 3) edges.push(Math.floor(rng() * 4));
  roster.forEach((type, i) => {
    const pt = edgePoint(edges[i % edges.length]);
    game.bugs.push(makeBug(type, pt.x, pt.y));
    if (!seenSpecies.has(type)) {
      seenSpecies.add(type);
      const sp = TYPES[type];
      showBanner(`NEW BUG: ${sp.name}`, sp.tip, sp.color);
    }
  });
}

function spawnChild(type, x, y) {
  const c = makeBug(type, x, y);
  newBugs.push(c);
  return c;
}

// Returns true if the bug is gone (dead or split). The caller removes it.
export function damageBug(b, amount, fromKeyboard) {
  const sp = TYPES[b.type];
  if (sp.onHit && sp.onHit(b, spawnChild)) return true;

  b.hp -= amount;
  if (b.hp > 0) {
    b.flash = 0.1;
    b.stun = Math.max(b.stun, 0.15);
    return false;
  }
  game.smashed++;
  dropCommit(b.x, b.y);
  smashFx(b.x, b.y, fromKeyboard, sp.color);
  return true;
}

// Bugs created during a filter pass (merge splits) join the list afterwards
export function flushNewBugs() {
  if (newBugs.length) {
    game.bugs.push(...newBugs);
    newBugs = [];
  }
}

export function updateBugs() {
  const bugs = game.bugs;
  for (const b of bugs) {
    const sp = TYPES[b.type];
    if (b.flash > 0) b.flash -= STEP;
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.angle = Math.atan2(dy, dx);

    // Fresh merge halves fly apart before they start chasing
    if (b.kx) {
      b.x += b.kx * STEP;
      b.y += b.ky * STEP;
      b.kx *= 0.88;
      b.ky *= 0.88;
      if (Math.abs(b.kx) + Math.abs(b.ky) < 5) b.kx = b.ky = 0;
    }

    if (sp.grow) sp.grow(b);

    if (b.stun > 0) {
      b.stun -= STEP;
    } else if (sp.move) {
      sp.move(b, d);
    } else {
      moveToward(b, player.x, player.y, b.speed);
    }

    // Touching CodeMask: deal damage, get knocked back
    if (d < PLAYER_RADIUS + b.r) {
      if (player.hurtTimer <= 0) {
        const dmg = sp.contactDamage ? sp.contactDamage(b) : b.damage;
        player.hp = Math.max(0, player.hp - dmg);
        player.hurtTimer = HIT_COOLDOWN;
        game.hitFlash = 1;
      }
      const knock = sp.knockback ?? 40;
      b.x -= (dx / d) * knock;
      b.y -= (dy / d) * knock;
      b.stun = 0.25;
      if (sp.onContact) sp.onContact(b);
    }
  }

  // Light separation so a swarm doesn't collapse into a single dot
  for (let i = 0; i < bugs.length; i++) {
    for (let j = i + 1; j < bugs.length; j++) {
      const a = bugs[i], c = bugs[j];
      const dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + c.r;
      if (d > 0 && d < min) {
        // Heavier (bigger) bugs get pushed less
        const wa = c.r / min, wc = a.r / min;
        const push = min - d;
        a.x -= (dx / d) * push * wa; a.y -= (dy / d) * push * wa;
        c.x += (dx / d) * push * wc; c.y += (dy / d) * push * wc;
      }
    }
  }
}

export function drawBugs(time) {
  const tick = Math.floor(time * 20);
  for (const b of game.bugs) TYPES[b.type].draw(b, time, tick);
}
