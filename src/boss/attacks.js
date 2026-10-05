import { STEP, HIT_COOLDOWN } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { addPopup } from '../fx/particles.js';
import { shake } from '../fx/shake.js';
import { player } from '../entities/player.js';
import { makeBug } from '../entities/bugs/index.js';
import { sfxRollback } from '../fx/sound.js';

// The Friday Deploy's moves, on a fixed rotation:
//   Hotfix   - a pack of small fast bugs bursts out of the boss
//   500      - after a short shake, three red "500" blocks fly at CodeMask
//   Rollback - once, at low HP: invulnerable for a moment, heals back health
const PATTERN = ['hotfix', '500', '500', 'hotfix', '500'];
const FIRST_ATTACK = 2;      // seconds after the boss arrives
const ATTACK_EVERY = 3.2;
const HOTFIX_PACK = 6;
const WINDUP = 0.6;          // the boss shakes this long before throwing 500s
const BLOCK_SPEED = 200;
const BLOCK_SPREAD = 0.45;   // radians between the three blocks: gaps you can slip through
const BLOCK_DAMAGE = 12;
const BLOCK_LIFE = 4;
const BLOCK_W = 34, BLOCK_H = 18;
const ROLLBACK_AT = 0.25;    // fraction of max HP that triggers it
const ROLLBACK_HEAL = 0.4;   // fraction of max HP it heals back
const ROLLBACK_TIME = 2;

const attacks = {
  timer: FIRST_ATTACK,
  step: 0,           // position in PATTERN
  windup: 0,         // > 0 while winding up a 500 throw
  blocks: [],        // { x, y, vx, vy, age, spin }
  rolledBack: false,
  rollback: 0,       // > 0 while the rollback is happening
};

export function resetAttacks() {
  attacks.timer = FIRST_ATTACK;
  attacks.step = 0;
  attacks.windup = 0;
  attacks.blocks = [];
  attacks.rolledBack = false;
  attacks.rollback = 0;
}

// For the autoplay bot, which has to dodge them
export function bossBlocks() {
  return attacks.blocks;
}

function hotfix(boss) {
  for (let i = 0; i < HOTFIX_PACK; i++) {
    const a = (i / HOTFIX_PACK) * Math.PI * 2;
    const b = makeBug('hotfix', boss.x + Math.cos(a) * (boss.r + 8), boss.y + Math.sin(a) * (boss.r + 8));
    b.kx = Math.cos(a) * 200;   // burst outward before chasing
    b.ky = Math.sin(a) * 200;
    game.bugs.push(b);
  }
  addPopup({ x: boss.x, y: boss.y - boss.r - 20, text: 'HOTFIX!', size: 20, life: 0.7, tilt: 0, color: '#ff6a2e' }, 50);
}

function throw500(boss) {
  const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
  for (const off of [-BLOCK_SPREAD, 0, BLOCK_SPREAD]) {
    const a = aim + off;
    attacks.blocks.push({
      x: boss.x + Math.cos(a) * boss.r,
      y: boss.y + Math.sin(a) * boss.r,
      vx: Math.cos(a) * BLOCK_SPEED,
      vy: Math.sin(a) * BLOCK_SPEED,
      age: 0,
      spin: off * 3,
    });
  }
  shake.amount = Math.min(8, shake.amount + 3);
}

export function updateAttacks(boss) {
  // 500 blocks keep flying even if the boss is gone
  for (const k of attacks.blocks) {
    k.age += STEP;
    k.x += k.vx * STEP;
    k.y += k.vy * STEP;
    // Hits only when the block visibly touches CodeMask
    const hit = Math.abs(player.x - k.x) < BLOCK_W / 2 + 4 && Math.abs(player.y - k.y) < BLOCK_H / 2 + 4;
    if (hit && player.hurtTimer <= 0) {
      player.hp = Math.max(0, player.hp - BLOCK_DAMAGE);
      player.hurtTimer = HIT_COOLDOWN;
      game.hitFlash = 1;
      k.age = BLOCK_LIFE;   // the block shatters on CodeMask
    }
  }
  attacks.blocks = attacks.blocks.filter((k) => k.age < BLOCK_LIFE);
  if (!boss) return;

  // Rollback: once, when it's low
  if (!attacks.rolledBack && boss.hp <= boss.maxHp * ROLLBACK_AT) {
    attacks.rolledBack = true;
    attacks.rollback = ROLLBACK_TIME;
    sfxRollback();
    addPopup({ x: boss.x, y: boss.y - boss.r - 24, text: 'ROLLBACK', size: 26, life: 0.7, tilt: 0, color: '#7aa2ff' }, 80);
  }
  if (attacks.rollback > 0) {
    attacks.rollback -= STEP;
    boss.invulnerable = attacks.rollback;
    boss.hp = Math.min(boss.maxHp, boss.hp + (boss.maxHp * ROLLBACK_HEAL / ROLLBACK_TIME) * STEP);
    boss.rage = 0.1;
    return;   // no attacks while rolling back
  }

  if (attacks.windup > 0) {
    attacks.windup -= STEP;
    boss.rage = 0.1;
    if (attacks.windup <= 0) throw500(boss);
    return;
  }

  attacks.timer -= STEP;
  if (attacks.timer > 0) return;
  attacks.timer = ATTACK_EVERY;
  const move = PATTERN[attacks.step % PATTERN.length];
  attacks.step++;
  if (move === 'hotfix') hotfix(boss);
  else attacks.windup = WINDUP;
}

// Red "500" blocks with a glow (world coordinates)
export function drawAttacks(boss) {
  for (const k of attacks.blocks) {
    ctx.save();
    ctx.translate(Math.round(k.x), Math.round(k.y));
    ctx.rotate(Math.sin(k.age * 6) * 0.15 + k.spin);
    ctx.shadowColor = '#ff2e3e';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff2e3e';
    ctx.fillRect(-BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0d13';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('500', 0, 1);
    ctx.restore();
  }

  // Rollback: a cyan "rewind" ring closing in on the boss
  if (boss && attacks.rollback > 0) {
    const t = attacks.rollback / ROLLBACK_TIME;
    ctx.save();
    ctx.strokeStyle = '#7aa2ff';
    ctx.shadowColor = '#7aa2ff';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 10 + 60 * (t % 0.5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
