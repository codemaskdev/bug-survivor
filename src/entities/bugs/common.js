import { STEP } from '../../config.js';
import { game } from '../../core/state.js';

// Helpers shared by every bug species. Species files import this,
// never bugs/index.js, so there are no circular imports.

// Later waves are a bit tougher, so damage upgrades matter
// (but waves 15-20 stay at +1: that's where fighting players were dying)
export function waveBonusHp() {
  const bonus = Math.max(0, Math.floor((game.wave - 1) / 7));
  return game.wave >= 15 && game.wave <= 20 ? Math.min(bonus, 1) : bonus;
}

// Waves 15-20 send 20% fewer of the big swarms
export function waveEase(wave) {
  return wave >= 15 && wave <= 20 ? 0.8 : 1;
}

export function moveToward(b, tx, ty, speed) {
  const dx = tx - b.x, dy = ty - b.y;
  const d = Math.hypot(dx, dy) || 1;
  b.x += (dx / d) * speed * STEP;
  b.y += (dy / d) * speed * STEP;
}
