import { STEP } from '../config.js';
import { fxRng } from '../core/rng.js';

// Screen shake: `amount` decays to 0, x/y is this step's offset
export const shake = { amount: 0, x: 0, y: 0 };

export function updateShake() {
  if (shake.amount > 0) {
    shake.x = (fxRng() - 0.5) * shake.amount * 2;
    shake.y = (fxRng() - 0.5) * shake.amount * 2;
    shake.amount = Math.max(0, shake.amount - STEP * 40);
  } else {
    shake.x = shake.y = 0;
  }
}

export function resetShake() {
  shake.amount = 0;
}
