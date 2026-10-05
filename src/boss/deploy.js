import { VIEW_W, VIEW_H, STEP } from '../config.js';
import { ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { camera } from '../core/camera.js';
import { playSiren } from '../fx/sound.js';
import { shake } from '../fx/shake.js';
import { smashFx, addPopup } from '../fx/particles.js';
import { makeBug, clearSpawnQueue } from '../entities/bugs/index.js';
import { updateAttacks, drawAttacks, resetAttacks } from './attacks.js';

// The Friday Deploy: at 16:59 (two minutes in) the waves stop, the screen
// flashes red, a siren wails, a warning goes up and the boss walks in.
export const BOSS_AT = 120;          // seconds into the run = FRI 16:59
const WARNING_TIME = 3;              // how long the warning stays up
const ENTER_AT = 1.2;                // boss appears this far into the warning

const deploy = {
  phase: 'waiting',  // waiting -> warning -> fight
  t: 0,              // seconds in the current phase
  entered: false,    // the boss has been spawned
  lastX: 0,          // where the boss was last seen (for its death burst)
  lastY: 0,
};

export function resetDeploy() {
  deploy.phase = 'waiting';
  deploy.t = 0;
  deploy.entered = false;
  resetAttacks();
}

export function findBoss() {
  return game.bugs.find((b) => b.boss) || null;
}

export function updateDeploy() {
  deploy.t += STEP;
  if (deploy.phase === 'waiting') {
    if (game.roundTime >= BOSS_AT) {
      deploy.phase = 'warning';
      deploy.t = 0;
      game.bossPhase = true;   // no more regular waves
      clearSpawnQueue();
      shake.amount = Math.min(10, shake.amount + 6);
      playSiren();
    }
  } else if (deploy.phase === 'warning') {
    if (deploy.t >= ENTER_AT && !deploy.entered) {
      // Walks in from just above the top of the screen
      game.bugs.push(makeBug('friday', camera.x, camera.y - VIEW_H / 2 - 70));
      deploy.entered = true;
    }
    if (deploy.t >= WARNING_TIME) {
      deploy.phase = 'fight';
      deploy.t = 0;
    }
  }
  if (!deploy.entered) return;
  const boss = findBoss();
  if (boss) {
    deploy.lastX = boss.x;
    deploy.lastY = boss.y;
  }
  updateAttacks(boss);
  if (!boss && game.state === 'playing') {
    // Boss down: it goes out in a burst of green, then the good ending
    for (let i = 0; i < 12; i++) {
      smashFx(deploy.lastX + Math.cos(i) * 30, deploy.lastY + Math.sin(i * 1.7) * 30, false, i % 2 ? '#39ff88' : '#ff2e3e');
    }
    addPopup({ x: deploy.lastX, y: deploy.lastY - 40, text: 'MERGED ✓', size: 28, life: 0.7, tilt: 0, color: '#39ff88' }, 80);
    shake.amount = 10;
    game.state = 'won';
  }
}

// Boss attacks in world coordinates (500 blocks, rollback ring)
export function drawDeployWorld() {
  if (deploy.entered) drawAttacks(findBoss());
}

// Red alarm flash + "⚠ DEPLOYING ON FRIDAY" (screen coordinates)
export function drawDeployWarning() {
  // Its timer only runs while playing, so don't leave it frozen under the cards
  if (deploy.phase !== 'warning' || game.state !== 'playing') return;
  const t = deploy.t;
  const pulse = (Math.sin(t * Math.PI * 4) + 1) / 2;   // two pulses a second
  const fade = Math.min(1, (WARNING_TIME - t) / 0.4);
  ctx.save();
  ctx.fillStyle = `rgba(255, 20, 50, ${(0.12 + 0.22 * pulse) * fade})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.75)';
  ctx.fillRect(0, VIEW_H / 2 - 50, VIEW_W, 100);
  ctx.fillStyle = '#ff2e3e';
  ctx.fillRect(0, VIEW_H / 2 - 50, VIEW_W, 3);
  ctx.fillRect(0, VIEW_H / 2 + 47, VIEW_W, 3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px monospace';
  ctx.shadowColor = '#ff2e3e';
  ctx.shadowBlur = 24;
  ctx.fillStyle = pulse > 0.5 ? '#ff2e3e' : '#ffd23f';
  ctx.fillText('⚠ DEPLOYING ON FRIDAY', VIEW_W / 2, VIEW_H / 2 - 6);
  ctx.shadowBlur = 0;
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
  ctx.fillText('git push --force origin main', VIEW_W / 2, VIEW_H / 2 + 30);
  ctx.restore();
}

// The boss's health bar, under the clock
export function drawBossBar() {
  const b = findBoss();
  if (!b) return;
  const w = 360, h = 10, x = (VIEW_W - w) / 2, y = 44;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 46, 62, 0.15)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff2e3e';
  ctx.shadowColor = '#ff2e3e';
  ctx.shadowBlur = 10;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, b.hp) / b.maxHp), h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 46, 62, 0.7)';
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ff2e3e';
  ctx.fillText('FRIDAY DEPLOY', VIEW_W / 2, y + h + 4);
  ctx.restore();
}
