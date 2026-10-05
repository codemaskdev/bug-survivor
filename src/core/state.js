import { FIRST_WAVE_AT } from '../config.js';

// The run's shared state. Modules own their own bits (fx, swing, linter, bot),
// this is what everyone needs to see.
export const game = {
  state: 'playing',      // 'playing' | 'levelup' | 'over'
  bugs: [],
  wave: 0,
  nextWaveAt: FIRST_WAVE_AT,
  roundTime: 0,          // seconds since this run started
  overTime: 0,           // seconds since BUILD FAILED appeared
  nextBugId: 0,
  hitFlash: 0,           // red screen flash after taking damage
  smashed: 0,            // bugs smashed this run
  commits: [],           // green XP dots on the floor
  xp: 0,
  level: 1,
  levelupTime: 0,        // seconds since the upgrade cards appeared
  cardChoice: 1,         // highlighted card (0..2)
  offer: [],             // indexes into UPGRADES of the cards on screen
  botPick: -1,           // the card the autoplay bot is going to take
  bossPhase: false,      // true from 16:59: regular waves stop
};

export function resetState() {
  game.smashed = 0;
  game.commits = [];
  game.xp = 0;
  game.level = 1;
  game.bugs = [];
  game.wave = 0;
  game.nextWaveAt = FIRST_WAVE_AT;
  game.roundTime = 0;
  game.overTime = 0;
  game.hitFlash = 0;
  game.bossPhase = false;
  game.state = 'playing';
}
