# Bug Survivor — DEVLOG

## 18:11 — The arena and CodeMask

> Let's build a game called Bug Survivor.
>
> Start with just the basics: a dark arena with a subtle neon grid, and the
> player character — a tiny pixel-art version of me, CodeMask: black hoodie,
> dark face, two glowing cyan pixel eyes. Move with WASD or arrow keys.
>
> Keep it simple for now. We'll add enemies next.

Built `index.html` + `game.js`: a 960×640 canvas arena with a faintly pulsing cyan grid, a vignette and a glowing border, scaled to fit the window. CodeMask is a 12×13 pixel sprite drawn from a string map (black hoodie, near-black face, dark-teal outline so it doesn't vanish into the background), and its two cyan eyes glow, blink every few seconds and shift toward the direction it walks. Movement is WASD/arrows with normalized diagonals; the simulation runs on a fixed 1/60 s step, and `?autoplay=1&seed=N` makes it wander between random points using a seeded mulberry32 RNG.

What surprised me: a pure black hoodie on a black arena is basically invisible, so the sprite needed a subtle outline color. Also the browser tool refuses `file://` URLs, so I had to spin up a throwaway local server just to look at the game. I checked autoplay determinism by replaying the bot logic twice with seed 1: same position both times; seed 2 ends somewhere else.

Commit: `26f472f`
