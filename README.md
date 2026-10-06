# Bug Survivor

**▶ Play: https://codemaskdev.github.io/bug-survivor/**

How it was made → [HOW-IT-WAS-MADE.md](HOW-IT-WAS-MADE.md)

It's Friday, 16:57. Three minutes until the weekend, and the bugs are
coming. Bug Survivor is a short neon pixel-art survivor game: you are
CodeMask, armed with a keyboard. Smash Null Pointers, Memory Leaks,
Infinite Loops and Merge Conflicts, pick up the commits they drop to
level up, choose upgrades (Linter, Unit Tests, Code Review, a rubber
duck…), and at 16:59 survive the boss: the Friday Deploy.

A run lasts three minutes. It runs in the browser and needs a keyboard.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | move |
| Space / J | swing the keyboard |
| 1 / 2 / 3 or click | pick an upgrade card |
| B | call the Pair Programmer during the boss fight (unlocks after you lose to the boss once) |
| M | mute / unmute |
| Esc | pause |
| R | restart after a run ends |

## Built entirely by Claude Code

Every line of code in this repo was written by
[Claude Code](https://claude.com/claude-code). No hand-written code.
The game was built on camera for the CodeMask YouTube channel, one
prompt at a time, and the full commit history is kept.

- [DEVLOG.md](https://github.com/codemaskdev/bug-survivor/blob/main/DEVLOG.md):
  every prompt, copied verbatim, with what the AI did and what broke.
- [CLAUDE.md](https://github.com/codemaskdev/bug-survivor/blob/main/CLAUDE.md):
  the rules the AI followed (no frameworks, one commit per step, an
  honest devlog, a replay check after every refactor).

The game was developed inside the channel's workspace repo and split
out with its full history, so the first commit's message is about that
workspace, and CLAUDE.md mentions sibling folders (Avatar/, episodes/)
that aren't part of this repo.

## Run it locally

Plain HTML5 Canvas and vanilla JavaScript modules, no build step and no
dependencies. Modules don't load from `file://`, so serve the folder:

```sh
npx serve
```

and open the printed URL.

- `?autoplay=1&seed=42`: a bot plays a deterministic demo round.
- `node tools/replay-check.mjs`: replays the game headlessly and checks
  that a refactor didn't change a single frame.

## License

[MIT](https://github.com/codemaskdev/bug-survivor/blob/main/LICENSE)
