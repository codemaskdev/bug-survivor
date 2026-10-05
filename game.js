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

const PLAYER_MAX_HP = 100;
const PLAYER_RADIUS = 14;   // hitbox
const HIT_COOLDOWN = 0.7;   // seconds of invulnerability after a hit

const BUG_PIXEL = 2;
const BUG_SPEED = 125;      // fast, but CodeMask can still outrun them
const BUG_RADIUS = 6;
const BUG_DAMAGE = 10;
const FIRST_WAVE_AT = 1.5;  // seconds
const WAVE_EVERY = 6;       // seconds between waves

const SWING_TIME = 0.16;     // how long the keyboard arc lasts
const SWING_COOLDOWN = 0.45; // from the start of one swing to the next
const SWING_REACH = 64;      // px from CodeMask's center
const SWING_ARC = Math.PI * 0.75; // 135° in front of CodeMask

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
// Separate stream for visual effects, so juice never changes gameplay
const fxRng = makeRng(SEED ^ 0x9E3779B9);

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
let restartPressed = false;  // latched, so a quick tap between frames isn't lost
let swingPressed = false;    // same trick for the keyboard swing
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyR' || e.code === 'Enter') restartPressed = true;
  if (e.code === 'Space' || e.code === 'KeyJ') swingPressed = true;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
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
  hp: PLAYER_MAX_HP,
  hurtTimer: 0,  // > 0 while invulnerable after a hit
  facing: 0,     // radians, direction of the last movement (0 = right)
};

// ---------- Keyboard swing ----------
const swing = {
  timer: 0,      // > 0 while the arc is in the air
  cooldown: 0,   // > 0 until the next swing is allowed
  angle: 0,      // center of the arc
};

// ---------- Game state ----------
let state = 'playing';      // 'playing' | 'over'
let bugs = [];
let wave = 0;
let nextWaveAt = FIRST_WAVE_AT;
let roundTime = 0;          // seconds since this run started
let overTime = 0;           // seconds since BUILD FAILED appeared
let nextBugId = 0;
let hitFlash = 0;           // red screen flash after taking damage
let smashed = 0;            // bugs smashed this run
let particles = [];         // flying keycaps and bug bits
let popups = [];            // "CLACK!" texts
let shake = 0;              // screen shake strength, decays to 0
let shakeX = 0, shakeY = 0;

function resetGame() {
  player.x = ARENA_W / 2;
  player.y = ARENA_H / 2;
  player.lookX = 0;
  player.lookY = 0;
  player.hp = PLAYER_MAX_HP;
  player.hurtTimer = 0;
  player.facing = 0;
  swing.timer = 0;
  swing.cooldown = 0;
  smashed = 0;
  particles = [];
  popups = [];
  shake = 0;
  bugs = [];
  wave = 0;
  nextWaveAt = FIRST_WAVE_AT;
  roundTime = 0;
  overTime = 0;
  hitFlash = 0;
  bot.tx = player.x;
  bot.ty = player.y;
  bot.wait = 0;
  state = 'playing';
}

// ---------- Null Pointer bugs ----------
// Each wave is bigger than the last and pours in from one or two edges.
function spawnWave() {
  wave++;
  const count = 4 + wave * 2;
  const edges = [Math.floor(rng() * 4)];
  if (wave >= 3) edges.push(Math.floor(rng() * 4));
  for (let i = 0; i < count; i++) {
    const edge = edges[i % edges.length];
    const t = rng();
    let x, y;
    if (edge === 0) { x = t * ARENA_W; y = -10; }               // top
    else if (edge === 1) { x = ARENA_W + 10; y = t * ARENA_H; } // right
    else if (edge === 2) { x = t * ARENA_W; y = ARENA_H + 10; } // bottom
    else { x = -10; y = t * ARENA_H; }                          // left
    bugs.push({
      id: nextBugId++,
      x, y,
      angle: 0,
      speed: BUG_SPEED * (0.85 + rng() * 0.3),
      stun: 0,
    });
  }
}

function updateBugs() {
  for (const b of bugs) {
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.angle = Math.atan2(dy, dx);
    if (b.stun > 0) {
      b.stun -= STEP;
    } else {
      b.x += (dx / d) * b.speed * STEP;
      b.y += (dy / d) * b.speed * STEP;
    }

    // Touching CodeMask: deal damage, get knocked back
    if (d < PLAYER_RADIUS + BUG_RADIUS) {
      if (player.hurtTimer <= 0) {
        player.hp = Math.max(0, player.hp - BUG_DAMAGE);
        player.hurtTimer = HIT_COOLDOWN;
        hitFlash = 1;
      }
      b.x -= (dx / d) * 40;
      b.y -= (dy / d) * 40;
      b.stun = 0.25;
    }
  }

  // Light separation so a swarm doesn't collapse into a single dot
  for (let i = 0; i < bugs.length; i++) {
    for (let j = i + 1; j < bugs.length; j++) {
      const a = bugs[i], c = bugs[j];
      const dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = BUG_RADIUS * 2;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        c.x += (dx / d) * push; c.y += (dy / d) * push;
      }
    }
  }
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function startSwing(angle) {
  if (swing.cooldown > 0) return;
  swing.angle = angle;
  swing.timer = SWING_TIME;
  swing.cooldown = SWING_COOLDOWN;
}

// Any bug inside the arc while the keyboard is in the air gets smashed
function updateSwing() {
  if (swing.cooldown > 0) swing.cooldown -= STEP;
  if (swing.timer <= 0) return;
  swing.timer -= STEP;

  const hits = [];
  bugs = bugs.filter((b) => {
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const inReach = Math.hypot(dx, dy) < SWING_REACH + BUG_RADIUS;
    const inArc = Math.abs(angleDiff(Math.atan2(dy, dx), swing.angle)) < SWING_ARC / 2;
    if (inReach && inArc) {
      hits.push(b);
      return false;
    }
    return true;
  });
  if (hits.length === 0) return;

  smashed += hits.length;
  shake = Math.min(6, shake + 2 + hits.length);
  for (const b of hits) smashFx(b.x, b.y);
  const cx = hits.reduce((s, b) => s + b.x, 0) / hits.length;
  const cy = hits.reduce((s, b) => s + b.y, 0) / hits.length;
  popups.push({
    x: cx,
    y: cy - 10,
    text: hits.length > 1 ? `CLACK! x${hits.length}` : 'CLACK!',
    life: 0.7,
    tilt: (fxRng() - 0.5) * 0.4,
  });
}

const KEYCAP_LETTERS = 'QWERTYASDFGHZXCV{};/<>';

function smashFx(x, y) {
  // Keycaps pop off and tumble away
  const caps = 2 + Math.floor(fxRng() * 2);
  for (let i = 0; i < caps; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 90 + fxRng() * 120;
    particles.push({
      kind: 'cap',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 80,
      rot: fxRng() * Math.PI,
      spin: (fxRng() - 0.5) * 16,
      letter: KEYCAP_LETTERS[Math.floor(fxRng() * KEYCAP_LETTERS.length)],
      life: 0.6 + fxRng() * 0.3,
    });
  }
  // Plus a few red bug bits
  for (let i = 0; i < 5; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 60 + fxRng() * 140;
    particles.push({
      kind: 'bit',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: 0, spin: 0, letter: '',
      life: 0.25 + fxRng() * 0.25,
    });
  }
}

function updateFx() {
  for (const p of particles) {
    p.life -= STEP;
    p.x += p.vx * STEP;
    p.y += p.vy * STEP;
    p.vx *= 0.94;
    p.vy = p.vy * 0.94 + (p.kind === 'cap' ? 500 * STEP : 0);
    p.rot += p.spin * STEP;
  }
  particles = particles.filter((p) => p.life > 0);

  for (const p of popups) {
    p.life -= STEP;
    p.y -= 40 * STEP;
  }
  popups = popups.filter((p) => p.life > 0);

  if (shake > 0) {
    shakeX = (fxRng() - 0.5) * shake * 2;
    shakeY = (fxRng() - 0.5) * shake * 2;
    shake = Math.max(0, shake - STEP * 40);
  } else {
    shakeX = shakeY = 0;
  }
}

// ---------- Autoplay brain ----------
// Wanders between random points in the arena, pausing now and then,
// and steers away from any bug that gets too close.
const bot = { tx: player.x, ty: player.y, wait: 0 };
const BOT_FEAR_RADIUS = 110;

function readAutoplay() {
  let fx = 0, fy = 0;
  for (const b of bugs) {
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < BOT_FEAR_RADIUS) {
      const w = (BOT_FEAR_RADIUS - d) / BOT_FEAR_RADIUS;
      fx += (dx / d) * w;
      fy += (dy / d) * w;
    }
  }
  // Walls push back too, so fleeing doesn't end in a corner
  const m = 80;
  if (player.x < m) fx += (m - player.x) / m;
  if (player.x > ARENA_W - m) fx -= (player.x - (ARENA_W - m)) / m;
  if (player.y < m) fy += (m - player.y) / m;
  if (player.y > ARENA_H - m) fy -= (player.y - (ARENA_H - m)) / m;
  const scared = Math.hypot(fx, fy) > 0.05;

  if (!scared && bot.wait > 0) {
    bot.wait -= STEP;
    return { x: 0, y: 0 };
  }
  let dx = bot.tx - player.x;
  let dy = bot.ty - player.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 6) {
    const margin = 60;
    bot.tx = margin + rng() * (ARENA_W - margin * 2);
    bot.ty = margin + rng() * (ARENA_H - margin * 2);
    bot.wait = rng() < 0.3 ? 0.3 + rng() * 0.6 : 0;
    return { x: 0, y: 0 };
  }
  dx /= dist;
  dy /= dist;
  return { x: dx * 0.6 + fx * 3, y: dy * 0.6 + fy * 3 };
}

// Turn toward the closest bug in reach and swing at it
function autoplaySwing() {
  let best = null, bestD = SWING_REACH * 0.9;
  for (const b of bugs) {
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if (d < bestD) { best = b; bestD = d; }
  }
  if (!best || swing.cooldown > 0) return;
  player.facing = Math.atan2(best.y - player.y, best.x - player.x);
  startSwing(player.facing);
}

// ---------- Update ----------
function update() {
  if (state === 'over') {
    overTime += STEP;
    // Autoplay keeps the demo rolling for recording
    if (AUTOPLAY && overTime > 3) resetGame();
    else if (!AUTOPLAY && overTime > 0.5 && restartPressed) resetGame();
    restartPressed = false;
    swingPressed = false;
    updateFx();
    return;
  }
  restartPressed = false;

  roundTime += STEP;
  if (roundTime >= nextWaveAt) {
    spawnWave();
    nextWaveAt += WAVE_EVERY;
  }

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
    player.facing = Math.atan2(ny, nx);
    player.walkTime += STEP;
  } else {
    player.walkTime = 0;
  }

  // Keep CodeMask inside the arena walls
  const halfW = SPRITE_W / 2;
  const halfH = SPRITE_H / 2;
  player.x = Math.max(halfW + 4, Math.min(ARENA_W - halfW - 4, player.x));
  player.y = Math.max(halfH + 4, Math.min(ARENA_H - halfH - 4, player.y));

  if (player.hurtTimer > 0) player.hurtTimer -= STEP;
  hitFlash = Math.max(0, hitFlash - STEP * 4);

  if (AUTOPLAY) autoplaySwing();
  else if (swingPressed || keys.has('Space') || keys.has('KeyJ')) startSwing(player.facing);
  swingPressed = false;

  updateSwing();
  updateBugs();
  updateFx();

  if (player.hp <= 0) {
    state = 'over';
    overTime = 0;
    player.hurtTimer = 0;
  }
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

// Null Pointer bug, facing up (antennae on top).
// a = antenna, r = shell, R = shell highlight, W = eye, l = leg
const BUG_FRAMES = [
  [
    '.a...a.',
    '..rWr..',
    'lrRRRrl',
    '.rRRRr.',
    'lrRRRrl',
    '..r.r..',
  ],
  [
    'a.....a',
    '..rWr..',
    '.rRRRr.',
    'lrRRRrl',
    '.rRRRr.',
    '.l.r.l.',
  ],
];
const BUG_COLORS = {
  a: '#ff2e63',
  r: '#ff2e63',
  R: '#ff6b95',
  W: '#ffe3ec',
  l: '#a3133b',
};

// Cheap deterministic hash, so the glitch effect never touches the game RNG
function glitchNoise(id, tick) {
  let h = (id * 374761393 + tick * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawBugSprite(frame, colors) {
  const w = frame[0].length * BUG_PIXEL;
  const h = frame.length * BUG_PIXEL;
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[row].length; col++) {
      const c = colors[frame[row][col]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(col * BUG_PIXEL - w / 2, row * BUG_PIXEL - h / 2, BUG_PIXEL, BUG_PIXEL);
    }
  }
}

const GLITCH_CYAN = { a: '#00f0ff', r: '#00f0ff', R: '#00f0ff', W: '#00f0ff', l: '#00f0ff' };

function drawBugs(time) {
  const tick = Math.floor(time * 20);
  for (const b of bugs) {
    const frame = BUG_FRAMES[Math.floor(time * 12 + b.id) % 2];
    const noise = glitchNoise(b.id, tick);
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.rotate(b.angle + Math.PI / 2);

    // Glitch: now and then the bug splits into a cyan ghost and jitters sideways
    if (noise < 0.12) {
      const jitter = (glitchNoise(b.id + 7, tick) - 0.5) * 6;
      ctx.globalAlpha = 0.6;
      ctx.translate(jitter, 0);
      drawBugSprite(frame, GLITCH_CYAN);
      ctx.translate(-jitter * 1.6, 0);
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = '#ff2e63';
    ctx.shadowBlur = 6;
    drawBugSprite(frame, BUG_COLORS);
    ctx.restore();
  }
}

function drawPlayer(time) {
  // Flicker while invulnerable after a hit
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 20) % 2 === 0) return;

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
  // Mid-swing, the eyes follow the keyboard instead of the feet
  let lookX = player.lookX, lookY = player.lookY;
  if (swing.timer > 0) {
    const cx = Math.cos(swing.angle), cy = Math.sin(swing.angle);
    lookX = Math.abs(cx) > 0.3 ? Math.sign(cx) : 0;
    lookY = Math.abs(cy) > 0.3 ? Math.sign(cy) : 0;
  }
  const eyeRow = 4 + Math.max(0, lookY) - Math.max(0, -lookY);
  const eyeCols = [4 + lookX, 7 + lookX];
  ctx.save();
  ctx.fillStyle = EYE_COLOR;
  ctx.shadowColor = EYE_COLOR;
  ctx.shadowBlur = 10;
  for (const col of eyeCols) {
    ctx.fillRect(left + col * PIXEL, top + eyeRow * PIXEL, PIXEL, PIXEL);
  }
  ctx.restore();
}

// The keyboard sweeps across the arc, leaving a faint cyan swoosh
function drawSwing() {
  if (swing.timer <= 0) return;
  const t = 1 - swing.timer / SWING_TIME;
  const eased = 1 - (1 - t) * (1 - t);
  const start = swing.angle - SWING_ARC / 2;
  const now = start + SWING_ARC * eased;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 * (1 - t * 0.5)})`;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, SWING_REACH * 0.68, start, now);
  ctx.stroke();

  ctx.rotate(now);
  const r = 36;
  // Body (long side along the arc)
  ctx.fillStyle = '#9fb3c8';
  ctx.fillRect(r - 7, -18, 14, 36);
  ctx.fillStyle = '#1a1c24';
  ctx.fillRect(r - 5, -16, 10, 32);
  // Keys: 2 rows of 6 light caps
  ctx.fillStyle = '#e6ebf2';
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(r - 4 + row * 5, -15 + k * 5, 3, 3);
    }
  }
  ctx.restore();
}

function drawFx() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.translate(p.x, p.y);
    if (p.kind === 'cap') {
      ctx.rotate(p.rot);
      ctx.fillStyle = '#9fb3c8';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#e6ebf2';
      ctx.fillRect(-4, -5, 8, 7);
      ctx.fillStyle = '#1a1c24';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.letter, 0, -1.5);
    } else {
      ctx.fillStyle = '#ff2e63';
      ctx.fillRect(-1, -1, 2, 2);
    }
    ctx.restore();
  }

  for (const p of popups) {
    const age = 0.7 - p.life;
    const pop = age < 0.08 ? 0.6 + age / 0.08 * 0.6 : 1.2 - Math.min(0.2, (age - 0.08) * 2);
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    ctx.scale(pop, pop);
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#05060a';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = '#fff36b';
    ctx.shadowColor = '#fff36b';
    ctx.shadowBlur = 10;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '14px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('BUG SURVIVOR', 16, 14);
  ctx.textAlign = 'right';
  ctx.fillText(AUTOPLAY ? `AUTOPLAY  seed ${SEED}   WAVE ${wave}` : `WAVE ${wave}`, ARENA_W - 16, 14);
  ctx.textAlign = 'left';

  // Health bar
  const x = 16, y = 36, w = 200, h = 10;
  const frac = player.hp / PLAYER_MAX_HP;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.fillStyle = frac > 0.3 ? '#00f0ff' : '#ff2e63';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8;
  ctx.fillRect(x, y, Math.round(w * frac), h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.font = '11px monospace';
  ctx.fillText(`HP ${player.hp}`, x + w + 10, y - 1);
  ctx.fillText(`SMASHED ${smashed}`, x, y + 18);

  // Red flash when hit
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 46, 99, ${hitFlash * 0.18})`;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }
}

function drawGameOver() {
  ctx.fillStyle = `rgba(5, 6, 10, ${Math.min(0.75, overTime * 2)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px monospace';
  // Glitchy title: a cyan ghost that jitters behind the red text
  const j = (glitchNoise(1, Math.floor(overTime * 15)) - 0.5) * 8;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.fillText('BUILD FAILED', ARENA_W / 2 + j, ARENA_H / 2 - 10);
  ctx.fillStyle = '#ff2e63';
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 20;
  ctx.fillText('BUILD FAILED', ARENA_W / 2, ARENA_H / 2 - 10);
  ctx.shadowBlur = 0;

  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
  ctx.fillText(`survived ${roundTime.toFixed(1)}s  ·  reached wave ${wave}  ·  smashed ${smashed}`, ARENA_W / 2, ARENA_H / 2 + 44);
  if (!AUTOPLAY && Math.floor(overTime * 2) % 2 === 0) {
    ctx.fillText('press R to rebuild', ARENA_W / 2, ARENA_H / 2 + 74);
  }
  ctx.restore();
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
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.save();
  ctx.translate(Math.round(shakeX), Math.round(shakeY));
  drawArena(simTime);
  drawPlayer(simTime);
  drawBugs(simTime);
  drawSwing();
  drawFx();
  ctx.restore();
  drawHud();
  if (state === 'over') drawGameOver();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
