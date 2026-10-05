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

## 18:14 — Null Pointer bugs, health and BUILD FAILED

> Now add the first enemy: Null Pointer bugs.
>
> They're small, fast, and spawn in waves from the edges of the arena,
> crawling straight toward CodeMask. Make them look like little glitchy
> red-pink bugs.
>
> If one touches CodeMask, it deals damage. Give CodeMask a health bar,
> and when it hits zero, show "BUILD FAILED" and let me restart.

Added Null Pointer bugs: tiny two-frame red-pink pixel sprites that rotate to face CodeMask and now and then split into a jittering cyan ghost. Waves start at 1.5 s and come every 6 s, each one bigger (6, 8, 10… bugs) and from one random edge, two edges from wave 3 on. A touching bug deals 10 damage, gets knocked back, and CodeMask flickers for 0.7 s of invulnerability. There's an HP bar that turns red under 30%, a red screen flash on hits, and a glitchy BUILD FAILED screen with survival time and wave; R, Enter or Space restarts. In autoplay the bot now runs away from nearby bugs and walls, and the demo restarts itself 3 s after dying.

What broke: two bugs on the first try. (1) The glitch effect was supposed to hit about 12% of frames, but in screenshots half the swarm was glitching all the time. The hash returned a *signed* 32-bit number, so every negative value counted as "glitch": measured rate 62%. A single `>>> 0` brought it down to 11.9%. (2) Pressing R on BUILD FAILED did nothing. A quick tap pressed and released the key between two simulation steps, so `keys.has('KeyR')` never saw it. Now the keydown handler latches a `restartPressed` flag. I checked determinism with a headless node run: 90 s of autoplay with seed 1 twice gave the exact same position, HP, wave and deaths; seed 2 went differently. Known gap: bugs never die yet, so they pile up (50 alive by wave 5). That's for the weapons step.

Commit: `baf37f9`

## 18:20 — The keyboard fights back

> CodeMask needs a way to fight back. Give it a keyboard.
>
> Pressing Space (or J) swings a keyboard in a short arc in front of
> CodeMask, in the direction it's facing. Bugs caught in the swing get
> smashed. Make it feel good: a "CLACK!" pop-up, a few keycaps flying
> off, a tiny screen shake.
>
> Add a short cooldown so you can't just spam it. In autoplay, the bot
> should swing when bugs get close.

Space or J swings a little pixel keyboard through a 135° arc in the direction CodeMask last moved, with a cyan swoosh trail; every bug inside the arc gets smashed and the swing has a 0.45 s cooldown. Each smash throws off spinning keycaps with letters on them and red bug bits, pops a yellow "CLACK!" (or "CLACK! x3" for multi-hits) and shakes the screen a bit; a SMASHED counter sits under the HP bar. In autoplay the bot turns to the nearest bug in reach and swings; effects use their own seeded RNG stream, so the juice never changes the gameplay.

What surprised me: the browser tab was in the background this time, so `requestAnimationFrame` stopped and real key presses never reached the page. I tested by stepping `update()` by hand and firing synthetic key events instead. Space was also the restart key, so holding it while dying would skip BUILD FAILED; restart is now R or Enter only. The bot went from dying in wave 2 to surviving 90 s with 254 bugs smashed — bugs still pile up faster than it kills them, though.

Commit: `03a5827`

## 18:27 — Commits, XP and upgrade cards

> Smashed bugs should drop commits — small glowing green dots that
> CodeMask picks up by walking near them. Commits are XP.
>
> When the XP bar fills, pause the game and show 3 upgrade cards to
> choose from. Start with these upgrades:
>
> - Linter: auto-fires a shot at the nearest bug every second
> - Mechanical Keyboard: bigger swing arc, more damage, louder CLACK
> - Coffee: CodeMask moves faster
>
> Each upgrade can be picked again to level it up. Show the current
> level on the card. In autoplay, the bot picks a card on its own.

Every dead bug drops a glowing green commit that drifts toward CodeMask when it gets close; a green XP bar runs along the bottom, and each level needs 4 more commits than the last. A full bar pauses the game and shows three cards with their level ("NEW" or "LV 2 → 3"): Linter fires yellow squiggle shots at the nearest bug (20% faster per level), Mechanical Keyboard adds +30° arc, more reach, +1 damage and a bigger "CLACK!!!", Coffee adds +15% speed. "More damage" needed something to hit, so bugs now get 1 extra HP every 4 waves and flash white when hit but not killed; in autoplay the bot walks to nearby commits, highlights a seeded-random card, then takes it after a beat.

What surprised me: at Mechanical Keyboard 3 the "louder CLACK" was too loud — three overlapping 33px "CLACK!!!!" pop-ups and 12px shake made the screen unreadable, so the newest CLACK now replaces older ones nearby and size/shake are capped. One test said "linter kill dropped no commit"; turned out my synthetic ArrowRight was never released, so CodeMask had walked over and already picked it up. Headless check: 90 s of seed 1 is still identical run to run (9 level-ups, wave 13, no deaths).

Commit: `6ddd65a`
