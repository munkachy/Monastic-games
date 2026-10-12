// Every feel number lives here (pixels, seconds). Ratios after Kirby.
export const W = 480, H = 270;
export const C = {
  gravity: 825, maxFall: 456,
  walk: 290, accel: 896, decel: 675, airAccel: 477,
  jump: 479, jumpCut: 0.45,   // releasing early keeps this share of upward speed
  coyote: 0.07, buffer: 0.07, // late jump / early jump
  boxW: 16, boxH: 30,
  bobRate: 14, bob: 2, headBob: 1.74, headLag: 0.9, headTilt: 4.72, waddle: 6.27, leanAir: 0.012,
  armSwing: 25, armLag: 0.5, armAir: 95, armAirRate: 18, shoulder: 3,
  scapGap: 5, scapTrail: 0.227, scapLift: 0.247, scapPress: 0.04, scapMax: 100, scapSpring: 185, scapDamp: 9, scapOffbeat: 0.7,
  squash: 0.35, squashTime: 0.15, crouch: 0.3,
};
