// The upgrade cards. Each one can be picked again to level it up.
// Icons are pixel art in ui/icons.js; the effects live where they're used
// (weapons/*.js, entities/player.js). `weight` makes a card rarer (default 1).
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
];
export const UP = Object.fromEntries(UPGRADES.map((u) => [u.key, u]));

export function resetUpgrades() {
  for (const u of UPGRADES) u.level = 0;
}
