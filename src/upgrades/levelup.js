import { STEP } from '../config.js';
import { AUTOPLAY } from '../core/params.js';
import { rng } from '../core/rng.js';
import { game } from '../core/state.js';
import { input } from '../core/input.js';
import { xpToNext } from '../entities/commits.js';
import { UPGRADES } from './upgrades.js';

// A full XP bar pauses the game and shows the three upgrade cards.

export function openUpgradeCards() {
  game.state = 'levelup';
  game.levelupTime = 0;
  game.cardChoice = 1;
  game.botPick = AUTOPLAY ? Math.floor(rng() * UPGRADES.length) : -1;
}

export function pickCard(i) {
  if (game.state !== 'levelup' || game.levelupTime < 0.3) return;
  UPGRADES[i].level++;
  game.state = 'playing';
  input.swingPressed = false;
  // Leftover XP might already fill the next bar
  if (game.xp >= xpToNext()) {
    game.xp -= xpToNext();
    game.level++;
    openUpgradeCards();
  }
}

export function handleCardKey(code) {
  if (code === 'Digit1' || code === 'Numpad1') pickCard(0);
  else if (code === 'Digit2' || code === 'Numpad2') pickCard(1);
  else if (code === 'Digit3' || code === 'Numpad3') pickCard(2);
  else if (code === 'ArrowLeft' || code === 'KeyA') game.cardChoice = Math.max(0, game.cardChoice - 1);
  else if (code === 'ArrowRight' || code === 'KeyD') game.cardChoice = Math.min(2, game.cardChoice + 1);
  else if (code === 'Enter' || code === 'KeyE') pickCard(game.cardChoice);
}

// While the cards are up, the game is paused; the autoplay bot
// highlights its pick, then takes it after a beat.
export function updateLevelup() {
  game.levelupTime += STEP;
  if (AUTOPLAY) {
    if (game.levelupTime > 0.5) game.cardChoice = game.botPick;
    if (game.levelupTime > 1.4) pickCard(game.botPick);
  }
}
