// Bug Survivor
// Plain canvas + vanilla JS ES modules, no build step.
// Serve the folder (npx serve) and open index.html to play,
// or index.html?autoplay=1&seed=42 for a deterministic demo.
//
//   core/      loop, fixed-step update, camera, input, rng, shared state
//   entities/  player, commits, bugs/ (one file per species)
//   weapons/   keyboard swing and the upgrade weapons (linter, tests, review, duck, revert, burnout)
//   upgrades/  upgrade list and the level-up flow
//   ai/        the autoplay bot
//   fx/        particles, pop-ups, screen shake, glitch noise
//   ui/        start screen, pause menu, touch-device notice, hud, upgrade cards, banners, game over
//   world/     the endless neon grid
//   boss/      the Friday Deploy: entrance at 16:59 and the boss's attacks
//   allies/    the Pair Programmer, backup you can call in the boss fight

import { AUTOPLAY } from './core/params.js';
import { needsKeyboardNotice, showKeyboardNotice } from './ui/touch.js';

// Touch-only devices get a "needs a keyboard" page instead of the game
// (the autoplay demo is fine to watch anywhere)
if (!AUTOPLAY && needsKeyboardNotice()) {
  showKeyboardNotice();
} else {
  await import('./core/input.js');
  await import('./ui/cards.js');
  const { start } = await import('./core/loop.js');
  start();
}
