import { STEP } from '../config.js';
import { rng } from '../core/rng.js';
import { game } from '../core/state.js';
import { UPGRADES } from '../upgrades/upgrades.js';
import { player } from '../entities/player.js';
import { swing, swingReach, startSwing } from '../weapons/keyboard.js';

// ---------- Autoplay brain (open world) ----------
// Fights in rhythm with the keyboard: steps in toward the nearest bug while
// the swing is ready, backs off while it recharges or HP is low, and runs
// when it gets surrounded. It also circles the nearby swarm so it doesn't get boxed in,
// grabs commits when it's calm, and wanders when nothing is around.
const SWARM_RADIUS = 420;    // bugs this close count as "the swarm"
const CROWD_RADIUS = 120;    // this many bugs this close = surrounded
const CROWD_LIMIT = 6;
const COMMIT_RADIUS = 260;

const bot = {
  orbit: 1,          // 1 or -1: which way it circles the swarm
  orbitTimer: 0,     // flips direction now and then so it doesn't spiral off
  wanderAngle: 0,
  wanderTimer: 0,
};

export function resetBot() {
  bot.orbit = 1;
  bot.orbitTimer = 0;
  bot.wanderAngle = 0;
  bot.wanderTimer = 0;
}

// How much a bug should scare the bot, beyond plain distance
function dangerWeight(b) {
  if (b.type === 'loop' && (b.phase === 'dash' || b.phase === 'windup')) return 3;
  if (b.type === 'leak') return 1 + b.r / 20;
  if (b.type === 'merge') return 1.4;
  return 1;
}

export function readAutoplay() {
  const reach = swingReach();
  // Only goes looking for a fight while the keyboard is ready and HP isn't low
  const ready = swing.cooldown <= 0.1 && player.hp > 40;

  let crowd = 0;
  let nearest = null, nearestD = Infinity;
  let sx = 0, sy = 0, sn = 0;
  for (const b of game.bugs) {
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if (d < CROWD_RADIUS) crowd++;
    if (d < nearestD) { nearest = b; nearestD = d; }
    if (d < SWARM_RADIUS) { sx += b.x; sy += b.y; sn++; }
  }
  const surrounded = crowd >= CROWD_LIMIT;

  // Danger: push away from close bugs. The bubble is small while the
  // keyboard is ready (let them come), bigger while it recharges.
  const dangerR = surrounded ? 200 : ready ? 70 : 140;
  let ax = 0, ay = 0;
  for (const b of game.bugs) {
    const dx = player.x - b.x, dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < dangerR + b.r) {
      const w = ((dangerR + b.r - d) / (dangerR + b.r)) ** 2 * dangerWeight(b);
      ax += (dx / d) * w;
      ay += (dy / d) * w;
    }
  }

  let mx = 0, my = 0;
  if (sn > 0) {
    bot.orbitTimer -= STEP;
    if (bot.orbitTimer <= 0) {
      bot.orbit = rng() < 0.5 ? 1 : -1;
      bot.orbitTimer = 4 + rng() * 4;
    }
    // Circle the swarm's center so it can't close in from all sides
    const cx = sx / sn - player.x, cy = sy / sn - player.y;
    const cd = Math.hypot(cx, cy) || 1;
    mx = (-cy / cd) * bot.orbit * 0.7;
    my = (cx / cd) * bot.orbit * 0.7;

    // Step in to put the nearest bug inside the keyboard's reach
    if (ready && !surrounded && nearestD > reach * 0.7) {
      mx += ((nearest.x - player.x) / nearestD) * 1.2;
      my += ((nearest.y - player.y) / nearestD) * 1.2;
    }
  } else {
    // Nothing around: stroll, changing heading every few seconds
    bot.wanderTimer -= STEP;
    if (bot.wanderTimer <= 0) {
      bot.wanderAngle = rng() * Math.PI * 2;
      bot.wanderTimer = 1.5 + rng() * 2;
    }
    mx = Math.cos(bot.wanderAngle) * 0.6;
    my = Math.sin(bot.wanderAngle) * 0.6;
  }

  // Commits: worth a detour when nothing is breathing down its neck
  if (!surrounded && Math.hypot(ax, ay) < 0.4) {
    let best = null, bestD = COMMIT_RADIUS;
    for (const c of game.commits) {
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d < bestD) { best = c; bestD = d; }
    }
    if (best) {
      mx += ((best.x - player.x) / (bestD || 1)) * 0.9;
      my += ((best.y - player.y) / (bestD || 1)) * 0.9;
    }
  }

  return { x: mx + ax * 3, y: my + ay * 3 };
}

// Turn toward the closest bug in reach and swing at it
export function autoplaySwing() {
  let best = null, bestD = swingReach() * 0.9;
  for (const b of game.bugs) {
    const d = Math.hypot(b.x - player.x, b.y - player.y) - b.r;
    if (d < bestD) { best = b; bestD = d; }
  }
  if (!best || swing.cooldown > 0) return;
  player.facing = Math.atan2(best.y - player.y, best.x - player.x);
  startSwing(player.facing);
}

// ---------- Card picks ----------
// Fixed priorities, lowered for upgrades it already has, so it builds
// a strong core first and then spreads out.
const CARD_PRIORITY = {
  revert: 100,   // rare and wipes the screen: always take it
  linter: 70,
  review: 65,
  tests: 60,
  mech: 58,
  duck: 45,
  burnout: 40,   // strong, but costs max HP
  coffee: 35,
};

// Returns the position (0..2) of the card to take
export function chooseCard(offer) {
  let best = 0, bestScore = -Infinity;
  offer.forEach((idx, i) => {
    const u = UPGRADES[idx];
    const score = (CARD_PRIORITY[u.key] ?? 40) - u.level * 12;
    if (score > bestScore) { best = i; bestScore = score; }
  });
  return best;
}
