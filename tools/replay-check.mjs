#!/usr/bin/env node
// Replay check: proves a change didn't alter the game's behavior.
//
// Runs the real game loop headlessly (stubbed browser APIs, fake clock) for
// 180 seconds per scenario and hashes every canvas call: positions, colors,
// HUD text. Any change in gameplay or drawing changes the hash.
//
//   node tools/replay-check.mjs            compare against replay-golden.json
//   node tools/replay-check.mjs --update   re-record the golden hashes
//                                          (only after an intentional change)
//
// Scenarios: autoplay with seeds 1, 2 and 7, plus a scripted human who watches
// the start screen for a while, then walks, swings, picks cards with keys and
// mouse, dies and restarts.
// Node built-ins only, no npm deps.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GOLDEN = path.join(HERE, 'replay-golden.json');
const SECONDS = 180;           // the whole run, boss fight included
const SCENARIOS = ['seed1', 'seed2', 'seed7', 'manual'];

const args = process.argv.slice(2);
if (args[0] === '--run') {
  await runScenario(args[1], args[2]);
} else {
  await main(args.includes('--update'));
}

// ---------- Orchestrator ----------
async function main(update) {
  // src/ uses ES modules in .js files; Node only treats them as modules
  // inside a package with "type": "module", so run from a temp copy.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bug-survivor-replay-'));
  fs.cpSync(path.join(ROOT, 'src'), path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
  const entry = path.join(tmp, 'src', 'main.js');

  let results;
  try {
    console.log(`Replaying ${SCENARIOS.length} scenarios, ${SECONDS}s each…`);
    results = Object.fromEntries(await Promise.all(
      SCENARIOS.map(async (name) => [name, await runChild(name, entry)])
    ));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (update) {
    fs.writeFileSync(GOLDEN, JSON.stringify({ seconds: SECONDS, runs: results }, null, 2) + '\n');
    for (const [name, r] of Object.entries(results)) console.log(`  ${name.padEnd(7)} ${r.hash}  ${r.hud.join(' | ')}`);
    console.log(`Recorded new golden hashes in ${path.relative(ROOT, GOLDEN)}`);
    return;
  }

  if (!fs.existsSync(GOLDEN)) {
    console.error(`No ${path.relative(ROOT, GOLDEN)} yet. Run with --update to record one.`);
    process.exit(1);
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')).runs;
  let failed = 0;
  for (const name of SCENARIOS) {
    const got = results[name], want = golden[name];
    if (want && got.hash === want.hash) {
      console.log(`  ok    ${name.padEnd(7)} ${got.hash}`);
      continue;
    }
    failed++;
    console.log(`  DIFF  ${name.padEnd(7)} ${got.hash}  (golden ${want ? want.hash : 'missing'})`);
    if (want) {
      console.log(`        golden: ${want.hud.join(' | ')}  [${want.canvasCalls} canvas calls]`);
      console.log(`        now:    ${got.hud.join(' | ')}  [${got.canvasCalls} canvas calls]`);
    }
  }
  if (failed) {
    console.log(`\n${failed} scenario(s) changed. If that was intentional, re-record with --update.`);
    process.exit(1);
  }
  console.log('All scenarios match the golden replay.');
}

function runChild(name, entry) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--run', name, entry], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`scenario ${name} crashed (exit ${code})`));
      else resolve(JSON.parse(out));
    });
  });
}

// ---------- One scenario, in its own process ----------
async function runScenario(name, entry) {
  const manual = name === 'manual';
  const seed = manual ? null : Number(name.replace('seed', ''));

  // Two 32-bit FNV-style lanes over every canvas call and property write
  let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0, calls = 0;
  const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  const mixInt = (x) => {
    h1 = Math.imul(h1 ^ x, 0x01000193);
    h2 = Math.imul(h2 ^ x, 0x5bd1e995) ^ (h2 >>> 15);
  };
  const mix = (v) => {
    if (typeof v === 'number') { f64[0] = v; mixInt(u32[0]); mixInt(u32[1]); }
    else if (typeof v === 'string') { for (let i = 0; i < v.length; i++) mixInt(v.charCodeAt(i)); mixInt(0x7f); }
    else if (v && v.__grad) mixInt(v.__grad);
    else mixInt(v === undefined ? 1 : v === null ? 2 : v === true ? 3 : v === false ? 4 : 5);
  };

  let frameTexts = [], lastTexts = [], gradId = 0;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      return (...a) => {
        calls++;
        mix(k);
        for (const v of a) mix(v);
        if (k === 'fillText') frameTexts.push(a[0]);
        if (k === 'measureText') return { width: String(a[0]).length * 7 };
        if (k === 'createRadialGradient' || k === 'createLinearGradient') {
          const g = { __grad: ++gradId, addColorStop: (o, c) => { mix('stop'); mix(g.__grad); mix(o); mix(c); } };
          return g;
        }
      };
    },
    set(t, k, v) { mix('=' + k); mix(v); t[k] = v; return true; },
  });

  // Every listener is kept, like a real browser: several modules listen to the same event
  const listeners = {};
  const listen = (name, f) => (listeners[name] ||= []).push(f);
  const fire = (name, e) => (listeners[name] || []).forEach((f) => f(e));
  const canvas = {
    getContext: () => ctx, style: {}, width: 0, height: 0,
    addEventListener: (n, f) => listen('canvas:' + n, f),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 640 }),
  };
  let rafCb = null, now = 0;
  Object.assign(globalThis, {
    location: { search: manual ? '' : `?autoplay=1&seed=${seed}` },
    document: { getElementById: () => canvas },
    performance: { now: () => now },
    requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
    innerWidth: 1440, innerHeight: 900,
    addEventListener: (n, f) => listen('window:' + n, f),
  });
  globalThis.window = globalThis;

  await import(pathToFileURL(entry).href);

  // Scripted human: walks around, swings, picks cards, restarts after dying
  const key = (type, code) => fire('window:' + type, { code, preventDefault() {} });
  const DIRS = ['ArrowRight', 'KeyS', 'ArrowLeft', 'KeyW', 'KeyD', 'ArrowDown', 'KeyA', 'ArrowUp'];
  const scriptInput = (i) => {
    if (i % 50 === 0) {
      key('keyup', DIRS[(i / 50 - 1 + DIRS.length) % DIRS.length]);
      key('keydown', DIRS[(i / 50) % DIRS.length]);
    }
    if (i % 17 === 0) key('keydown', i % 34 ? 'Space' : 'KeyJ');
    if (i % 17 === 3) { key('keyup', 'Space'); key('keyup', 'KeyJ'); }
    if (i % 41 === 0) key('keydown', ['Digit1', 'Digit2', 'Digit3', 'ArrowLeft', 'Enter'][(i / 41) % 5]);
    if (i % 97 === 0) fire('canvas:mousemove', { clientX: 120 + (i % 700), clientY: 330 });
    if (i % 131 === 0) fire('canvas:click', { clientX: 120 + (i % 700), clientY: 330 });
    if (i % 300 === 0) key('keydown', 'KeyR');
    if (i % 300 === 2) key('keyup', 'KeyR');
    if (i === 1000) fire('window:blur');
    if (i === 1200) fire('window:resize');
  };

  // Before that, the human sits on the start screen (the attract demo plays
  // behind it) and hovers the video link, then presses Space
  const TITLE_FRAMES = 300;
  const titleInput = (i) => {
    if (i === 60) fire('canvas:mousemove', { clientX: 480, clientY: 597 });
    if (i === 150) fire('canvas:mousemove', { clientX: 480, clientY: 400 });
    if (i === TITLE_FRAMES - 1) key('keydown', 'Space');
  };

  for (let i = 0; i < SECONDS * 60; i++) {
    now += 1000 / 60;
    frameTexts = [];
    if (manual) i < TITLE_FRAMES ? titleInput(i) : scriptInput(i - TITLE_FRAMES);
    const cb = rafCb;
    rafCb = null;
    cb(now);
    lastTexts = frameTexts;
  }

  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  process.stdout.write(JSON.stringify({
    hash: hex(h1) + hex(h2),
    canvasCalls: calls,
    // HP, wave, smashed, level/XP and the owned-upgrades line ("LINTER 3  ·  MECH 5")
    hud: lastTexts.filter((t) => /HP|WAVE|SMASHED|LVL/.test(t) || /^[A-Z]+ \d+( {2}· {2}[A-Z]+ \d+)*$/.test(t)),
  }));
}
