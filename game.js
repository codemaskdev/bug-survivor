// Bug Survivor
// Plain canvas + vanilla JS. Open index.html to play,
// or index.html?autoplay=1&seed=42 for a deterministic demo.

// ---------- Config ----------
const ARENA_W = 960;
const ARENA_H = 640;
const GRID = 40;
const PIXEL = 3;            // size of one sprite pixel on screen
const PLAYER_SPEED = 180;   // px per second
const STEP = 1 / 60;        // fixed simulation step (keeps autoplay deterministic)

const params = new URLSearchParams(location.search);
const AUTOPLAY = params.get('autoplay') === '1';
const SEED = Number(params.get('seed')) || 1;

// ---------- Seeded random (mulberry32) ----------
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(SEED);

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA_W;
canvas.height = ARENA_H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / ARENA_W, window.innerHeight / ARENA_H);
  canvas.style.width = Math.floor(ARENA_W * scale) + 'px';
  canvas.style.height = Math.floor(ARENA_H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// ---------- Input ----------
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function readKeyboard() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  return { x, y };
}

// ---------- CodeMask sprite ----------
// O = neon outline, H = hoodie, h = hoodie fold, F = dark face.
// Eyes are drawn separately so they can look where CodeMask walks.
const SPRITE = [
  '...OOOOOO...',
  '..OHHHHHHO..',
  '.OHHHHHHHHO.',
  '.OHFFFFFFHO.',
  '.OHFFFFFFHO.',
  '.OHFFFFFFHO.',
  '.OHHFFFFHHO.',
  'OHHHHHHHHHHO',
  'OHhHHHHHHhHO',
  'OHhHHHHHHhHO',
  'OHHHHHHHHHHO',
  '.OHHHOOHHHO.',
  '.OOOO..OOOO.',
];
const SPRITE_COLORS = {
  O: '#1b3a4a',
  H: '#0d0e12',
  h: '#1a1c24',
  F: '#050507',
};
const EYE_COLOR = '#00f0ff';
const SPRITE_W = SPRITE[0].length * PIXEL;
const SPRITE_H = SPRITE.length * PIXEL;

// ---------- Player ----------
const player = {
  x: ARENA_W / 2,
  y: ARENA_H / 2,
  lookX: 0,      // -1, 0, 1: where the eyes point
  lookY: 0,
  walkTime: 0,
  moving: false,
};

// ---------- Autoplay brain ----------
// Wanders between random points in the arena, pausing now and then.
const bot = { tx: player.x, ty: player.y, wait: 0 };

function readAutoplay() {
  if (bot.wait > 0) {
    bot.wait -= STEP;
    return { x: 0, y: 0 };
  }
  const dx = bot.tx - player.x;
  const dy = bot.ty - player.y;
  if (Math.hypot(dx, dy) < 6) {
    const margin = 60;
    bot.tx = margin + rng() * (ARENA_W - margin * 2);
    bot.ty = margin + rng() * (ARENA_H - margin * 2);
    bot.wait = rng() < 0.3 ? 0.3 + rng() * 0.6 : 0;
    return { x: 0, y: 0 };
  }
  return { x: dx, y: dy };
}

// ---------- Update ----------
function update() {
  const input = AUTOPLAY ? readAutoplay() : readKeyboard();
  const len = Math.hypot(input.x, input.y);
  player.moving = len > 0;

  if (player.moving) {
    const nx = input.x / len;
    const ny = input.y / len;
    player.x += nx * PLAYER_SPEED * STEP;
    player.y += ny * PLAYER_SPEED * STEP;
    player.lookX = Math.abs(nx) > 0.3 ? Math.sign(nx) : 0;
    player.lookY = Math.abs(ny) > 0.3 ? Math.sign(ny) : 0;
    player.walkTime += STEP;
  } else {
    player.walkTime = 0;
  }

  // Keep CodeMask inside the arena walls
  const halfW = SPRITE_W / 2;
  const halfH = SPRITE_H / 2;
  player.x = Math.max(halfW + 4, Math.min(ARENA_W - halfW - 4, player.x));
  player.y = Math.max(halfH + 4, Math.min(ARENA_H - halfH - 4, player.y));
}

// ---------- Draw ----------
function drawArena(time) {
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Subtle neon grid, gently pulsing
  const pulse = 0.06 + Math.sin(time * 1.5) * 0.015;
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA_W; x += GRID) {
    const major = (x / GRID) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, ARENA_H);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA_H; y += GRID) {
    const major = (y / GRID) % 5 === 0;
    ctx.strokeStyle = `rgba(0, 240, 255, ${major ? pulse * 2 : pulse})`;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(ARENA_W, y + 0.5);
    ctx.stroke();
  }

  // Vignette
  const g = ctx.createRadialGradient(
    ARENA_W / 2, ARENA_H / 2, ARENA_H * 0.3,
    ARENA_W / 2, ARENA_H / 2, ARENA_W * 0.7
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Glowing arena border
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, ARENA_W - 4, ARENA_H - 4);
  ctx.restore();
}

function drawPlayer(time) {
  // Little bounce while walking, slow breathing while idle
  const bob = player.moving
    ? Math.round(Math.abs(Math.sin(player.walkTime * 14)) * -1) * PIXEL
    : (Math.sin(time * 2) > 0.6 ? -1 : 0);
  const left = Math.round(player.x - SPRITE_W / 2);
  const top = Math.round(player.y - SPRITE_H / 2) + bob;

  // Shadow on the floor
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + SPRITE_H / 2 + 2, SPRITE_W / 2.2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  for (let row = 0; row < SPRITE.length; row++) {
    for (let col = 0; col < SPRITE[row].length; col++) {
      const c = SPRITE_COLORS[SPRITE[row][col]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(left + col * PIXEL, top + row * PIXEL, PIXEL, PIXEL);
    }
  }

  // Eyes: two glowing cyan pixels that look where CodeMask walks.
  // A quick blink every few seconds.
  const blinking = (time % 4) < 0.12;
  if (blinking) return;
  const eyeRow = 4 + Math.max(0, player.lookY) - Math.max(0, -player.lookY);
  const eyeCols = [4 + player.lookX, 7 + player.lookX];
  ctx.save();
  ctx.fillStyle = EYE_COLOR;
  ctx.shadowColor = EYE_COLOR;
  ctx.shadowBlur = 10;
  for (const col of eyeCols) {
    ctx.fillRect(left + col * PIXEL, top + eyeRow * PIXEL, PIXEL, PIXEL);
  }
  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '14px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('BUG SURVIVOR', 16, 14);
  if (AUTOPLAY) {
    ctx.textAlign = 'right';
    ctx.fillText(`AUTOPLAY  seed ${SEED}`, ARENA_W - 16, 14);
    ctx.textAlign = 'left';
  }
}

// ---------- Main loop ----------
let simTime = 0;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    update();
    simTime += STEP;
    acc -= STEP;
  }
  drawArena(simTime);
  drawPlayer(simTime);
  drawHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
