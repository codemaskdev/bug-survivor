import { AUTOPLAY } from './params.js';
import { RUN_SECONDS } from './clock.js';

// Personal best: the longest survival and the most bugs smashed in a run,
// saved in localStorage. Only human runs count, never autoplay or the
// start-screen demo, and autoplay never reads them (it must replay exactly).
const KEY = 'bug-survivor-best';

export const best = load();                                  // { time, smashed }
export const lastRun = { newTime: false, newSmashed: false }; // what the run that just ended beat

function load() {
  const empty = { time: 0, smashed: 0 };
  if (AUTOPLAY) return empty;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { time: Number(saved?.time) || 0, smashed: Number(saved?.smashed) || 0 };
  } catch {
    return empty;
  }
}

export function hasBest() {
  return best.time > 0 || best.smashed > 0;
}

export function isNewRecord() {
  return lastRun.newTime || lastRun.newSmashed;
}

// Called once when a human run ends. A deploy means you made it through the
// whole Friday, so it counts as the full three minutes. The very first run
// sets the bar without a celebration. Returns true on a new record.
export function recordRun(seconds, smashed, won) {
  const time = won ? RUN_SECONDS : Math.min(RUN_SECONDS, Math.floor(seconds));
  const had = hasBest();
  lastRun.newTime = had && time > best.time;
  lastRun.newSmashed = had && smashed > best.smashed;
  best.time = Math.max(best.time, time);
  best.smashed = Math.max(best.smashed, smashed);
  try { localStorage.setItem(KEY, JSON.stringify(best)); } catch { /* private mode */ }
  return isNewRecord();
}

// 161 -> "2:41"
export function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function bestText() {
  return `${formatTime(best.time)} survived  ·  ${best.smashed} bugs smashed`;
}
