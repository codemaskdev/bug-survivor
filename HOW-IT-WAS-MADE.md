# How Bug Survivor was made

Watch the episode: https://youtu.be/bjO87HmSDnk

Bug Survivor was built in one evening with
[Claude Code](https://claude.com/claude-code): 15 prompts, from about
18:10 to 21:15. No line of the code was written by hand.

The prompts below come from the Claude Code session transcript. Long
ones are trimmed, and every cut is marked […]. "What went wrong" comes
from [DEVLOG.md](DEVLOG.md), the git history and the transcript. The
failures are the most useful part, so they're all kept.

Times are local, on the day of the build.

## What I'd tell you before you start

- **Make the demo deterministic.** A seeded bot that always plays the
  same game becomes your test (chapter 8).
- **Make refactors prove nothing changed.** Record a baseline first and
  compare after (chapter 5).
- **Give feedback with numbers.** "I usually die around wave 11, about
  one minute in" is something Claude can tune against (chapter 3).
- **The bot is a proxy, not a player.** Twice it couldn't reproduce how
  I died (chapter 3).
- **Check the AI's devlog.** Claude corrected its own 10 times, once for
  a bug that never happened (chapter 4).

## Before the first prompt: the rules

The folder started with a [CLAUDE.md](CLAUDE.md), the file Claude Code
reads at the start of every session. It set the ground rules:

- plain HTML5 + Canvas + vanilla JavaScript, no frameworks, no build step;
- the game must stay playable after every commit;
- one commit per feature or fix, and an entry in DEVLOG.md after each one;
- an autoplay demo (`?autoplay=1`) for recording footage, which must be
  deterministic: a seeded random generator, never `Math.random()`.

That last rule turned out to matter far more than it looks (chapter 8).

One rule was rewritten early on. The first version said:

> Be honest about failures and retries: they are the best part of the video.

The new version, committed at 18:36, in the middle of the build:

> Be honest. Never invent or exaggerate problems for drama: if nothing
> broke, write "nothing broke". Real failures matter, made-up ones ruin
> the video.

Over the evening, Claude went back and corrected its own devlog 10
times: wrong numbers, a result attributed to the wrong cause, and once a
"bug" it had actually prevented before testing (chapter 4). Each
correction is a separate commit, because the rules also forbid
rewriting history.

## 1. First playable

**18:09**

> Let's build a game called Bug Survivor.
>
> Start with just the basics: a dark arena with a subtle neon grid, and the
> player character — a tiny pixel-art version of me, CodeMask: black hoodie,
> dark face, two glowing cyan pixel eyes. Move with WASD or arrow keys.
>
> Keep it simple for now. We'll add enemies next.

**18:12**

> Now add the first enemy: Null Pointer bugs.
>
> They're small, fast, and spawn in waves from the edges of the arena,
> crawling straight toward CodeMask. Make them look like little glitchy
> red-pink bugs.
>
> If one touches CodeMask, it deals damage. Give CodeMask a health bar,
> and when it hits zero, show "BUILD FAILED" and let me restart.

**What Claude Code produced:** an `index.html` and a `game.js`: a dark
canvas arena with a softly pulsing neon grid, CodeMask as a 12×13 pixel
sprite, then Null Pointer waves crawling in from the edges, a health
bar, and BUILD FAILED with R to restart.

**What went wrong:**

- A pure black hoodie on a black arena was invisible. The sprite got a
  dark outline. (The same problem came back much later, see chapter 6.)
- The glitch effect on the bugs was meant to hit about 12% of frames and
  hit 62%. A hash returned a *signed* 32-bit number, so every negative
  value counted as "glitch". One `>>> 0` fixed it.
- Pressing R on BUILD FAILED did nothing. A quick tap pressed and released
  the key between two simulation steps, so the game never saw it. Key
  presses are now latched until the game reads them.

## 2. Fighting back

**18:17**

> CodeMask needs a way to fight back. Give it a keyboard.
>
> Pressing Space (or J) swings a keyboard in a short arc in front of
> CodeMask, in the direction it's facing. Bugs caught in the swing get
> smashed. Make it feel good: a "CLACK!" pop-up, a few keycaps flying
> off, a tiny screen shake.
>
> Add a short cooldown so you can't just spam it. In autoplay, the bot
> should swing when bugs get close.

**What Claude Code produced:** Space or J swings a pixel keyboard through
a 135° arc, with "CLACK!" pop-ups, spinning keycaps with letters on them,
screen shake and a 0.45 s cooldown. In autoplay the bot swings at
whatever comes close.

**What went wrong:**

- Space was also the restart key, so holding it while dying skipped the
  BUILD FAILED screen entirely. Restart moved to R or Enter.
- Claude couldn't test with real key presses: the browser tab was in the
  background, where the game loop doesn't run. It stepped the game by
  hand and fired synthetic key events instead.

## 3. Leveling and balance

This chapter took six prompts spread over the whole evening, because
balance kept breaking as the game grew.

**18:24**

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

**18:49**, sent while Claude was still working on the previous prompt:

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

**19:09**

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

**19:30**

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

**19:39**

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

**21:10**

> Balance problem: I can only reach the boss by running away the whole
> time. When I actually fight, I die around wave 19, just before 16:59.
> Fighting should be the winning strategy, not running.
>
> - Calm before the storm: from about 16:58:45, stop spawning new bugs,
>   let the arena clear, then the siren at 16:59.
> - Coffee break: when the boss appears, restore 30% of CodeMask's HP,
>   with a little "☕ coffee break" pop-up.
> - Soften waves 15–20 a bit, that's where I die.
> - Reward aggression: bugs smashed by the keyboard drop extra commits.
>
> Goal: a player who actively fights usually reaches the boss. Test it
> with the autoplay bot in its fighting style, not the running one.
> Re-record the replay-check baseline after.

**What Claude Code produced:** commits as XP with a level-up card screen;
eight upgrades in all (seven from the 18:24 and 18:49 prompts, with
pixel-art icons drawn in code, plus Burnout, which trades max HP for a
trail of fire); an endless scrolling world; waves that trickle in
instead of dropping all at once; and, at the end, a calm before the
boss, a coffee-break heal and double commits for keyboard kills.

**What went wrong:**

- **Too much juice.** At Mechanical Keyboard level 3, three overlapping
  giant "CLACK!!!!" pop-ups and heavy shake made the screen unreadable.
  Pop-ups and shake are now capped.
- **Every new card made the bot worse.** It picked cards at random, so
  its levels spread thin. With seven upgrades it died between 67 and
  81 seconds on all five test seeds. That's why the open-world prompt
  asks for card priorities.
- **Claude called a function that doesn't exist** (`player.facingSign()`,
  for the duck) and caught it by rereading the code before the first run.
- **The open world made the old bot a coward.** It survived by running:
  wave 15 with only 70 bugs smashed, which is dull footage. The first new
  bot circled the swarm at 150 px while the keyboard only reaches about
  60 px, so it barely fought. Claude wrote a benchmark (8 seeds,
  survival time and smashes) and tuned the bot against it.
- **A fake player that measured the wrong thing.** To balance for me,
  Claude built a "human-like" bot with a 0.45 s reaction delay and random
  card picks. It died around 57 seconds, like I did, but for a different
  reason: the delay made it charge blindly into bugs. It measured
  clumsiness, not crowding. Claude switched to measuring how many bugs
  were near me when I died (about 13) and tuned so that only happens at
  the end of the second minute.
- **Burnout's first fire was too small and faint to read as fire**, and
  the card text wrapped onto the red "-10 max HP" line.
- **Fixes that stack.** For the 21:10 prompt, the normal bot couldn't
  reproduce my problem: it already reached the boss in 15 of 16 runs.
  Claude built a test-only fighter that never runs away; on the old
  balance it reached the boss in 6 of 16 runs, like me. After the four
  changes it got there in 12 of 16. But together they made the boss easy
  for the demo bot: it now won 16 of 16 fights, up from 8. Claude
  reported that and left the call to me instead of quietly retuning the
  boss.

**What I decided:** my answer isn't in the transcript, but I never asked
for a retune, and no later commit changes the boss's balance. The bot
kept winning; I didn't.

## 4. The bug zoo

**18:30**

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

**What Claude Code produced:** three new species, each with its own shape
and color, and a "NEW BUG" banner the first time each one shows up.
Memory Leak is a purple blob with googly eyes that grows from 8 to 34 px;
Infinite Loop is an orange ring that orbits and then dashes; Merge
Conflict splits into two smaller ones when hit.

**What went wrong:** very little in the game. A headless test showed that
bugs spawned at "wave 0" got 0 HP, harmless but now clamped.

The real failure was in the devlog. The first entry described the Merge
Conflict split as something that broke. It hadn't: Claude had designed
around the problem before testing. It corrected the entry in a separate
commit: "It didn't. I prevented it before testing."

## 5. The 29-file refactor

**18:35** (the first line was about my edit to CLAUDE.md)

> commit claude.md also
>
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

**What Claude Code produced:** the 1584-line `game.js` split into 29 ES
modules under `src/`, with one file per bug species and a registry for
adding new ones. Before touching anything, it recorded a black-box
baseline: the real game loop running for 90 seconds headlessly, with
every one of 15.7 million canvas calls hashed, for three autoplay seeds
and a scripted keyboard-and-mouse player. After the refactor all four
hashes matched on the first try. A deliberate one-character change to
the screen shake changed the hash, which proved the check works.

**What went wrong:**

- One scare: a browser check showed 278 bugs smashed instead of 276. The
  old `game.js` gave 285 when checked the same way: the test had started
  counting a few frames late. Not a refactor bug.
- The price of modules: browsers don't load ES modules from `file://`,
  so "just open index.html" stopped working. The game now needs a local
  server (`npx serve`), and CLAUDE.md says so.

## 6. The Friday Deploy boss

**18:47**

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

**What Claude Code produced:** a clock from FRI 16:57 to 17:00; at 16:59
a red alarm, a siren, "⚠ DEPLOYING ON FRIDAY", and a giant angry calendar
page that throws Hotfix packs and "500" blocks and heals once with
Rollback; three ending screens.

**What went wrong:** the longest fight of the evening.

- The first boss was almost always white. The hit flash painted the
  whole sprite, and something hits the boss nearly every frame.
- The bot treated the huge boss as danger and kept its distance. The
  boss sat at 369/400 HP for the entire fight.
- Tuning for "win on the 2nd or 3rd try" took round after round of 16
  test runs each. First version: 0 wins; the bot was in swing range only
  1–13% of the fight. Pulling it harder toward the boss: still 0 wins.
  The cause was two hidden bugs: the boss's Hotfix packs made the bot
  think it was surrounded the whole fight, and every hit stunned the boss
  for 0.15 s, so the shields, the Linter and the duck kept it frozen in
  place. Fixing both: 0 wins, 11 deaths. Lower boss HP and softer hits:
  1 win. Then measuring where the damage came from: the three "500"
  blocks left gaps of about 5 px, a wall nobody could slip through, and
  their hitbox was 8–10 px bigger than the drawing. Making them
  dodgeable: 6 wins. Boss HP 210: 8 wins out of 16.
- Claude was clear that aiming for about 50% for the bot was a judgment
  call, not a measurement of humans.

Then I played it, and sent a polish pass (**20:21**):

> Polish pass:
> […]
> 2. Mini-CodeMask is too dim and gets lost among colorful bugs. Make
>    him instantly findable, matching my big avatar's style:
>    - bright cyan neon outline around the black hoodie
>    - two cyan hoodie drawstrings
>    - bigger eyes: small pixel-art trapezoids like my avatar's, glowing
>    - a soft cyan glow and a ground ring under him
>    Cyan is the hero's color: make sure no bug uses it as a main color.
>
> 3. Bug: if a git revert flash coincides with a level-up, the red flash
>    freezes under the cards. Fix it.
>
> 4. The boss siren is too harsh and startling, especially in
>    headphones. Make it softer: lower volume, smoother tone, gentle
>    fade in and out. Tense, not scary.
> […]

The hero had become hard to find again, the same problem as in chapter 1.
When Claude measured every new sound offline, two of the ending jingles
turned out to be five times quieter than the victory fanfare; they were
raised.

## 7. Pair Programmer backup

**20:43**

> I keep losing to Friday Deploy. I'm calling backup.
>
> Add a Pair Programmer: a buff pixel-art bro in a hoodie with two
> orange machine guns, contrasting with cyan CodeMask.
>
> - He unlocks only after you lose to the boss at least once.
> - During the boss fight, press B to call him, once per run.
>   Show a hint "Press B — call your Pair Programmer" when available.
> - He drops in with a big entrance, follows CodeMask, and unloads both
>   machine guns at the boss and bugs for 15 seconds, then leaves.
> - Without him the boss stays as hard as it is now.
>
> Don't rename him to anything else, and don't use any real company logos.

**What Claude Code produced:** a 72×63 px pixel bro with shades, a beard
and an orange neon outline, who unlocks after you lose to the boss. Press
B in the fight and he drops in with a shockwave, fights at CodeMask's
side for 15 seconds, and leaves with "brb, standup".

**What went wrong:**

- The first sprite was CodeMask's size and looked hunched. He got bigger,
  with real shoulders.
- The orange guns melted into his orange outline and needed a dark one.
  Guns aimed upward behind his body vanished completely; that was undone.
- At first he barely helped: one or two extra wins out of 16. His shots
  at the boss kept hitting small bugs on the way (26–42 damage out of a
  possible 90). Shots that punch through small bugs, and a faster fire
  rate: 12 wins out of 16.
- Just before this prompt I pasted the previous polish prompt a second
  time by mistake. Claude noticed it was the same request and started by
  checking whether anything had changed; I stopped it and sent this one.

With backup, the bot won 12 of 16 fights at this point. After the
balance changes at 21:10 the demo bot won 16 of 16 (chapter 3). I
recorded two attempts at the finished game for the episode and lost
both: BUILD FAILED the first time, before my backup even got his turn,
and WEEKEND RUINED the second time, with him.

## 8. The autoplay bot and the replay check

The autoplay demo was in the rules from the start, only so I could record
gameplay footage. Several prompts include a line for it ("In autoplay, the
bot should swing when bugs get close", "In autoplay, the bot picks a card
on its own", "In autoplay, the bot fights the boss too"). Because it had
to be deterministic, the same seed always plays the same game, and that
turned the bot into a test harness.

For the refactor (chapter 5) Claude wrote a throwaway checker that
replays the game headlessly and hashes everything it draws. At the end
it mentioned that the checker only lived in a temporary folder, offered
to add it to the repo, and said it hadn't done so because I hadn't asked.
I said yes:

**18:48**

> Yes, add the replay check to tools/replay-check.mjs with the golden
> hashes in a file next to it. Add an --update flag to re-record the
> baseline after intentional changes. Mention it in CLAUDE.md: run it
> after every refactor.

**What Claude Code produced:** `tools/replay-check.mjs`. It replays the
game headlessly with stubbed browser APIs (autoplay seeds 1, 2 and 7,
plus a scripted human), hashes every canvas call and compares the result
with `tools/replay-golden.json`. A refactor has to pass without changing
the golden file; after a deliberate change, `--update` records a new one.

**What went wrong:**

- The checker's own summary dropped the upgrades line. Claude found and
  fixed that bug in its own tool; the hashes were never affected.
- The checker's fake browser kept only one listener per event. When the
  boss brought sound, Claude's first version added a second key listener,
  which would have silently replaced the game's input in the replay. It
  caught that before running.
- The bot is a proxy, not a player. Twice it failed to reproduce what I
  felt (chapter 3), and Claude had to build special test-only bots to
  match my deaths.

## Epilogue: the next day

The game was done; the next day was about letting strangers play it.

**13:38**

> The game is going public: players will arrive from a YouTube link
> and know nothing about it. Add:
>
> 1. Start screen: game title, controls (WASD/arrows move, Space/J
>    swing, B call Pair Programmer in the boss fight, M mute, Esc
>    pause), "Press Space to start". Behind it, the autoplay bot plays
>    as an attract-mode demo, dimmed.
> 2. Pause menu on Esc: Resume, Restart, Sound on/off.
> 3. On the start screen: "Built entirely by Claude Code — no
>    hand-written code" and a "Watch how it was made" link, URL as a
>    placeholder constant VIDEO_URL that I'll fill in after upload.
> 4. Touch devices: instead of the game, a clear message that it needs
>    a keyboard, with the same video link.
> 5. Personal best: best survival time and most bugs smashed, saved in
>    localStorage, shown on the start and end screens. New record =
>    a little celebration.
>
> Keep the neon pixel style. ?autoplay=1 must skip the menu and behave
> exactly as before, so the replay-check stays green and footage
> recording still works. Commit as usual.

**What Claude Code produced:** a start screen with the bot playing a
dimmed demo behind it, a pause menu, a "this game needs a keyboard" page
for phones, and personal bests with confetti for a new record. With
`?autoplay=1` all of it is skipped: the three autoplay seeds in the
replay check kept their exact hashes through every step.

**What went wrong:**

- Before any menu code, the replay check's fake browser had to learn to
  keep more than one listener per event (the same limit as in chapter 8).
- The first layout put the controls in the middle of the screen, exactly
  where the camera keeps CodeMask, so the demo was hidden under text.
  The controls moved to a strip at the bottom.
- The pause menu's buttons sit on top of the upgrade cards, so clicking
  Resume would also have picked the card under the mouse. After a pause
  the cards now ignore clicks for 0.3 s.
- A ⌨ symbol on the phone page rendered as a meaningless bar and was
  removed. Claude couldn't emulate a real touch screen and checked that
  page by squeezing it to 375 px wide instead.

**13:54**, answering Claude's suggestion at the end of its report:

> yes, add auto-pause when switching tabs

**What Claude Code produced:** switching to another tab or window now
opens the pause menu.

**What went wrong:** the replay check's scripted player already switches
away from the window halfway through. Now that pauses the game, and its
next scripted Space press hits Resume instead of swinging, so the whole
run played out differently (it died at 56.5 s instead of 67.2 s).
Claude traced every restart to make sure that was the only reason before
re-recording that scenario.

**13:58**

> Prepare Bug Survivor for public release, without touching the
> CodeMask repo's history:
>
> 1. Use git subtree split on game/bug-survivor to create a standalone
>    repo with the game's full commit history, in a new folder next to
>    CodeMask (e.g. ~/Desktop/bug-survivor-release).
> 2. Make it work on GitHub Pages: the game must load from index.html
>    at the repo root over https (ES modules are fine there).
> 3. Write a short README: what the game is, controls (WASD/arrows,
>    Space/J, B for Pair Programmer, M mute, R restart), "built
>    entirely by Claude Code, no hand-written code", link to DEVLOG.md
>    and CLAUDE.md as the rules the AI followed, MIT license.
> 4. Remove nothing from history. Check that no secrets, API keys or
>    local paths are anywhere in the files or history.
> 5. Don't push yet. Tell me the exact commands to create the GitHub
>    repo and enable Pages, and I'll run them.
>
> The repo will live in my GitHub organization codemaskdev, as
> codemaskdev/bug-survivor. Use that in the commands and in the
> README links. The game URL will be
> https://codemaskdev.github.io/bug-survivor/

**What Claude Code produced:** a standalone repo with all 86 commits of
the game's history, split in a throwaway copy so the original repo
wasn't touched; a README, the MIT license and a `.nojekyll` file. It
checked all 276 module imports for exact letter case (GitHub Pages cares,
macOS doesn't), served the files under `/bug-survivor/` the way Pages
would, and scanned every version of every file for secrets: none.

**14:08** (a few prompts about commit authorship in between are left out)

> push it yourself and enable Pages

**What Claude Code produced:** the repo on GitHub, Pages switched on, and
a check of the live site over https: every module loaded, no errors.

**16:40**

> In ~/Desktop/bug-survivor-release, set VIDEO_URL in src/config.js to:
> https://youtu.be/bjO87HmSDnk
>
> Check that the menu link opens it in a new tab, run tools/replay-check.mjs to make sure nothing else changed, then commit with message "Link episode 01 video" and push to main. Tell me when GitHub Pages has redeployed and the live menu shows the link.

**What Claude Code produced:** the link set, a click on it in the local
menu (it opened the video in a new tab), a replay check with all hashes
unchanged, the commit with my exact message, a push, and the same click
on the live site once Pages had rebuilt.

**What went wrong:** nothing broke.

## Try it yourself

Start with an empty folder and a CLAUDE.md with your rules (feel free to
copy [this one](CLAUDE.md)). Then send these, in order. They're the real
prompts from this build; swap CodeMask for your own character.

1. The arena and the hero:

> Let's build a game called Bug Survivor.
>
> Start with just the basics: a dark arena with a subtle neon grid, and the
> player character — a tiny pixel-art version of me, CodeMask: black hoodie,
> dark face, two glowing cyan pixel eyes. Move with WASD or arrow keys.
>
> Keep it simple for now. We'll add enemies next.

2. The first enemy:

> Now add the first enemy: Null Pointer bugs.
>
> They're small, fast, and spawn in waves from the edges of the arena,
> crawling straight toward CodeMask. Make them look like little glitchy
> red-pink bugs.
>
> If one touches CodeMask, it deals damage. Give CodeMask a health bar,
> and when it hits zero, show "BUILD FAILED" and let me restart.

3. A way to fight back:

> CodeMask needs a way to fight back. Give it a keyboard.
>
> Pressing Space (or J) swings a keyboard in a short arc in front of
> CodeMask, in the direction it's facing. Bugs caught in the swing get
> smashed. Make it feel good: a "CLACK!" pop-up, a few keycaps flying
> off, a tiny screen shake.
>
> Add a short cooldown so you can't just spam it. In autoplay, the bot
> should swing when bugs get close.

4. Progression:

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

5. Before it gets big, a refactor that has to prove nothing changed:

> […]
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

6. The boss:

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
> […]
> Difficulty: a decent player should usually win on the 2nd or 3rd try.
> In autoplay, the bot fights the boss too.

After each one, play it yourself and tell Claude what you saw, with
numbers:

> I played the open world: I usually die around wave 11, about one minute
> in. Everything piles on me at once.
> […]
