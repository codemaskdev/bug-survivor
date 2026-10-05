import { STEP, WAVE_EVERY } from '../config.js';
import { AUTOPLAY } from './params.js';
import { game, resetState } from './state.js';
import { input, readKeyboard } from './input.js';
import { updateCamera, resetCamera } from './camera.js';
import { player, resetPlayer, movePlayer } from '../entities/player.js';
import { spawnWave, updateSpawns, updateBugs, resetBugs } from '../entities/bugs/index.js';
import { updateCommits } from '../entities/commits.js';
import { startSwing, updateSwing, resetSwing } from '../weapons/keyboard.js';
import { updateLinter, resetLinter } from '../weapons/linter.js';
import { updateTests, resetTests } from '../weapons/unittests.js';
import { updateReview, resetReview } from '../weapons/review.js';
import { updateDuck, resetDuck } from '../weapons/duck.js';
import { updateRevert, resetRevert, fadeRevertFlash } from '../weapons/revert.js';
import { updateBurnout, resetBurnout } from '../weapons/burnout.js';
import { resetUpgrades } from '../upgrades/upgrades.js';
import { updateLevelup } from '../upgrades/levelup.js';
import { readAutoplay, autoplaySwing, autoplayCallPair, resetBot } from '../ai/bot.js';
import { updateFx, resetFx } from '../fx/particles.js';
import { resetShake } from '../fx/shake.js';
import { updateBanners, resetBanners } from '../ui/banner.js';
import { updateDeploy, resetDeploy } from '../boss/deploy.js';
import { RUN_SECONDS } from './clock.js';
import { isEnded } from '../ui/screens.js';
import { sfxEnding } from '../fx/sound.js';
import { updatePair, resetPair, callPair, unlockPair } from '../allies/pair.js';

export function resetGame() {
  resetPlayer();
  resetCamera(player.x, player.y);
  resetSwing();
  resetState();
  resetBugs();
  resetBanners();
  resetFx();
  resetShake();
  resetUpgrades();
  resetLinter();
  resetTests();
  resetReview();
  resetDuck();
  resetRevert();
  resetBurnout();
  resetDeploy();
  resetPair();
  resetBot();
}

// One fixed simulation step
export function update() {
  fadeRevertFlash();
  // Any ending: BUILD FAILED, DEPLOYED TO PRODUCTION or WEEKEND RUINED
  if (isEnded(game.state)) {
    game.overTime += STEP;
    // Autoplay keeps the demo rolling for recording
    if (AUTOPLAY && game.overTime > 3) resetGame();
    else if (!AUTOPLAY && game.overTime > 0.5 && input.restartPressed) resetGame();
    input.restartPressed = false;
    input.swingPressed = false;
    input.callPressed = false;
    updateFx();
    return;
  }
  input.restartPressed = false;

  if (game.state === 'levelup') {
    // Game is paused while the cards are up
    updateLevelup();
    input.callPressed = false;
    return;
  }

  game.roundTime += STEP;
  if (!game.bossPhase && game.roundTime >= game.nextWaveAt) {
    spawnWave();
    game.nextWaveAt += WAVE_EVERY;
  }
  updateSpawns();
  updateDeploy();

  movePlayer(AUTOPLAY ? readAutoplay() : readKeyboard());
  updateCamera(player.x, player.y);

  if (player.hurtTimer > 0) player.hurtTimer -= STEP;
  game.hitFlash = Math.max(0, game.hitFlash - STEP * 4);

  if (AUTOPLAY) autoplaySwing();
  else if (input.swingPressed || input.keys.has('Space') || input.keys.has('KeyJ')) startSwing(player.facing);
  input.swingPressed = false;

  if (AUTOPLAY) autoplayCallPair();
  else if (input.callPressed) callPair();
  input.callPressed = false;

  updateSwing();
  updateLinter();
  updateTests();
  updateReview();
  updateDuck();
  updateRevert();
  updateBurnout();
  updatePair();
  updateBugs();
  updateCommits();
  updateBanners();
  updateFx();

  if (player.hp <= 0) {
    game.state = 'over';
  } else if (game.state === 'playing' && game.roundTime >= RUN_SECONDS) {
    game.state = 'timeout';    // 17:00 and the boss is still up
  }
  if (isEnded(game.state)) {
    game.overTime = 0;
    player.hurtTimer = 0;
    sfxEnding(game.state);
    // Losing to the boss unlocks the Pair Programmer for later runs
    if ((game.state === 'over' && game.bossPhase) || game.state === 'timeout') unlockPair();
  }
}
