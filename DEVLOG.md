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

## 18:33 — Three new bug species

> Time for more bug species. Introduce them gradually by wave, and when
> a new species first appears, flash a banner like "NEW BUG: MEMORY LEAK".
>
> - Memory Leak (from wave 3): a slow purple blob that keeps growing the
>   longer it lives. Bigger = more HP. Kill it early.
> - Infinite Loop (from wave 5): circles around CodeMask at a distance
>   instead of attacking, then suddenly dashes in.
> - Merge Conflict (from wave 7): when hit, splits into two smaller
>   conflicts. The small ones don't split again.
>
> Each species should be instantly recognizable by shape and color.
> Keep Null Pointers as the basic swarm.

Added three species, each with its own shape and color: Memory Leak is a wobbly purple pixel blob with googly eyes that grows from radius 8 to 34 and gains HP (and contact damage) as it grows; Infinite Loop is a spinning orange ↻ ring that orbits CodeMask at 140 px, stops and blinks white as a tell, then dashes in at 520 px/s; Merge Conflict is a blue "ours" half and a yellow "theirs" half that keep slipping out of alignment, and any hit splits it into a small blue `<` and a small yellow `>` that don't split again. They join by wave (3, 5, 7) in growing numbers, and the first time a species shows up a glitchy "NEW BUG: …" banner slides in with a one-line tip; the old Null Pointer is still the bulk of every wave.

What surprised me: not much broke this time. The one real find was from a headless test: bugs spawned at "wave 0" got 0 HP (harmless in the real game, since spawns start at wave 1, but now clamped). Two things I designed around up front rather than hit as bugs: the swing that splits a Merge Conflict could also kill both halves in the same frame and hide the split, so the halves inherit that swing's id and fly apart first; and bugs used to share one radius constant, so the swing, Linter, contact and separation code switched to per-bug size so a 34 px leak can be hit at its edge. Seed 1 is still deterministic and the bot survives 90 s.

_Correction (added after commit `3d46a57`): the first version of this entry described the Merge Conflict split issue as something that broke. It didn't. I prevented it before testing._

Commit: `68f3d5c`

## 18:45 — Refactor: game.js → ES modules

> Before we add anything else, let's pay off some tech debt. game.js is
> getting too big to maintain.
>
> Refactor it into ES modules with a clear folder structure, for example:
> src/core (loop, input, rng), src/entities (player, bugs), src/weapons,
> src/upgrades, src/ui (hud, cards, screens), src/fx (particles, shake).
> Each bug type should live in its own file so new species are easy to add.
>
> This is a pure refactor: no behavior changes. Before you start, record
> the autoplay result for seed 1 over 90 seconds. After the refactor it
> must match exactly. Update CLAUDE.md: the game now runs via `npx serve`
> instead of opening index.html directly.

Split the 1584-line game.js into 29 modules under src/ (core, entities with one file per bug species plus a registry, weapons, upgrades, ai, fx, ui, world); CLAUDE.md now says to run it with `npx serve`. Before touching anything I recorded a black-box baseline: the real game loop driven for 90 s with stubbed browser APIs, hashing every one of the 15.7 million canvas calls. Seed 1 ended at wave 13, HP 90, 276 smashed, LVL 11, Linter 3 / Mech Keyboard 5 / Coffee 2 (hash `01ff46247ebfda84`), plus seeds 2 and 7 and a scripted keyboard-and-mouse run.

What broke: nothing broke. All four runs matched the baseline hash on the first try, and a deliberate one-character change to the shake decay did change the hash, so the check works. One scare: a browser check showed 278 smashed instead of 276, but the old game.js was off too (285) when checked the same way. My test had let a few frames run before it started counting. With both versions started the same way, Chrome gave identical results.

Commit: `ec06efc`

## 18:50 — Replay check as a real tool

> Yes, add the replay check to tools/replay-check.mjs with the golden
> hashes in a file next to it. Add an --update flag to re-record the
> baseline after intentional changes. Mention it in CLAUDE.md: run it
> after every refactor.

`node tools/replay-check.mjs` runs four 90-second headless replays in parallel (autoplay seeds 1, 2, 7 and a scripted human), hashes every canvas call and compares against tools/replay-golden.json; `--update` re-records it. It runs in about 10 seconds, uses only Node built-ins, and CLAUDE.md now says to run it after every refactor and to commit a new golden file with intentional changes.

What broke: nothing broke. The freshly recorded golden hashes are identical to the ones I recorded before the refactor, and a one-digit tweak to the screen shake made all four scenarios fail even though the HUD numbers stayed the same.

Commit: `ef0451b`

## 18:52 — Pixel-art card icons

> More upgrades for the card pool:
>
> - Unit Tests: shields orbiting CodeMask that smash bugs on contact.
>   More levels = more shields.
> - Code Review: every few seconds, a pulse wave around CodeMask that
>   damages and pushes back all nearby bugs.
> - Rubber Duck: a little duck companion that follows CodeMask and pecks
>   the nearest bug. Squeaks when it hits.
> - git revert: every 30 seconds, wipes all bugs on screen. Rare card.
>
> Also replace the emoji icons on all cards with small pixel-art icons
> drawn in code, matching the game's neon style.

First step of this prompt (the new upgrades follow in their own commits): the ⚠ ⌨ ☕ emoji on the cards are now 16×16 pixel-art icons drawn from string maps in src/ui/icons.js, each pixel with a soft glow in its own color: a yellow warning sign, a cyan-framed keyboard and a steaming mug. Emoji looked different on every OS; these look the same everywhere.

What broke: nothing broke. The replay check showed exactly what I expected: all four scenarios changed hash, but every HUD number stayed identical and only the canvas call count grew (the icons are drawn pixel by pixel), so I re-recorded the golden file in the same commit.

Commit: `5af2401`

## 18:55 — Unit Tests and a real card pool

> More upgrades for the card pool:
>
> - Unit Tests: shields orbiting CodeMask that smash bugs on contact.
>   More levels = more shields.
> - Code Review: every few seconds, a pulse wave around CodeMask that
>   damages and pushes back all nearby bugs.
> - Rubber Duck: a little duck companion that follows CodeMask and pecks
>   the nearest bug. Squeaks when it hits.
> - git revert: every 30 seconds, wipes all bugs on screen. Rare card.
>
> Also replace the emoji icons on all cards with small pixel-art icons
> drawn in code, matching the game's neon style.

Unit Tests puts little green ✓ shields in orbit around CodeMask (two at level 1, one more per level, up to 8); a shield deals 1 damage to a bug it touches and bounces it away, and can't hit the same bug again for 0.4 s. With four upgrades the cards can no longer just show everything, so a level-up now draws 3 different cards from a weighted pool using the seeded RNG, and the HUD lists upgrades by short names (LINTER 1 · MECH 3 · TESTS 2) so the line still fits.

What surprised me: on seed 1 the bot now dies at 83 s (wave 12), where before it survived the whole 90 s. Unit Tests isn't the cause: the bot was offered Linter several times but never picked it, because it now chooses at random from 3 drawn cards instead of from all of them. Seeds 2 and 7 still survive.

Commit: `69d3b9d`

## 18:56 — Fix: replay check summary lost the upgrades line

(No new prompt: found while working on the prompt above.)

Right after the previous commit, the replay check's readable summary was missing the owned-upgrades line. My pattern expected one space after the "·" separator, but the HUD uses two. Fixed the pattern and re-recorded the golden file.

What broke: only the summary text was wrong; the hashes were never affected, so no check gave a wrong pass or fail.

Commit: `a8dfe27`

## 18:57 — Code Review pulse

> More upgrades for the card pool:
>
> - Unit Tests: shields orbiting CodeMask that smash bugs on contact.
>   More levels = more shields.
> - Code Review: every few seconds, a pulse wave around CodeMask that
>   damages and pushes back all nearby bugs.
> - Rubber Duck: a little duck companion that follows CodeMask and pecks
>   the nearest bug. Squeaks when it hits.
> - git revert: every 30 seconds, wipes all bugs on screen. Rare card.
>
> Also replace the emoji icons on all cards with small pixel-art icons
> drawn in code, matching the game's neon style.

Code Review sends a blue ring rolling out from CodeMask every 4 s (0.5 s faster per level, down to 1.5 s); every bug it reaches takes damage and gets shoved outward, harder the closer it was, using the same fly-apart push the Merge Conflict halves already had. The reach grows from 110 px by 15 px a level, and every third level adds a point of damage.

What broke: nothing broke. All three autoplay seeds survive the full 90 s again, including seed 1, which picked Code Review up to level 3.

Commit: `d14795f`

## 18:59 — Rubber Duck

> More upgrades for the card pool:
>
> - Unit Tests: shields orbiting CodeMask that smash bugs on contact.
>   More levels = more shields.
> - Code Review: every few seconds, a pulse wave around CodeMask that
>   damages and pushes back all nearby bugs.
> - Rubber Duck: a little duck companion that follows CodeMask and pecks
>   the nearest bug. Squeaks when it hits.
> - git revert: every 30 seconds, wipes all bugs on screen. Rare card.
>
> Also replace the emoji icons on all cards with small pixel-art icons
> drawn in code, matching the game's neon style.

Rubber Duck adds a little yellow pixel duck that follows behind CodeMask, then flies at the nearest bug within 170 px, pecks it (its beak opens wider), pops a yellow "squeak!" and flies back while its peck cools down. Each level pecks about 15% faster, and every other level adds a point of damage. The squeak is a pop-up like CLACK: the game has no sound at all yet.

What surprised me: I wrote `player.facingSign()` for which side the duck should trail on, a function that doesn't exist; caught it reading the code before the first run and used `player.lookX` instead. Also, two of the three autoplay seeds now die late in the run (seed 1 at 63 s with a level-1 duck, seed 7 at 81 s without one). Every new card shifts which cards the bot is offered and which it randomly picks, so its builds and its luck change from commit to commit.

Commit: `921d982`
