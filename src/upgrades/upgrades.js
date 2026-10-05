// The upgrade cards. Each one can be picked again to level it up.
// Icons are pixel art in ui/icons.js; the effects live where they're used
// (weapons/*.js, entities/player.js). `weight` makes a card rarer (default 1),
// `maxLevel` takes it out of the pool once reached, `drawback` is shown in red.
export const UPGRADES = [
  {
    key: 'linter',
    name: 'Linter',
    short: 'LINTER',
    level: 0,
    describe: (lv) => lv === 0
      ? 'Auto-fires a shot at the nearest bug every second.'
      : `Fires faster: every ${Math.pow(0.8, lv).toFixed(2)}s.`,
  },
  {
    key: 'mech',
    name: 'Mechanical Keyboard',
    short: 'MECH',
    level: 0,
    describe: () => 'Bigger swing arc, +1 damage, louder CLACK.',
  },
  {
    key: 'coffee',
    name: 'Coffee',
    short: 'COFFEE',
    level: 0,
    describe: () => 'CodeMask moves 15% faster.',
  },
  {
    key: 'tests',
    name: 'Unit Tests',
    short: 'TESTS',
    level: 0,
    describe: (lv) => lv === 0
      ? 'Two shields orbit CodeMask and smash bugs on contact.'
      : `One more orbiting shield (${Math.min(8, lv + 2)} total).`,
  },
  {
    key: 'review',
    name: 'Code Review',
    short: 'REVIEW',
    level: 0,
    describe: (lv) => lv === 0
      ? 'Every 4s a pulse damages and pushes back nearby bugs.'
      : `Pulses every ${Math.max(1.5, 4 - lv * 0.5)}s, reaches further.`,
  },
  {
    key: 'duck',
    name: 'Rubber Duck',
    short: 'DUCK',
    level: 0,
    describe: (lv) => lv === 0
      ? 'A duck buddy follows you and pecks the nearest bug.'
      : 'The duck pecks faster and harder. Squeak!',
  },
  {
    key: 'burnout',
    name: 'Burnout',
    short: 'BURNOUT',
    maxLevel: 5,
    drawback: '-10 max HP',
    level: 0,
    describe: () => "You're on fire. Literally.",
  },
  {
    key: 'revert',
    name: 'git revert',
    short: 'REVERT',
    rare: true,
    weight: 0.25,
    level: 0,
    describe: (lv) => lv === 0
      ? 'Every 30s, wipes every bug on screen.'
      : `Reverts more often: every ${Math.round(Math.max(12, 30 * Math.pow(0.85, lv)))}s.`,
  },
];
export const UP = Object.fromEntries(UPGRADES.map((u) => [u.key, u]));

export function resetUpgrades() {
  for (const u of UPGRADES) u.level = 0;
}
