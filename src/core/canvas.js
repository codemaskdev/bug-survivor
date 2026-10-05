import { ARENA_W, ARENA_H } from '../config.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
canvas.width = ARENA_W;
canvas.height = ARENA_H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / ARENA_W, window.innerHeight / ARENA_H);
  canvas.style.width = Math.floor(ARENA_W * scale) + 'px';
  canvas.style.height = Math.floor(ARENA_H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
