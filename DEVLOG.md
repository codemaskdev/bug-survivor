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

## 19:02 — git revert (rare)

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

git revert is the first rare card: it has a quarter of the normal weight in the pool and a gold frame with a RARE tag. Once picked, it fires 2 s later and then every 30 s (15% sooner per level, never under 12 s): a red flash and a scanline sweep up the arena, "$ git revert HEAD" pops up, and every bug on screen vanishes in red bits. Two calls I made myself: reverted bugs drop no commits (they "never happened", and it would be a huge XP fountain otherwise), and a "git revert in 12s" countdown sits at the bottom right of the HUD.

What surprised me: with seven upgrades the autoplay bot is weaker. In 180 s headless runs on five seeds it died first between 67 and 81 s in all five, where before this prompt it lasted the full 90 s. It picks cards at random, so its levels end up thinly spread. Also, the revert's red flash freezes under the upgrade cards when a level-up lands in the same moment, because effects pause with the game.

Commit: `2f20504`

## 19:14 — The world is endless

> I played it myself and it feels cramped. Let's make the world infinite.
>
> - The camera follows CodeMask, who stays near the center of the screen.
> - The world is endless: the neon grid scrolls with movement, no walls.
> - Bugs spawn just outside the visible screen, all around, not from
>   fixed edges.
> - Bugs that fall far behind off-screen get despawned (or respawned
>   closer), so the number of bugs stays under control.
> - HUD, banners and cards stay fixed on screen.
> - Update the autoplay bot for the open world, and make it pick cards
>   with priorities instead of randomly, so it survives longer.
>
> This is an intentional behavior change: after it works, re-record the
> replay-check baseline with --update.

CodeMask now lives in an endless world: a camera eases after it every step so it stays near the screen center, the neon grid is fixed to the world and scrolls by, and the walls are gone (the arena border too). Bugs appear at random points just outside the screen on all four sides; any bug that ends up more than 900 px from CodeMask is moved back to just off-screen, a wave stops spawning once 160 bugs are alive, and commits left 1400 px behind disappear. HUD, banners, cards and the git revert flash stay screen-fixed; the old ARENA_W/H constants became VIEW_W/H, since they now only mean the screen size.

What surprised me: the open world alone made the old bot survive much longer (four of five seeds lived the full 180 s), but it survives by running. On seed 2 it reached wave 15 with only 70 bugs smashed and level 3, which is dull footage. That's the next commit. In this one the bot only lost its wall logic and now wanders around CodeMask instead of around a fixed arena.

Commit: `8f61cb8`

## 19:25 — An autoplay bot for the open world

> I played it myself and it feels cramped. Let's make the world infinite.
>
> - The camera follows CodeMask, who stays near the center of the screen.
> - The world is endless: the neon grid scrolls with movement, no walls.
> - Bugs spawn just outside the visible screen, all around, not from
>   fixed edges.
> - Bugs that fall far behind off-screen get despawned (or respawned
>   closer), so the number of bugs stays under control.
> - HUD, banners and cards stay fixed on screen.
> - Update the autoplay bot for the open world, and make it pick cards
>   with priorities instead of randomly, so it survives longer.
>
> This is an intentional behavior change: after it works, re-record the
> replay-check baseline with --update.

The bot now fights in rhythm with its keyboard: while the swing is ready (and HP is above 40) it steps in until the nearest bug is in reach, while the swing recharges it backs off, and when 6+ bugs are within 120 px it just runs. On top of that it circles the nearby swarm so it can't be boxed in, dodges dashing loops and big leaks harder, grabs commits when it's calm, and strolls when nothing is around. Cards are chosen from a priority table (git revert first, then Linter, Code Review, Unit Tests, Mechanical Keyboard, Rubber Duck, Coffee), lowered by 12 per level already owned so it builds a core and then spreads out.

What surprised me: my first open-world bot circled the swarm at 150 px and barely fought (18–56 smashes in 180 s), because the keyboard only reaches about 60 px. I wrote a benchmark (time to first death and smashes, 8 seeds, 240 s) and compared versions. Before this prompt (arena, random cards) it averaged 86 s and 373 smashes, inflated by one seed that never died and made 1874; the open world with the old bot averaged 201 s but only 56 smashes, because it just ran. The final bot averages 157 s and 167 smashes. I tried five tuning variants: the HP > 40 rule gave the best mix (157 s, 167 smashes); running at 4 nearby bugs instead of 6 also lived longer (148 s) but fought much less (103 smashes); the other three landed at 131 s, 131 s and 123 s, against 123 s untuned, which is within the noise.

Commit: `c5c8462`

## 19:36 — Balance for a 3-minute run

> I played the open world: I usually die around wave 11, about one minute
> in. Everything piles on me at once.
>
> Balance target for a 3-minute run (FRI 16:57 → 17:00):
> - A decent player should usually survive until 16:59 (2:00) to meet
>   the boss, which will come next.
> - The first minute should feel manageable, the second minute intense.
> - Tune spawn rate, wave growth, bug HP and upgrade strength to hit this.
>   Don't make it trivial.
>
> Use the autoplay bot as a stand-in tester: report how long it survives
> before and after. Re-record the replay-check baseline after.

A wave no longer dumps all its bugs at once: they trickle in, shuffled, over its 6 seconds. Waves start smaller and grow faster later (Null Pointers per wave: 6 → 2 at wave 1, 24 → 7 at wave 10, 44 → 20 at wave 20), the extra species come one or two at a time, bug HP grows every 7 waves instead of 4, early Null Pointers are slower (full speed from 1:30), Null Pointer hits do 8 instead of 10, invulnerability after a hit is 1.0 s instead of 0.7 s, and Memory Leaks hit softer and bounce off further. Upgrade strength is unchanged. Autoplay bot, 8 seeds × 180 s, before → after: reached 2:00 in 5/8 → 8/8 runs, survived 3:00 in 3/8 → 5/8; bugs within 200 px per 30 s window went from 2, 13, 28, 33, 32, 29 to 0, 2, 6, 15, 23, 29, and damage taken in the first minute from 26 to 0.

What broke: my "human-like" tester. I gave the bot a 0.45 s reaction delay and random card picks so it died around 57 s on the old balance, like the real player. But on the new balance it still took most of its damage with only about 3 bugs nearby: the delay makes it charge blindly into bugs. So it measures clumsiness, not crowding, and never reached 2:00 in any version (median 57 s before, about 88 s after). I used crowd density instead: the player died at about 13 bugs nearby, and that now happens at the end of the second minute.

Commit: `4da3a0a`

## 19:43 — Burnout

> New upgrade card: Burnout.
>
> While CodeMask moves, it leaves a trail of fire behind it. Bugs that
> touch the fire take damage over time. Higher levels = longer, hotter
> trail.
>
> The catch: every level of Burnout reduces CodeMask's max HP by 10.
> Card text: "You're on fire. Literally." with "-10 max HP" in small
> red text.
>
> Draw the fire in the game's neon pixel style (orange-red, flickering).
> After adding it, check with the autoplay bot that the balance target
> still holds, and re-record the replay-check baseline.

Burnout drops a flickering pixel flame behind CodeMask every 0.05 s while it moves. A bug that touches one burns for 1.5 s with a little flame on its head (1.75 HP/s at level 1 up to 4.75 at level 5), and the trail lasts longer per level (1.2 s up to 2.8 s). Each level takes 10 max HP, shown as a charred segment at the end of the HP bar; the card caps at level 5 (max HP 50) through a new `maxLevel` field, because level 10 would have meant 0 max HP.

What broke: the first fire was too small and faint to read as fire, so the flames went from 4 to 7 pixels tall with a stronger glow. My first card text ("…Literally. Longer, hotter trail." at higher levels) wrapped to three lines and the red "-10 max HP" landed on top of "LV 3 → 4", so the card now always says just "You're on fire. Literally.". Balance (8 seeds × 180 s): with normal picks the bot reached 2:00 in 8/8 runs and survived 3:00 in 6/8, versus 8/8 and 5/8 before. But in the first two minutes of those 8 runs it took Burnout only once, so I also forced it to always take Burnout: still 8/8 at 2:00, but only 3/8 survived 3:00, with 510 bugs smashed instead of 286. Strong, but it costs you in the long run.

Commit: `cd5312a`

## 19:49 — The clock

> Final act: the Friday Deploy boss.
>
> Replace the timer with an in-game clock: the run starts at FRI 16:57
> and ends at 17:00 (3 real minutes).
>
> At 16:59 the arena flashes red, a siren plays, a "⚠ DEPLOYING ON FRIDAY"
> warning appears, and the boss enters: a giant angry pixel-art calendar
> page that says FRIDAY, neon red, matching the game's style.
>
> Attacks:
> - Hotfix: releases packs of small fast bugs
> - 500 Internal Server Error: throws red "500" blocks you have to dodge
> - Rollback: once, when low on HP, it heals back part of its health
>
> Three endings:
> - Boss defeated: "DEPLOYED TO PRODUCTION. Have a nice weekend!"
> - CodeMask dies: "BUILD FAILED"
> - Clock hits 17:00 with the boss alive: "WEEKEND RUINED. You're on call."
>
> Difficulty: a decent player should usually win on the 2nd or 3rd try.
> In autoplay, the bot fights the boss too.

First step of the boss prompt: a big clock at the top of the screen now reads FRI 16:57:00 at the start and ticks one in-game second per real second up to 17:00:00, turning red in the last minute. The BUILD FAILED screen says "crashed at FRI 16:58:12" instead of "survived 72.0s".

What broke: nothing broke.

Commit: `deeca6c`

## 19:52 — The Friday Deploy walks in

> Final act: the Friday Deploy boss.
>
> Replace the timer with an in-game clock: the run starts at FRI 16:57
> and ends at 17:00 (3 real minutes).
>
> At 16:59 the arena flashes red, a siren plays, a "⚠ DEPLOYING ON FRIDAY"
> warning appears, and the boss enters: a giant angry pixel-art calendar
> page that says FRIDAY, neon red, matching the game's style.
>
> Attacks:
> - Hotfix: releases packs of small fast bugs
> - 500 Internal Server Error: throws red "500" blocks you have to dodge
> - Rollback: once, when low on HP, it heals back part of its health
>
> Three endings:
> - Boss defeated: "DEPLOYED TO PRODUCTION. Have a nice weekend!"
> - CodeMask dies: "BUILD FAILED"
> - Clock hits 17:00 with the boss alive: "WEEKEND RUINED. You're on call."
>
> Difficulty: a decent player should usually win on the 2nd or 3rd try.
> In autoplay, the bot fights the boss too.

At 16:59 the regular waves stop, the screen pulses red, a siren plays (the game's first sound: two detuned sawtooth oscillators via Web Audio, no files), "⚠ DEPLOYING ON FRIDAY" with "git push --force origin main" fills the middle of the screen, and the boss walks in from the top: a 130×150 px neon-red calendar page with binder rings, a FRIDAY header and an angry face, with its own health bar under the clock. It's registered as a bug type outside the waves, so every weapon already hits it; git revert can't wipe it, and if you outrun it, it speeds up instead of teleporting. The replay check now runs the full 180 s so the boss is covered (about 44 s instead of 10).

What broke: the first boss was almost always white, because the hit flash painted the whole page and something (shields, Linter, keyboard) hits it nearly every frame; now only the frame flashes. And my first sound module added its own keydown listener to unlock audio, which would have replaced the game's input handler inside the replay check's stub (it keeps one handler per event); caught it before running and moved the unlock into the existing input handler.

Commit: `eb71929`
