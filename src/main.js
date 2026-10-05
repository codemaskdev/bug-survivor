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
//   ui/        hud, upgrade cards, banners, game over
//   world/     the endless neon grid
//   boss/      the Friday Deploy: entrance at 16:59 and the boss's attacks
//   allies/    the Pair Programmer, backup you can call in the boss fight

import './core/input.js';
import './ui/cards.js';
import { start } from './core/loop.js';

start();
