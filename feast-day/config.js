// Every feel number lives here (pixels, seconds). Ratios after Kirby.
export const W = 480, H = 270;
export const C = {
  gravity: 1100, maxFall: 400,
  walk: 135, accel: 1400, decel: 900, airAccel: 900,
  jump: 470, jumpCut: 0.45,   // releasing early keeps this share of upward speed
  coyote: 0.07, buffer: 0.07, // late jump / early jump
};
