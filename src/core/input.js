import { AUTOPLAY } from './params.js';
import { game } from './state.js';
import { handleCardKey } from '../upgrades/levelup.js';
import { unlockAudio } from '../fx/sound.js';

export const input = {
  keys: new Set(),
  restartPressed: false,  // latched, so a quick tap between frames isn't lost
  swingPressed: false,    // same trick for the keyboard swing
};

window.addEventListener('keydown', (e) => {
  unlockAudio();
  input.keys.add(e.code);
  if (e.code === 'KeyR' || e.code === 'Enter') input.restartPressed = true;
  if (e.code === 'Space' || e.code === 'KeyJ') input.swingPressed = true;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (game.state === 'levelup' && !AUTOPLAY) handleCardKey(e.code);
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
window.addEventListener('blur', () => input.keys.clear());

export function readKeyboard() {
  const keys = input.keys;
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  return { x, y };
}
