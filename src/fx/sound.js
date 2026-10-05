// Tiny synthesized sound effects (Web Audio, no files).
// Browsers only allow audio after the player interacts with the page, so the
// audio context is created on the first key press or click (input.js calls
// unlockAudio). Without that, or without Web Audio, sounds are skipped.
let audio = null;

export function unlockAudio() {
  if (audio || typeof AudioContext === 'undefined') return;
  audio = new AudioContext();
}

// A soft, tense warning tone: two slightly detuned sines slowly gliding
// up and down, fading in and out. Meant to build tension, not to startle.
export function playSiren(seconds = 3) {
  if (!audio) return;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.8);
  gain.gain.setValueAtTime(0.04, now + seconds - 1);
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(gain).connect(audio.destination);

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
