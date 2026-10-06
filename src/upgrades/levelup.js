import { STEP } from '../config.js';
import { rng } from '../core/rng.js';
import { game, botPlays, session } from '../core/state.js';
import { input } from '../core/input.js';
import { xpToNext } from '../entities/commits.js';
import { UPGRADES } from './upgrades.js';
import { chooseCard } from '../ai/bot.js';
import { sfxLevelUp, sfxSelect } from '../fx/sound.js';

// A full XP bar pauses the game and shows three upgrade cards,
// drawn from the pool by weight (rare cards have a small weight).

const CARDS_SHOWN = 3;

function drawOffer() {
  const pool = UPGRADES.map((u, i) => i).filter((i) => UPGRADES[i].level < (UPGRADES[i].maxLevel ?? Infinity));
  const offer = [];
  while (offer.length < CARDS_SHOWN && pool.length) {
    const total = pool.reduce((s, i) => s + (UPGRADES[i].weight ?? 1), 0);
    let roll = rng() * total;
    let k = 0;
    while (k < pool.length - 1 && roll >= (UPGRADES[pool[k]].weight ?? 1)) {
      roll -= UPGRADES[pool[k]].weight ?? 1;
      k++;
    }
    offer.push(pool.splice(k, 1)[0]);
  }
  return offer;
}

export function openUpgradeCards() {
  game.state = 'levelup';
  sfxLevelUp();
  game.levelupTime = 0;
  game.cardChoice = 1;
  game.offer = drawOffer();
  game.botPick = botPlays() ? chooseCard(game.offer) : -1;
}

export function pickCard(i) {
  if (game.state !== 'levelup' || game.levelupTime < 0.3) return;
  UPGRADES[game.offer[i]].level++;
  sfxSelect();
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
  if (botPlays()) {
    if (game.levelupTime > 0.5) game.cardChoice = game.botPick;
    // Behind the start screen the cards aren't shown, so don't hold the demo up
    if (game.levelupTime > (session.title ? 0.3 : 1.4)) pickCard(game.botPick);
  }
}
