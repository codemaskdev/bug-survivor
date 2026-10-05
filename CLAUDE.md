# Bug Survivor — dev rules for this project

This game is being built on camera for a YouTube video. The git history
and DEVLOG.md are the raw material for the video script and code scenes.

## Tech
- Plain HTML5 + Canvas + vanilla JS. No frameworks, no build step, no npm deps.
- Must run by opening index.html in a browser.
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

## Autoplay mode
- Opening index.html?autoplay=1 starts a demo where the player moves and
  fights by itself, for recording gameplay footage.
- Autoplay must be deterministic: use a seeded random generator
  (seed from ?seed=..., default 1), never Math.random().