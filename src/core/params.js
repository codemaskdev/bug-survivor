// URL options: ?autoplay=1 runs the demo bot, ?seed=N picks the random seed.
const params = new URLSearchParams(location.search);
export const AUTOPLAY = params.get('autoplay') === '1';
export const SEED = Number(params.get('seed')) || 1;
