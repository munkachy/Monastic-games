// Every feel number lives here (pixels, seconds). Ratios after Kirby.
export const W = 480, H = 270;
export const C = {
  gravity: 1100, maxFall: 400,
  walk: 135, accel: 1400, decel: 900, airAccel: 900,
  jump: 470, jumpCut: 0.45,   // releasing early keeps this share of upward speed
  coyote: 0.07, buffer: 0.07, // late jump / early jump
  boxW: 16, boxH: 30,
  bobRate: 14, bob: 2, headBob: 1.5, headLag: 0.9, headTilt: 4, waddle: 3, leanAir: 0.012,
  armSwing: 25, armLag: 0.5, armAir: 60, armAirRate: 0.15, shoulder: 3,
  squash: 0.35, squashTime: 0.15, crouch: 0.3,
};
