// Tiny synthesized sound effects (Web Audio, no files).
// Browsers only allow audio after the player interacts with the page, so the
// audio context is created on the first key press or click (input.js calls
// unlockAudio). Without that, or without Web Audio, sounds are skipped.
let audio = null;

export function unlockAudio() {
  if (audio || typeof AudioContext === 'undefined') return;
  audio = new AudioContext();
}

// Air-raid style siren: two detuned saws sweeping up and down
export function playSiren(seconds = 2.4) {
  if (!audio) return;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
  gain.gain.setValueAtTime(0.12, now + seconds - 0.3);
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.connect(gain).connect(audio.destination);

  for (const detune of [0, 7]) {
    const osc = audio.createOscillator();
    osc.type = 'sawtooth';
    osc.detune.value = detune;
    for (let t = 0; t < seconds; t += 0.8) {
      osc.frequency.setValueAtTime(520, now + t);
      osc.frequency.linearRampToValueAtTime(880, now + t + 0.4);
      osc.frequency.linearRampToValueAtTime(520, now + t + 0.8);
    }
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + seconds);
  }
}
