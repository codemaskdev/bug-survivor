import { VIDEO_URL } from '../config.js';

// Phones and tablets: the game needs a keyboard, so instead of the game they
// get a short page saying so, with the video link. A device counts as
// touch-only when its main pointer is a finger and it has no mouse or
// trackpad at all. ?keyboard=1 skips the check (a tablet with a keyboard).

export function needsKeyboardNotice() {
  if (typeof matchMedia !== 'function') return false;
  if (new URLSearchParams(location.search).get('keyboard') === '1') return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
}

export function showKeyboardNotice() {
  document.getElementById('game').remove();
  const style = document.createElement('style');
  style.textContent = `
    html, body { overflow: auto; height: auto; }
    body { min-height: 100vh; }
    .notice {
      margin: auto;
      box-sizing: border-box;
      max-width: 520px;
      padding: 32px 16px;
      font-family: monospace;
      text-align: center;
      color: #e6ebf2;
      line-height: 1.5;
    }
    .notice h1 {
      margin: 0 0 24px;
      font-size: clamp(36px, 11vw, 56px);
      color: #00f0ff;
      text-shadow: 3px 2px 0 rgba(255, 46, 99, 0.6), 0 0 18px #00f0ff;
    }
    .notice .key {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: bold;
      color: #ffd23f;
      text-shadow: 0 0 10px rgba(255, 210, 63, 0.6);
    }
    .notice p { margin: 0 0 16px; opacity: 0.85; }
    .notice .watch {
      display: inline-block;
      margin: 16px 0 24px;
      padding: 12px 20px;
      border: 2px solid #ff2e63;
      color: #ff2e63;
      font-size: 18px;
      font-weight: bold;
      text-decoration: none;
      text-shadow: 0 0 8px #ff2e63;
      box-shadow: 0 0 12px rgba(255, 46, 99, 0.4);
    }
    .notice .small { font-size: 13px; opacity: 0.6; }
    .notice .small a { color: #00f0ff; }
  `;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'notice';
  box.innerHTML = `
    <h1>BUG SURVIVOR</h1>
    <p class="key">This game needs a keyboard.</p>
    <p>Open this page on a computer to play: you move with WASD and smash bugs with Space.</p>
    <a class="watch" href="${VIDEO_URL}" target="_blank" rel="noopener">▶ Watch how it was made</a>
    <p>Built entirely by Claude Code — no hand-written code.</p>
    <p class="small"><a href="?autoplay=1">Watch the bot play a round</a> · <a href="?keyboard=1">I have a keyboard, let me play</a></p>
  `;
  document.body.appendChild(box);
}
