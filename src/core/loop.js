import { VIEW_W, VIEW_H, STEP } from '../config.js';
import { ctx } from './canvas.js';
import { game } from './state.js';
import { update } from './game.js';
import { drawGrid, drawVignette } from '../world/grid.js';
import { camera } from './camera.js';
import { drawCommits } from '../entities/commits.js';
import { drawPlayer } from '../entities/player.js';
import { drawBugs } from '../entities/bugs/index.js';
import { drawSwing } from '../weapons/keyboard.js';
import { drawLints } from '../weapons/linter.js';
import { drawTests } from '../weapons/unittests.js';
import { drawReview } from '../weapons/review.js';
import { drawDuck } from '../weapons/duck.js';
import { drawRevert } from '../weapons/revert.js';
import { drawBurnout } from '../weapons/burnout.js';
import { drawDeployWarning, drawBossBar } from '../boss/deploy.js';
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
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // World layers are drawn in world coordinates, shifted so the camera
  // sits at the screen center. The world shakes, the HUD doesn't.
  const ox = Math.round(VIEW_W / 2 - camera.x + shake.x);
  const oy = Math.round(VIEW_H / 2 - camera.y + shake.y);
  ctx.save();
  ctx.translate(ox, oy);
  drawGrid(simTime);
  ctx.restore();
  drawVignette();

  ctx.save();
  ctx.translate(ox, oy);
  drawReview();
  drawCommits(simTime);
  drawBurnout(simTime);
  drawPlayer(simTime);
  drawBugs(simTime);
  drawSwing();
  drawLints();
  drawTests();
  drawDuck();
  drawFx();
  ctx.restore();

  // Screen-fixed layers
  drawRevert();
  drawDeployWarning();

  drawHud();
  drawBossBar();
  drawBanner();
  if (game.state === 'levelup') drawUpgradeCards();
  if (game.state === 'over') drawGameOver();
  requestAnimationFrame(frame);
}

export function start() {
  requestAnimationFrame(frame);
}
