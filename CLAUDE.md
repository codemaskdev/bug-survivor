# Bug Survivor — dev rules for this project

This game is being built on camera for a YouTube video. The git history
and DEVLOG.md are the raw material for the video script and code scenes.

## Tech
- Plain HTML5 + Canvas + vanilla JS ES modules. No frameworks, no build
  step, no npm deps.
- Run it with `npx serve` in this folder and open the printed URL
  (ES modules don't load from file://, so opening index.html directly
  no longer works).
- Code lives in src/: core (loop, input, rng, state), entities (player,
  commits, bugs/ with one file per species), weapons, upgrades, ai (the
  autoplay bot), fx, ui, world. New bug species go in src/entities/bugs/
  and get registered in bugs/index.js.
- The game must stay playable after every commit.

## Commits
- Commit after every meaningful step (one feature or one fix), never batch.
- Message format: `<type>: <what changed, in plain English>`
  types: feat, fix, tweak, refactor
  Example: `fix: bugs no longer walk through walls`
- Never squash, amend or rewrite history.
- After each feature/fix commit, update DEVLOG.md and commit it separately
  as `docs: devlog for <hash>`. These docs commits are ignored in the video.

## DEVLOG.md
After each commit, append an entry:
- Time (HH:MM)
- The user's prompt, copied verbatim in full (in a quoted block)
- What you did, in 2-3 plain sentences
- What broke or surprised you, if anything
- Commit hash
Be honest. Never invent or exaggerate problems for drama: if nothing
broke, write "nothing broke". Real failures matter, made-up ones ruin
the video.

## Replay check
- Run `node tools/replay-check.mjs` after every refactor. It replays the
  game headlessly (autoplay seeds 1, 2, 7 and a scripted human, 180 s each)
  and compares a hash of every canvas call against tools/replay-golden.json.
  A refactor must pass with no changes to the golden file.
- After an intentional gameplay or visual change, re-record the baseline
  with `node tools/replay-check.mjs --update` and commit the new golden
  file together with that change.

## Autoplay mode
- Opening index.html?autoplay=1 (via `npx serve`) starts a demo where the
  player moves and fights by itself, for recording gameplay footage.
- Autoplay must be deterministic: use a seeded random generator
  (seed from ?seed=..., default 1), never Math.random().