import { VIEW_W, VIEW_H } from '../config.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
