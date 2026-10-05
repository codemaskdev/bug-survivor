import { ARENA_W, ARENA_H, STEP } from '../config.js';
import { ctx } from './canvas.js';
import { game } from './state.js';
import { update } from './game.js';
import { drawArena } from '../world/arena.js';
import { drawCommits } from '../entities/commits.js';
import { drawPlayer } from '../entities/player.js';
import { drawBugs } from '../entities/bugs/index.js';
import { drawSwing } from '../weapons/keyboard.js';
import { drawLints } from '../weapons/linter.js';
import { drawTests } from '../weapons/unittests.js';
import { drawReview } from '../weapons/review.js';
import { drawFx } from '../fx/particles.js';
import { shake } from '../fx/shake.js';
import { drawHud } from '../ui/hud.js';
import { drawBanner } from '../ui/banner.js';
import { drawUpgradeCards } from '../ui/cards.js';
import { drawGameOver } from '../ui/screens.js';

// Fixed-step simulation, drawn once per animation frame
let simTime = 0;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    update();
    simTime += STEP;
    acc -= STEP;
  }
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // The world shakes, the HUD doesn't
  ctx.save();
  ctx.translate(Math.round(shake.x), Math.round(shake.y));
  drawArena(simTime);
  drawReview();
  drawCommits(simTime);
  drawPlayer(simTime);
  drawBugs(simTime);
  drawSwing();
  drawLints();
  drawTests();
  drawFx();
  ctx.restore();

  drawHud();
  drawBanner();
  if (game.state === 'levelup') drawUpgradeCards();
  if (game.state === 'over') drawGameOver();
  requestAnimationFrame(frame);
}

export function start() {
  requestAnimationFrame(frame);
}
