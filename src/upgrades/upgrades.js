// The upgrade cards. Each one can be picked again to level it up.
// Icons are pixel art in ui/icons.js; the effects live where they're used
// (weapons/linter.js, weapons/keyboard.js, entities/player.js).
export const UPGRADES = [
  {
    key: 'linter',
    name: 'Linter',
    level: 0,
    describe: (lv) => lv === 0
      ? 'Auto-fires a shot at the nearest bug every second.'
      : `Fires faster: every ${Math.pow(0.8, lv).toFixed(2)}s.`,
  },
  {
    key: 'mech',
    name: 'Mechanical Keyboard',
    level: 0,
    describe: () => 'Bigger swing arc, +1 damage, louder CLACK.',
  },
  {
    key: 'coffee',
    name: 'Coffee',
    level: 0,
    describe: () => 'CodeMask moves 15% faster.',
  },
];
export const UP = Object.fromEntries(UPGRADES.map((u) => [u.key, u]));

export function resetUpgrades() {
  for (const u of UPGRADES) u.level = 0;
}
