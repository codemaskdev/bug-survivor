// Shared tuning numbers. Species-specific numbers live in their own files.

export const VIEW_W = 960;         // visible screen size; the world itself is endless
export const VIEW_H = 640;
export const GRID = 40;
export const PIXEL = 3;            // size of one sprite pixel on screen
export const PLAYER_SPEED = 180;   // px per second
export const STEP = 1 / 60;        // fixed simulation step (keeps autoplay deterministic)

export const PLAYER_MAX_HP = 100;
export const PLAYER_RADIUS = 14;   // hitbox
export const HIT_COOLDOWN = 0.7;   // seconds of invulnerability after a hit

export const BUG_PIXEL = 2;
export const BUG_SPEED = 125;      // fast, but CodeMask can still outrun them
export const BUG_DAMAGE = 10;
export const FIRST_WAVE_AT = 1.5;  // seconds
export const WAVE_EVERY = 6;       // seconds between waves

export const SWING_TIME = 0.16;     // how long the keyboard arc lasts
export const SWING_COOLDOWN = 0.45; // from the start of one swing to the next
export const SWING_REACH = 64;      // px from CodeMask's center
export const SWING_ARC = Math.PI * 0.75; // 135° in front of CodeMask

export const COMMIT_PICKUP = 16;    // px: walking this close collects a commit
export const COMMIT_MAGNET = 70;    // px: commits start drifting toward CodeMask
export const LINT_SPEED = 420;      // px per second
export const LINT_RANGE = 520;      // px before a shot fizzles out
