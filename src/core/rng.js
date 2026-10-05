import { SEED } from './params.js';

// Seeded random (mulberry32). Never use Math.random(): autoplay must replay exactly.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = makeRng(SEED);
// Separate stream for visual effects, so juice never changes gameplay
export const fxRng = makeRng(SEED ^ 0x9E3779B9);
