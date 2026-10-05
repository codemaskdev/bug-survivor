import { VIEW_W, VIEW_H } from '../config.js';

// The camera looks at a point in the endless world. It eases toward
// CodeMask every step, so CodeMask stays near the center of the screen.
export const camera = { x: 0, y: 0 };

const FOLLOW = 0.15;   // fraction of the gap closed per step

export function resetCamera(x, y) {
  camera.x = x;
  camera.y = y;
}

export function updateCamera(tx, ty) {
  camera.x += (tx - camera.x) * FOLLOW;
  camera.y += (ty - camera.y) * FOLLOW;
}

// Visible world rectangle, optionally grown by `margin` on every side
export function viewRect(margin = 0) {
  return {
    left: camera.x - VIEW_W / 2 - margin,
    top: camera.y - VIEW_H / 2 - margin,
    right: camera.x + VIEW_W / 2 + margin,
    bottom: camera.y + VIEW_H / 2 + margin,
  };
}

export function isOnScreen(x, y, margin = 0) {
  const v = viewRect(margin);
  return x >= v.left && x <= v.right && y >= v.top && y <= v.bottom;
}

// A uniformly random point on the edge of the view grown by `margin`,
// i.e. just outside the screen, on any side. `rand` returns 0..1.
export function pointAroundView(margin, rand) {
  const v = viewRect(margin);
  const w = v.right - v.left, h = v.bottom - v.top;
  let t = rand() * 2 * (w + h);
  if (t < w) return { x: v.left + t, y: v.top };            // top
  t -= w;
  if (t < h) return { x: v.right, y: v.top + t };           // right
  t -= h;
  if (t < w) return { x: v.right - t, y: v.bottom };        // bottom
  t -= w;
  return { x: v.left, y: v.bottom - t };                    // left
}
