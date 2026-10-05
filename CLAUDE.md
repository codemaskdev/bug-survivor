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

## DEVLOG.md
After each commit, append an entry:
- Time (HH:MM)
- What the user asked for (one line, their words)
- What you did
- What broke or surprised you, if anything
- Commit hash
Be honest about failures and retries: they are the best part of the video.

## Autoplay mode
- Opening index.html?autoplay=1 starts a demo where the player moves and
  fights by itself, for recording gameplay footage.
- Autoplay must be deterministic: use a seeded random generator
  (seed from ?seed=..., default 1), never Math.random().