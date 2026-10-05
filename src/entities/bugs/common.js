import { STEP } from '../../config.js';
import { game } from '../../core/state.js';

// Helpers shared by every bug species. Species files import this,
// never bugs/index.js, so there are no circular imports.

// Later waves are a bit tougher, so damage upgrades matter
export function waveBonusHp() {
  return Math.max(0, Math.floor((game.wave - 1) / 4));
}

export function moveToward(b, tx, ty, speed) {
  const dx = tx - b.x, dy = ty - b.y;
  const d = Math.hypot(dx, dy) || 1;
  b.x += (dx / d) * speed * STEP;
  b.y += (dy / d) * speed * STEP;
}
