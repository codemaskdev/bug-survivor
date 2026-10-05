// Every sound in the game, synthesized with Web Audio: no audio files.
// Browsers only allow audio after the player interacts with the page, so the
// audio context is created on the first key press or click (input.js and
// cards.js call unlockAudio). Without that, or without Web Audio, every
// sound call is silently skipped. M toggles mute.
let audio = null;
let master = null;
let muted = loadMuted();
const MASTER_VOLUME = 0.5;

function loadMuted() {
  try { return localStorage.getItem('bug-survivor-muted') === '1'; } catch { return false; }
}

export function unlockAudio() {
  if (audio || typeof AudioContext === 'undefined') return;
  audio = new AudioContext();
  master = audio.createGain();
  master.gain.value = muted ? 0 : MASTER_VOLUME;
  master.connect(audio.destination);
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('bug-survivor-muted', muted ? '1' : '0'); } catch { /* private mode */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, audio.currentTime, 0.02);
}

// ---------- Building blocks ----------

// Frequent sounds (a swarm dying at once) are limited to one per `gap` seconds
const lastPlayed = {};
function throttled(name, gap) {
  const t = audio.currentTime;
  if (t - (lastPlayed[name] ?? -1) < gap) return true;
  lastPlayed[name] = t;
  return false;
}

// One oscillator note with a quick attack and exponential decay
function tone({ type = 'sine', from, to = from, at = 0, dur = 0.1, vol = 0.2, glide = dur }) {
  const t = audio.currentTime + at;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + glide);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// White noise from a seeded generator (the game never uses Math.random)
let noiseBuffer = null;
function getNoise() {
  if (noiseBuffer) return noiseBuffer;
  noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    d[i] = (s / 4294967296) * 2 - 1;
  }
  return noiseBuffer;
}

// A burst of filtered noise; the filter can sweep from `freq` to `freqTo`
function noise({ at = 0, dur = 0.05, vol = 0.2, type = 'bandpass', freq = 2000, freqTo = freq, q = 1 }) {
  const t = audio.currentTime + at;
  const src = audio.createBufferSource();
  src.buffer = getNoise();
  const f = audio.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo !== freq) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, (t * 7.3) % 0.9);
  src.stop(t + dur + 0.02);
}

// ---------- Game sounds ----------

// Keyboard swing that hits: a sharp click plus a plastic thock.
// `loud` is the Mechanical Keyboard level: lower, heavier, louder.
export function sfxClack(loud = 0) {
  if (!audio) return;
  noise({ dur: 0.04, vol: 0.25 + loud * 0.04, freq: 3200 - loud * 300, q: 2 });
  tone({ type: 'triangle', from: 260 - loud * 20, to: 140, dur: 0.07, vol: 0.18 + loud * 0.03 });
}

// A bug dies: short wet squish
export function sfxSquish() {
  if (!audio || throttled('squish', 0.035)) return;
  tone({ type: 'sine', from: 320, to: 70, dur: 0.09, vol: 0.12 });
  noise({ dur: 0.05, vol: 0.06, type: 'lowpass', freq: 900 });
}

// Commit picked up: a tiny bright blip
export function sfxPickup() {
  if (!audio || throttled('pickup', 0.03)) return;
  tone({ type: 'sine', from: 1320, to: 1760, dur: 0.06, vol: 0.06, glide: 0.03 });
}

// Level up: rising C-major arpeggio
export function sfxLevelUp() {
  if (!audio) return;
  [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.07, dur: 0.18, vol: 0.12 }));
}

// Picking a card
export function sfxSelect() {
  if (!audio) return;
  tone({ type: 'square', from: 660, to: 990, dur: 0.08, vol: 0.1, glide: 0.04 });
}

// Linter shot: a quick electric zap
export function sfxZap() {
  if (!audio || throttled('zap', 0.05)) return;
  tone({ type: 'sawtooth', from: 1400, to: 300, dur: 0.07, vol: 0.05 });
}

// Rubber duck peck: squeak up and back down
export function sfxSqueak() {
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, t);
  osc.frequency.linearRampToValueAtTime(1900, t + 0.05);
  osc.frequency.linearRampToValueAtTime(1300, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.16);
}

// Burnout: soft fire crackle (called often; throttled to sparse pops)
export function sfxCrackle() {
  if (!audio || throttled('crackle', 0.09)) return;
  noise({ dur: 0.025, vol: 0.05, type: 'highpass', freq: 2500 });
}

// git revert: a big rewind whoosh
export function sfxWhoosh() {
  if (!audio) return;
  noise({ dur: 0.6, vol: 0.22, freq: 3500, freqTo: 250, q: 0.8 });
  tone({ type: 'sine', from: 900, to: 120, dur: 0.6, vol: 0.08 });
}

// Something hits the boss: a low thud
export function sfxBossHit() {
  if (!audio || throttled('bossHit', 0.08)) return;
  tone({ type: 'sine', from: 140, to: 60, dur: 0.1, vol: 0.18 });
  noise({ dur: 0.03, vol: 0.06, type: 'lowpass', freq: 600 });
}

// Boss Rollback: a wobbly reverse sweep up
export function sfxRollback() {
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const lfo = audio.createOscillator();
  const lfoGain = audio.createGain();
  const g = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(720, t + 0.9);
  lfo.frequency.value = 12;
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  osc.connect(g).connect(master);
  osc.start(t); lfo.start(t);
  osc.stop(t + 1.05); lfo.stop(t + 1.05);
}

// Pair Programmer lands: a deep boom and a power chord
export function sfxPairDrop() {
  if (!audio) return;
  tone({ type: 'sine', from: 120, to: 40, dur: 0.4, vol: 0.3 });
  noise({ dur: 0.25, vol: 0.15, type: 'lowpass', freq: 500 });
  [196, 294, 392].forEach((f) => tone({ type: 'sawtooth', from: f, at: 0.08, dur: 0.5, vol: 0.035 }));
}

// Pair Programmer's machine guns: rapid dry ticks
export function sfxGun() {
  if (!audio || throttled('gun', 0.06)) return;
  noise({ dur: 0.03, vol: 0.07, type: 'highpass', freq: 1800 });
  tone({ type: 'square', from: 180, to: 90, dur: 0.03, vol: 0.03 });
}

// Endings: a short jingle each
export function sfxEnding(kind) {
  if (!audio) return;
  if (kind === 'won') {
    // Bright fanfare up to a held major chord
    [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.1, dur: 0.15, vol: 0.12 }));
    [523, 659, 784, 1047].forEach((f) => tone({ type: 'triangle', from: f, at: 0.32, dur: 0.9, vol: 0.07 }));
  } else if (kind === 'over') {
    // Sad descending "build failed" trombone
    [392, 370, 349].forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.22, dur: 0.22, vol: 0.2 }));
    tone({ type: 'triangle', from: 330, to: 300, at: 0.66, dur: 0.7, vol: 0.2 });
  } else if (kind === 'timeout') {
    // The on-call pager: two-tone beeps
    for (let i = 0; i < 3; i++) {
      tone({ type: 'square', from: 988, at: i * 0.28, dur: 0.1, vol: 0.12 });
      tone({ type: 'square', from: 740, at: i * 0.28 + 0.12, dur: 0.1, vol: 0.12 });
    }
  }
}

// A soft, tense warning tone: two slightly detuned sines slowly gliding
// up and down, fading in and out. Meant to build tension, not to startle.
// (0.08 here x 0.5 master = the same level as before the master channel.)
export function playSiren(seconds = 3) {
  if (!audio) return;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.8);
  gain.gain.setValueAtTime(0.08, now + seconds - 1);
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(gain).connect(master);

  for (const detune of [0, 6]) {
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(380, now);
    for (let t = 0; t < seconds; t += 1.5) {
      osc.frequency.linearRampToValueAtTime(520, now + t + 0.75);
      osc.frequency.linearRampToValueAtTime(380, now + t + 1.5);
    }
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + seconds);
  }
}
