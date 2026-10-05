// The run is three real minutes on a Friday afternoon: FRI 16:57 -> 17:00.
// One real second is one second on the clock.
export const RUN_SECONDS = 180;
const START = 16 * 3600 + 57 * 60;   // 16:57:00

// "FRI 16:58:07" for a given number of seconds into the run
export function clockText(seconds) {
  const t = START + Math.min(RUN_SECONDS, Math.floor(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `FRI ${h}:${pad(m)}:${pad(s)}`;
}
