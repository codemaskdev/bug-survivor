// Cheap deterministic hash, so the glitch effect never touches the game RNG
export function glitchNoise(id, tick) {
  let h = (id * 374761393 + tick * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
