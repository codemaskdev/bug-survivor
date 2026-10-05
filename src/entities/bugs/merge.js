import { ctx } from '../../core/canvas.js';
import { glitchNoise } from '../../fx/glitch.js';
import { splitFx } from '../../fx/particles.js';
import { player } from '../player.js';
import { waveBonusHp } from './common.js';

const BLUE = '#3d8bff';
const YELLOW = '#ffe14d';
const DARK = '#0b0d13';

// Merge Conflict (wave 7+): blue/yellow block that splits in two when hit.
// A big one doesn't take damage: any hit splits it into ours + theirs,
// and those small halves don't split again.
export const merge = {
  type: 'merge',
  name: 'MERGE CONFLICT',
  from: 7,
  color: BLUE,
  tip: 'splits in two when hit',
  countForWave: (wave) => 1 + Math.floor((wave - 7) / 6),

  create(b) {
    b.r = 11;
    b.speed = 70;
    b.hp = 1;
    b.damage = 12;
  },

  onHit(b, spawn) {
    const a = Math.atan2(b.y - player.y, b.x - player.x) + Math.PI / 2;
    for (const [type, side] of [['mergeOurs', -1], ['mergeTheirs', 1]]) {
      const c = spawn(type, b.x + Math.cos(a) * 9 * side, b.y + Math.sin(a) * 9 * side);
      c.swingId = b.swingId;   // the swing that split it can't also kill the halves
      c.stun = 0.3;
      c.kx = Math.cos(a) * 160 * side;
      c.ky = Math.sin(a) * 160 * side;
    }
    splitFx(b.x, b.y);
    return true;
  },

  // A blue "ours" half and a yellow "theirs" half that don't line up
  draw(b, time, tick) {
    const flash = b.flash > 0;
    const blue = flash ? '#fff' : BLUE;
    const yellow = flash ? '#fff' : YELLOW;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.shadowColor = BLUE;
    ctx.shadowBlur = 8;

    const h = 22, w = 11;
    // The two halves keep slipping out of alignment, like a bad merge
    const slip = Math.round(Math.sin(time * 6 + b.id) * 1.5 + (glitchNoise(b.id, tick) < 0.15 ? 3 : 0));
    ctx.fillStyle = DARK;
    ctx.fillRect(-w - 1, -h / 2 - 1 - slip, w + 1, h + 2);
    ctx.fillRect(1, -h / 2 - 1 + slip, w + 1, h + 2);
    ctx.fillStyle = blue;
    ctx.fillRect(-w, -h / 2 - slip, w - 1, h);
    ctx.fillStyle = yellow;
    ctx.fillRect(2, -h / 2 + slip, w - 1, h);
    ctx.shadowBlur = 0;
    // "=======" seam
    ctx.fillStyle = '#ffffff';
    for (let y = -h / 2; y < h / 2; y += 4) ctx.fillRect(0, y, 1, 2);
    ctx.fillStyle = DARK;
    drawChevron(-w / 2 - 1, -slip, -1, 2);
    drawChevron(w / 2 + 1, slip, 1, 2);
    ctx.restore();
  },
};

// The two small halves: a blue "<" (ours) and a yellow ">" (theirs)
function makeHalf(type, ours) {
  return {
    type,
    color: BLUE,

    create(b) {
      b.r = 6;
      b.speed = 115;
      b.hp = 1 + waveBonusHp();
      b.damage = 8;
    },

    draw(b) {
      const flash = b.flash > 0;
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.shadowColor = BLUE;
      ctx.shadowBlur = 8;
      ctx.fillStyle = DARK;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = flash ? '#fff' : (ours ? BLUE : YELLOW);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = DARK;
      drawChevron(0, 0, ours ? -1 : 1, 2);
      ctx.restore();
    },
  };
}
export const mergeOurs = makeHalf('mergeOurs', true);
export const mergeTheirs = makeHalf('mergeTheirs', false);

// Draws a pixel chevron: dir -1 = "<", 1 = ">"
function drawChevron(cx, cy, dir, P) {
  for (let i = -2; i <= 2; i++) {
    const x = cx + dir * (2 - Math.abs(i)) * P - P / 2;
    ctx.fillRect(Math.round(x), Math.round(cy + i * P - P / 2), P, P);
  }
}
