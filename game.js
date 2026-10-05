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
const BUG_DAMAGE = 10;
const FIRST_WAVE_AT = 1.5;  // seconds
const WAVE_EVERY = 6;       // seconds between waves

const SWING_TIME = 0.16;     // how long the keyboard arc lasts
const SWING_COOLDOWN = 0.45; // from the start of one swing to the next
const SWING_REACH = 64;      // px from CodeMask's center
const SWING_ARC = Math.PI * 0.75; // 135° in front of CodeMask

const COMMIT_PICKUP = 16;    // px: walking this close collects a commit
const COMMIT_MAGNET = 70;    // px: commits start drifting toward CodeMask
const LINT_SPEED = 420;      // px per second
const LINT_RANGE = 520;      // px before a shot fizzles out

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
  if (state === 'levelup' && !AUTOPLAY) handleCardKey(e.code);
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
let commits = [];           // green XP dots on the floor
let lints = [];             // Linter shots in flight
let xp = 0;
let level = 1;
let levelupTime = 0;        // seconds since the upgrade cards appeared
let cardChoice = 1;         // highlighted card (0..2)
let botPick = -1;           // the card the autoplay bot is going to take

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
  seenSpecies = new Set();
  banners = [];
  newBugs = [];
  particles = [];
  popups = [];
  shake = 0;
  commits = [];
  lints = [];
  xp = 0;
  level = 1;
  for (const u of UPGRADES) u.level = 0;
  linterTimer = 0;
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

// ---------- Bug species ----------
// Null Pointer: the basic swarm. Fast, fragile, crawls straight at you.
// Memory Leak (wave 3+): slow purple blob that grows, and gains HP as it grows.
// Infinite Loop (wave 5+): orange ring that circles you, then dashes in.
// Merge Conflict (wave 7+): blue/yellow block that splits in two when hit.
const SPECIES = {
  nullptr: { name: 'NULL POINTER',   from: 1, color: '#ff2e63', tip: 'fast, weak, comes in swarms' },
  leak:    { name: 'MEMORY LEAK',    from: 3, color: '#a855ff', tip: 'keeps growing. kill it early' },
  loop:    { name: 'INFINITE LOOP',  from: 5, color: '#ff8c1a', tip: 'circles you, then dashes in' },
  merge:   { name: 'MERGE CONFLICT', from: 7, color: '#3d8bff', tip: 'splits in two when hit' },
};

const LEAK_START_R = 8;
const LEAK_MAX_R = 34;
const LEAK_GROW = 2.2;       // px of radius per second
const LOOP_ORBIT_R = 140;
const LOOP_DASH_SPEED = 520;

let seenSpecies = new Set();
let banners = [];            // "NEW BUG: ..." announcements
let newBugs = [];            // bugs born mid-update (merge splits)

// Later waves are a bit tougher, so damage upgrades matter
function waveBonusHp() {
  return Math.max(0, Math.floor((wave - 1) / 4));
}

function leakHpForSize(r) {
  return 1 + Math.floor((r - LEAK_START_R) / 6) + waveBonusHp();
}

function makeBug(type, x, y) {
  const b = {
    id: nextBugId++,
    type,
    x, y,
    angle: 0,
    stun: 0,
    flash: 0,        // white flash when hit but not dead
    swingId: -1,     // last swing that hit this bug (one hit per swing)
  };
  if (type === 'nullptr') {
    b.r = 6;
    b.speed = BUG_SPEED * (0.85 + rng() * 0.3);
    b.hp = 1 + waveBonusHp();
    b.damage = BUG_DAMAGE;
  } else if (type === 'leak') {
    b.r = LEAK_START_R;
    b.speed = 42;
    b.hp = leakHpForSize(b.r);
    b.maxHp = b.hp;
    b.damage = 12;
  } else if (type === 'loop') {
    b.r = 8;
    b.speed = 150;
    b.hp = 2 + waveBonusHp();
    b.damage = 15;
    b.phase = 'approach';    // approach -> orbit -> windup -> dash -> approach
    b.timer = 0;
    b.orbitDir = rng() < 0.5 ? 1 : -1;
    b.spin = 0;
    b.trail = [];
  } else if (type === 'merge' || type === 'mergeOurs' || type === 'mergeTheirs') {
    const big = type === 'merge';
    b.r = big ? 11 : 6;
    b.speed = big ? 70 : 115;
    b.hp = big ? 1 : 1 + waveBonusHp();
    b.damage = big ? 12 : 8;
  }
  return b;
}

function edgePoint(edge) {
  const t = rng();
  if (edge === 0) return { x: t * ARENA_W, y: -14 };              // top
  if (edge === 1) return { x: ARENA_W + 14, y: t * ARENA_H };     // right
  if (edge === 2) return { x: t * ARENA_W, y: ARENA_H + 14 };     // bottom
  return { x: -14, y: t * ARENA_H };                              // left
}

// Each wave is bigger than the last and pours in from one or two edges.
// New species join the mix gradually.
function spawnWave() {
  wave++;
  const roster = [];
  for (let i = 0; i < 4 + wave * 2; i++) roster.push('nullptr');
  if (wave >= SPECIES.leak.from) for (let i = 0; i < Math.floor((wave - 1) / 2); i++) roster.push('leak');
  if (wave >= SPECIES.loop.from) for (let i = 0; i < Math.floor((wave - 3) / 2); i++) roster.push('loop');
  if (wave >= SPECIES.merge.from) for (let i = 0; i < Math.floor((wave - 5) / 2); i++) roster.push('merge');

  const edges = [Math.floor(rng() * 4)];
  if (wave >= 3) edges.push(Math.floor(rng() * 4));
  roster.forEach((type, i) => {
    const pt = edgePoint(edges[i % edges.length]);
    bugs.push(makeBug(type, pt.x, pt.y));
    if (!seenSpecies.has(type)) {
      seenSpecies.add(type);
      const sp = SPECIES[type];
      banners.push({ text: `NEW BUG: ${sp.name}`, tip: sp.tip, color: sp.color, life: 2.8 });
    }
  });
}

// Returns true if the bug is gone (dead or split). The caller removes it.
function damageBug(b, amount, fromKeyboard) {
  // A big Merge Conflict doesn't take damage: any hit splits it into ours + theirs
  if (b.type === 'merge') {
    const a = Math.atan2(b.y - player.y, b.x - player.x) + Math.PI / 2;
    for (const [type, side] of [['mergeOurs', -1], ['mergeTheirs', 1]]) {
      const c = makeBug(type, b.x + Math.cos(a) * 9 * side, b.y + Math.sin(a) * 9 * side);
      c.swingId = b.swingId;   // the swing that split it can't also kill the halves
      c.stun = 0.3;
      c.kx = Math.cos(a) * 160 * side;
      c.ky = Math.sin(a) * 160 * side;
      newBugs.push(c);
    }
    splitFx(b.x, b.y);
    return true;
  }

  b.hp -= amount;
  if (b.hp > 0) {
    b.flash = 0.1;
    b.stun = Math.max(b.stun, 0.15);
    return false;
  }
  smashed++;
  commits.push({ x: b.x, y: b.y, age: 0 });
  smashFx(b.x, b.y, fromKeyboard, SPECIES[b.type === 'mergeOurs' || b.type === 'mergeTheirs' ? 'merge' : b.type].color);
  return true;
}

function flushNewBugs() {
  if (newBugs.length) {
    bugs.push(...newBugs);
    newBugs = [];
  }
}

function moveToward(b, tx, ty, speed) {
  const dx = tx - b.x, dy = ty - b.y;
  const d = Math.hypot(dx, dy) || 1;
  b.x += (dx / d) * speed * STEP;
  b.y += (dy / d) * speed * STEP;
}

function updateLoop(b, d) {
  b.spin += (b.phase === 'windup' ? 22 : 9) * STEP;
  b.timer -= STEP;
  if (b.phase === 'approach') {
    moveToward(b, player.x, player.y, b.speed);
    if (d < LOOP_ORBIT_R + 10) {
      b.phase = 'orbit';
      b.timer = 1.8 + rng() * 1.8;
    }
  } else if (b.phase === 'orbit') {
    // Slide around CodeMask, easing back to the orbit radius
    const a = Math.atan2(b.y - player.y, b.x - player.x) + b.orbitDir * 1.5 * STEP;
    const r = d + (LOOP_ORBIT_R - d) * 0.08;
    b.x = player.x + Math.cos(a) * r;
    b.y = player.y + Math.sin(a) * r;
    if (b.timer <= 0) {
      b.phase = 'windup';
      b.timer = 0.4;
    }
  } else if (b.phase === 'windup') {
    // Stops and revs up: the tell before the dash
    if (b.timer <= 0) {
      b.phase = 'dash';
      b.timer = 0.5;
      b.dashAngle = Math.atan2(player.y - b.y, player.x - b.x);
    }
  } else if (b.phase === 'dash') {
    b.x += Math.cos(b.dashAngle) * LOOP_DASH_SPEED * STEP;
    b.y += Math.sin(b.dashAngle) * LOOP_DASH_SPEED * STEP;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 8) b.trail.shift();
    if (b.timer <= 0) b.phase = 'approach';
  }
  if (b.phase !== 'dash' && b.trail.length) b.trail.shift();
}

function updateBugs() {
  for (const b of bugs) {
    if (b.flash > 0) b.flash -= STEP;
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.angle = Math.atan2(dy, dx);

    // Fresh merge halves fly apart before they start chasing
    if (b.kx) {
      b.x += b.kx * STEP;
      b.y += b.ky * STEP;
      b.kx *= 0.88;
      b.ky *= 0.88;
      if (Math.abs(b.kx) + Math.abs(b.ky) < 5) b.kx = b.ky = 0;
    }

    if (b.type === 'leak') {
      b.r = Math.min(LEAK_MAX_R, b.r + LEAK_GROW * STEP);
      const maxHp = leakHpForSize(b.r);
      if (maxHp > b.maxHp) {
        b.hp += maxHp - b.maxHp;
        b.maxHp = maxHp;
      }
    }

    if (b.stun > 0) {
      b.stun -= STEP;
    } else if (b.type === 'loop') {
      updateLoop(b, d);
    } else {
      moveToward(b, player.x, player.y, b.speed);
    }

    // Touching CodeMask: deal damage, get knocked back
    if (d < PLAYER_RADIUS + b.r) {
      if (player.hurtTimer <= 0) {
        const dmg = b.type === 'leak' ? b.damage + Math.floor((b.r - LEAK_START_R) / 4) * 2 : b.damage;
        player.hp = Math.max(0, player.hp - dmg);
        player.hurtTimer = HIT_COOLDOWN;
        hitFlash = 1;
      }
      const knock = b.type === 'leak' ? 12 : 40;
      b.x -= (dx / d) * knock;
      b.y -= (dy / d) * knock;
      b.stun = 0.25;
      if (b.type === 'loop') b.phase = 'approach';
    }
  }

  // Light separation so a swarm doesn't collapse into a single dot
  for (let i = 0; i < bugs.length; i++) {
    for (let j = i + 1; j < bugs.length; j++) {
      const a = bugs[i], c = bugs[j];
      const dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + c.r;
      if (d > 0 && d < min) {
        // Heavier (bigger) bugs get pushed less
        const wa = c.r / min, wc = a.r / min;
        const push = min - d;
        a.x -= (dx / d) * push * wa; a.y -= (dy / d) * push * wa;
        c.x += (dx / d) * push * wc; c.y += (dy / d) * push * wc;
      }
    }
  }
}

function updateBanners() {
  if (banners.length) {
    banners[0].life -= STEP;
    if (banners[0].life <= 0) banners.shift();
  }
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Mechanical Keyboard upgrade: wider, longer, harder swings
function swingArc() {
  return Math.min(Math.PI * 2, SWING_ARC + UP.mech.level * (Math.PI / 6));
}
function swingReach() {
  return SWING_REACH + UP.mech.level * 8;
}
function swingDamage() {
  return 1 + UP.mech.level;
}

let swingCount = 0;

function startSwing(angle) {
  if (swing.cooldown > 0) return;
  swing.id = swingCount++;
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
  const reach = swingReach();
  const arc = swingArc();
  bugs = bugs.filter((b) => {
    if (b.swingId === swing.id) return true;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const inReach = Math.hypot(dx, dy) < reach + b.r;
    const inArc = Math.abs(angleDiff(Math.atan2(dy, dx), swing.angle)) < arc / 2;
    if (!inReach || !inArc) return true;
    b.swingId = swing.id;
    hits.push(b);
    return !damageBug(b, swingDamage(), true);
  });
  flushNewBugs();
  if (hits.length === 0) return;

  // A mechanical keyboard is louder: bigger CLACK, more !, more shake
  const loud = UP.mech.level;
  shake = Math.min(6 + Math.min(loud, 2), shake + 2 + hits.length + loud);
  const cx = hits.reduce((s, b) => s + b.x, 0) / hits.length;
  const cy = hits.reduce((s, b) => s + b.y, 0) / hits.length;
  const word = 'CLACK' + '!'.repeat(1 + Math.min(loud, 2));
  // The newest CLACK replaces any older one in the same spot, so they don't pile up
  popups = popups.filter((p) => Math.hypot(p.x - cx, p.y - (cy - 10)) > 60);
  popups.push({
    x: cx,
    y: cy - 10,
    text: hits.length > 1 ? `${word} x${hits.length}` : word,
    size: 18 + Math.min(loud, 4) * 3,
    life: 0.7,
    tilt: (fxRng() - 0.5) * 0.4,
  });
}

// ---------- Linter ----------
// Auto-fires at the nearest bug. Each level fires faster.
let linterTimer = 0;

function updateLinter() {
  if (UP.linter.level > 0) {
    linterTimer -= STEP;
    if (linterTimer <= 0) {
      let best = null, bestD = LINT_RANGE;
      for (const b of bugs) {
        const d = Math.hypot(b.x - player.x, b.y - player.y);
        if (d < bestD) { best = b; bestD = d; }
      }
      if (best) {
        const a = Math.atan2(best.y - player.y, best.x - player.x);
        lints.push({ x: player.x, y: player.y, vx: Math.cos(a) * LINT_SPEED, vy: Math.sin(a) * LINT_SPEED, dist: 0 });
        linterTimer = linterInterval();
      }
    }
  }

  for (const l of lints) {
    l.x += l.vx * STEP;
    l.y += l.vy * STEP;
    l.dist += LINT_SPEED * STEP;
    for (const b of bugs) {
      if (b.dead) continue;
      if (Math.hypot(b.x - l.x, b.y - l.y) < b.r + 3) {
        if (damageBug(b, 1, false)) b.dead = true;
        l.dist = LINT_RANGE; // shot is spent
        break;
      }
    }
  }
  lints = lints.filter((l) => l.dist < LINT_RANGE);
  bugs = bugs.filter((b) => !b.dead);
  flushNewBugs();
}

function linterInterval() {
  return Math.pow(0.8, UP.linter.level - 1);
}

// ---------- Commits (XP) ----------
function xpToNext() {
  return 5 + (level - 1) * 4;
}

function updateCommits() {
  for (const c of commits) {
    c.age += STEP;
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < COMMIT_PICKUP) {
      c.taken = true;
      xp++;
    } else if (d < COMMIT_MAGNET) {
      const pull = 260 * (1 - d / COMMIT_MAGNET) + 60;
      c.x += (dx / d) * pull * STEP;
      c.y += (dy / d) * pull * STEP;
    }
  }
  commits = commits.filter((c) => !c.taken);

  if (xp >= xpToNext()) {
    xp -= xpToNext();
    level++;
    openUpgradeCards();
  }
}

// ---------- Upgrades ----------
const UPGRADES = [
  {
    key: 'linter',
    name: 'Linter',
    icon: '⚠',
    level: 0,
    describe: (lv) => lv === 0
      ? 'Auto-fires a shot at the nearest bug every second.'
      : `Fires faster: every ${Math.pow(0.8, lv).toFixed(2)}s.`,
  },
  {
    key: 'mech',
    name: 'Mechanical Keyboard',
    icon: '⌨',
    level: 0,
    describe: () => 'Bigger swing arc, +1 damage, louder CLACK.',
  },
  {
    key: 'coffee',
    name: 'Coffee',
    icon: '☕',
    level: 0,
    describe: () => 'CodeMask moves 15% faster.',
  },
];
const UP = Object.fromEntries(UPGRADES.map((u) => [u.key, u]));

function playerSpeed() {
  return PLAYER_SPEED * (1 + UP.coffee.level * 0.15);
}

function openUpgradeCards() {
  state = 'levelup';
  levelupTime = 0;
  cardChoice = 1;
  botPick = AUTOPLAY ? Math.floor(rng() * UPGRADES.length) : -1;
}

function pickCard(i) {
  if (state !== 'levelup' || levelupTime < 0.3) return;
  UPGRADES[i].level++;
  state = 'playing';
  swingPressed = false;
  // Leftover XP might already fill the next bar
  if (xp >= xpToNext()) {
    xp -= xpToNext();
    level++;
    openUpgradeCards();
  }
}

function handleCardKey(code) {
  if (code === 'Digit1' || code === 'Numpad1') pickCard(0);
  else if (code === 'Digit2' || code === 'Numpad2') pickCard(1);
  else if (code === 'Digit3' || code === 'Numpad3') pickCard(2);
  else if (code === 'ArrowLeft' || code === 'KeyA') cardChoice = Math.max(0, cardChoice - 1);
  else if (code === 'ArrowRight' || code === 'KeyD') cardChoice = Math.min(2, cardChoice + 1);
  else if (code === 'Enter' || code === 'KeyE') pickCard(cardChoice);
}

// Card layout, shared by drawing and mouse clicks
const CARD_W = 220, CARD_H = 260, CARD_GAP = 30;
function cardRect(i) {
  const total = CARD_W * 3 + CARD_GAP * 2;
  return {
    x: (ARENA_W - total) / 2 + i * (CARD_W + CARD_GAP),
    y: (ARENA_H - CARD_H) / 2 + 20,
    w: CARD_W,
    h: CARD_H,
  };
}

function cardAt(px, py) {
  for (let i = 0; i < 3; i++) {
    const r = cardRect(i);
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('mousemove', (e) => {
  if (state !== 'levelup' || AUTOPLAY) return;
  const r = canvas.getBoundingClientRect();
  const i = cardAt((e.clientX - r.left) * ARENA_W / r.width, (e.clientY - r.top) * ARENA_H / r.height);
  if (i >= 0) cardChoice = i;
});
canvas.addEventListener('click', (e) => {
  if (state !== 'levelup' || AUTOPLAY) return;
  const r = canvas.getBoundingClientRect();
  const i = cardAt((e.clientX - r.left) * ARENA_W / r.width, (e.clientY - r.top) * ARENA_H / r.height);
  if (i >= 0) pickCard(i);
});

// Merge Conflict splitting: a burst of conflict markers
function splitFx(x, y) {
  shake = Math.min(8, shake + 2);
  popups = popups.filter((p) => Math.hypot(p.x - x, p.y - (y - 16)) > 40);
  popups.push({ x, y: y - 16, text: '<<<<<<< =======', size: 13, life: 0.6, tilt: 0, color: '#ffe14d' });
  for (let i = 0; i < 8; i++) {
    const a = fxRng() * Math.PI * 2;
    const v = 60 + fxRng() * 120;
    particles.push({
      kind: 'bit',
      color: i % 2 ? '#3d8bff' : '#ffe14d',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: 0, spin: 0, letter: '',
      life: 0.3 + fxRng() * 0.3,
    });
  }
}

const KEYCAP_LETTERS = 'QWERTYASDFGHZXCV{};/<>';

function smashFx(x, y, fromKeyboard, color) {
  // Keycaps pop off and tumble away (only when the keyboard did it)
  const caps = fromKeyboard ? 2 + Math.floor(fxRng() * 2) + UP.mech.level : 0;
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
      color,
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

  // Go grab the nearest commit, if there's one worth walking to
  let bestC = null, bestCD = 300;
  for (const c of commits) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bestCD) { bestC = c; bestCD = d; }
  }
  if (bestC) {
    bot.tx = bestC.x;
    bot.ty = bestC.y;
    bot.wait = 0;
  }

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
  let best = null, bestD = swingReach() * 0.9;
  for (const b of bugs) {
    const d = Math.hypot(b.x - player.x, b.y - player.y) - b.r;
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

  if (state === 'levelup') {
    // Game is paused while the cards are up
    levelupTime += STEP;
    if (AUTOPLAY) {
      if (levelupTime > 0.5) cardChoice = botPick;
      if (levelupTime > 1.4) pickCard(botPick);
    }
    return;
  }

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
    player.x += nx * playerSpeed() * STEP;
    player.y += ny * playerSpeed() * STEP;
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
  updateLinter();
  updateBugs();
  updateCommits();
  updateBanners();
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

const BUG_FLASH_COLORS = { a: '#fff', r: '#fff', R: '#fff', W: '#fff', l: '#fff' };

// Commits: small glowing green dots that bob a little
function drawCommits(time) {
  ctx.save();
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 8;
  for (const c of commits) {
    const pop = Math.min(1, c.age * 6);
    const s = Math.round(5 * pop) || 1;
    const bob = Math.round(Math.sin(time * 5 + c.x * 0.1) * 1.5);
    ctx.fillRect(Math.round(c.x - s / 2), Math.round(c.y - s / 2) + bob, s, s);
  }
  ctx.restore();
}

// Linter shots: little yellow warning squiggles
function drawLints() {
  ctx.save();
  ctx.strokeStyle = '#ffd23f';
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  for (const l of lints) {
    const a = Math.atan2(l.vy, l.vx);
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-5, -2);
    ctx.lineTo(-2, 2);
    ctx.lineTo(1, -2);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawBugs(time) {
  const tick = Math.floor(time * 20);
  for (const b of bugs) {
    if (b.type === 'nullptr') drawNullPointer(b, time, tick);
    else if (b.type === 'leak') drawLeak(b, time);
    else if (b.type === 'loop') drawLoop(b, time);
    else drawMerge(b, time, tick);
  }
}

// Memory Leak: a wobbly purple pixel blob with goofy eyes, dripping as it grows
function drawLeak(b, time) {
  const r = b.r;
  const P = 2;
  const flash = b.flash > 0;
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));

  // Soft glow behind (a gradient is much cheaper than shadowBlur per pixel)
  const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.6);
  g.addColorStop(0, 'rgba(168, 85, 255, 0.25)');
  g.addColorStop(1, 'rgba(168, 85, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);

  const n = Math.ceil(r * 1.15 / P);
  for (let gy = -n; gy <= n; gy++) {
    for (let gx = -n; gx <= n; gx++) {
      const x = gx * P, y = gy * P;
      const d = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const edge = r * (1 + Math.sin(a * 5 + time * 3 + b.id) * 0.07 + Math.sin(a * 3 - time * 2) * 0.05);
      if (d > edge) continue;
      let c = '#a855ff';
      if (d > edge - P * 1.2) c = '#4b1b8c';
      else if (x < -r * 0.2 && y < -r * 0.2 && d < r * 0.7) c = '#d3a6ff';
      ctx.fillStyle = flash ? '#fff' : c;
      ctx.fillRect(x - P / 2, y - P / 2, P, P);
    }
  }

  // Drips that fall off the bottom
  ctx.fillStyle = flash ? '#fff' : '#a855ff';
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.8 + i / 3 + b.id * 0.13) % 1;
    const dx = (i - 1) * r * 0.45;
    ctx.globalAlpha = 1 - t;
    ctx.fillRect(Math.round(dx), Math.round(r * 0.85 + t * 10), P, P);
  }
  ctx.globalAlpha = 1;

  // Eyes look at CodeMask
  const e = Math.max(2, Math.round(r / 6)) * 2 / 2;
  const lx = Math.cos(b.angle) * e * 0.5, ly = Math.sin(b.angle) * e * 0.5;
  for (const side of [-1, 1]) {
    const ex = Math.round(side * r * 0.32 - e / 2), ey = Math.round(-r * 0.15 - e / 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex, ey, e + 2, e + 2);
    ctx.fillStyle = '#1a0533';
    ctx.fillRect(Math.round(ex + 1 + lx * 0.6), Math.round(ey + 1 + ly * 0.6), Math.max(2, e / 1.5), Math.max(2, e / 1.5));
  }
  ctx.restore();
}

// Infinite Loop: a spinning orange ↻ ring. Flashes white right before it dashes.
function drawLoop(b, time) {
  ctx.save();
  // Dash trail
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i];
    ctx.globalAlpha = (i + 1) / b.trail.length * 0.35;
    ctx.fillStyle = '#ff8c1a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, b.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.translate(Math.round(b.x), Math.round(b.y));
  const winding = b.phase === 'windup';
  const blink = winding && Math.floor(time * 20) % 2 === 0;
  const color = b.flash > 0 || blink ? '#ffffff' : '#ff8c1a';
  const r = b.r * (winding ? 1.2 : 1);
  ctx.rotate(b.spin * b.orbitDir);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.shadowColor = '#ff8c1a';
  ctx.shadowBlur = winding ? 16 : 8;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 1.55);
  ctx.stroke();
  // Arrowhead at the end of the ring
  const ax = Math.cos(Math.PI * 1.55) * r, ay = Math.sin(Math.PI * 1.55) * r;
  ctx.beginPath();
  ctx.moveTo(ax - 4, ay - 1);
  ctx.lineTo(ax + 4, ay - 1);
  ctx.lineTo(ax, ay + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-1, -1, 3, 3);
  ctx.restore();
}

// Draws a pixel chevron: dir -1 = "<", 1 = ">"
function drawChevron(cx, cy, dir, P) {
  for (let i = -2; i <= 2; i++) {
    const x = cx + dir * (2 - Math.abs(i)) * P - P / 2;
    ctx.fillRect(Math.round(x), Math.round(cy + i * P - P / 2), P, P);
  }
}

// Merge Conflict: a blue "ours" half and a yellow "theirs" half that don't line up.
// When hit it splits into a small blue "<" and a small yellow ">".
function drawMerge(b, time, tick) {
  const flash = b.flash > 0;
  const BLUE = flash ? '#fff' : '#3d8bff';
  const YELLOW = flash ? '#fff' : '#ffe14d';
  const DARK = '#0b0d13';
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.shadowColor = '#3d8bff';
  ctx.shadowBlur = 8;

  if (b.type === 'merge') {
    const h = 22, w = 11;
    // The two halves keep slipping out of alignment, like a bad merge
    const slip = Math.round(Math.sin(time * 6 + b.id) * 1.5 + (glitchNoise(b.id, tick) < 0.15 ? 3 : 0));
    ctx.fillStyle = DARK;
    ctx.fillRect(-w - 1, -h / 2 - 1 - slip, w + 1, h + 2);
    ctx.fillRect(1, -h / 2 - 1 + slip, w + 1, h + 2);
    ctx.fillStyle = BLUE;
    ctx.fillRect(-w, -h / 2 - slip, w - 1, h);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(2, -h / 2 + slip, w - 1, h);
    ctx.shadowBlur = 0;
    // "=======" seam
    ctx.fillStyle = '#ffffff';
    for (let y = -h / 2; y < h / 2; y += 4) ctx.fillRect(0, y, 1, 2);
    ctx.fillStyle = DARK;
    drawChevron(-w / 2 - 1, -slip, -1, 2);
    drawChevron(w / 2 + 1, slip, 1, 2);
  } else {
    const ours = b.type === 'mergeOurs';
    ctx.fillStyle = DARK;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = ours ? BLUE : YELLOW;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = DARK;
    drawChevron(0, 0, ours ? -1 : 1, 2);
  }
  ctx.restore();
}

function drawNullPointer(b, time, tick) {
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
  drawBugSprite(frame, b.flash > 0 ? BUG_FLASH_COLORS : BUG_COLORS);
  ctx.restore();
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
  const arc = swingArc();
  const reach = swingReach();
  const start = swing.angle - arc / 2;
  const now = start + arc * eased;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 * (1 - t * 0.5)})`;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, reach * 0.68, start, now);
  ctx.stroke();

  ctx.rotate(now);
  const r = Math.round(reach * 0.56);
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
      ctx.fillStyle = p.color;
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
    ctx.font = `bold ${p.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#05060a';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.color || '#fff36b';
    ctx.shadowColor = ctx.fillStyle;
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
  const owned = UPGRADES.filter((u) => u.level > 0).map((u) => `${u.name.toUpperCase()} ${u.level}`);
  if (owned.length) ctx.fillText(owned.join('  ·  '), x, y + 34);

  // XP bar along the bottom edge
  const xpFrac = Math.min(1, xp / xpToNext());
  ctx.fillStyle = 'rgba(57, 255, 136, 0.12)';
  ctx.fillRect(16, ARENA_H - 22, ARENA_W - 32, 6);
  ctx.save();
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 8;
  ctx.fillRect(16, ARENA_H - 22, Math.round((ARENA_W - 32) * xpFrac), 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(57, 255, 136, 0.8)';
  ctx.fillText(`LVL ${level}   ${xp}/${xpToNext()} commits`, 16, ARENA_H - 38);

  // Red flash when hit
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 46, 99, ${hitFlash * 0.18})`;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }
}

function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawUpgradeCards() {
  ctx.fillStyle = `rgba(5, 6, 10, ${Math.min(0.75, levelupTime * 4)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#39ff88';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 16;
  ctx.fillText(`LEVEL UP  ·  LVL ${level}`, ARENA_W / 2, cardRect(0).y - 50);
  ctx.restore();

  const slide = Math.min(1, levelupTime * 5);
  for (let i = 0; i < 3; i++) {
    const u = UPGRADES[i];
    const r = cardRect(i);
    const selected = i === cardChoice;
    const y = r.y + (1 - slide) * 40 - (selected ? 8 : 0);

    ctx.save();
    ctx.globalAlpha = slide;
    ctx.fillStyle = selected ? '#0f1a22' : '#0b0d13';
    ctx.fillRect(r.x, y, r.w, r.h);
    ctx.strokeStyle = selected ? '#00f0ff' : 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 2;
    if (selected) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
    }
    ctx.strokeRect(r.x + 1, y + 1, r.w - 2, r.h - 2);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '44px monospace';
    ctx.fillStyle = '#e6ebf2';
    ctx.fillText(u.icon, r.x + r.w / 2, y + 60);

    ctx.font = 'bold 17px monospace';
    ctx.fillStyle = '#00f0ff';
    for (const [k, line] of wrapText(u.name, r.w - 24).entries()) {
      ctx.fillText(line, r.x + r.w / 2, y + 112 + k * 20);
    }

    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
    for (const [k, line] of wrapText(u.describe(u.level), r.w - 30).entries()) {
      ctx.fillText(line, r.x + r.w / 2, y + 164 + k * 17);
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#39ff88';
    ctx.fillText(u.level === 0 ? 'NEW' : `LV ${u.level} → ${u.level + 1}`, r.x + r.w / 2, y + r.h - 40);

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, y + r.h - 18);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.fillText(AUTOPLAY ? 'bot is choosing…' : '1 / 2 / 3, click, or ← → + Enter',
    ARENA_W / 2, cardRect(0).y + CARD_H + 40);
  ctx.restore();
}

// "NEW BUG: ..." banner, slides in with a glitch, in the species' color
function drawBanner() {
  const b = banners[0];
  if (!b) return;
  const age = 2.8 - b.life;
  const inT = Math.min(1, age / 0.25);
  const alpha = Math.min(1, b.life / 0.4) * inT;
  const y = 130;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.7)';
  ctx.fillRect(0, y - 34, ARENA_W, 68);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, y - 34, ARENA_W, 2);
  ctx.fillRect(0, y + 32, ARENA_W, 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px monospace';
  const x = ARENA_W / 2 + (1 - inT) * -120;
  const j = glitchNoise(3, Math.floor(age * 15)) < 0.3 ? (glitchNoise(4, Math.floor(age * 15)) - 0.5) * 10 : 0;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.fillText(b.text, x + j, y - 6);
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 16;
  ctx.fillText(b.text, x, y - 6);
  ctx.shadowBlur = 0;
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.85)';
  ctx.fillText(b.tip, x, y + 18);
  ctx.restore();
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
  drawCommits(simTime);
  drawPlayer(simTime);
  drawBugs(simTime);
  drawSwing();
  drawLints();
  drawFx();
  ctx.restore();
  drawHud();
  drawBanner();
  if (state === 'levelup') drawUpgradeCards();
  if (state === 'over') drawGameOver();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
