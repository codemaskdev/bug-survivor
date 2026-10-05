import { ctx } from '../../core/canvas.js';
import { rng } from '../../core/rng.js';

// Hotfix: the small, fast bugs the Friday Deploy boss throws out in packs.
// Orange-red, with a white band-aid cross on its back.
export const hotfix = {
  type: 'hotfix',
  color: '#ff6a2e',

  create(b) {
    b.r = 5;
    b.speed = 165 * (0.9 + rng() * 0.2);
    b.hp = 1;
    b.damage = 6;
  },

  draw(b, time) {
    const P = 2;
    const legs = Math.floor(time * 16 + b.id) % 2;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.rotate(b.angle + Math.PI / 2);
    ctx.shadowColor = '#ff6a2e';
    ctx.shadowBlur = 6;
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#ff6a2e';
    ctx.fillRect(-2 * P, -2 * P, 4 * P, 4 * P);                 // body
    ctx.fillRect((legs ? -3 : 2) * P, -P, P, P);                // scuttling legs
    ctx.fillRect((legs ? 2 : -3) * P, P, P, P);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';                                   // band-aid cross
    ctx.fillRect(-P / 2, -1.5 * P, P, 3 * P);
    ctx.fillRect(-1.5 * P, -P / 2, 3 * P, P);
    ctx.restore();
  },
};
