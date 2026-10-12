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
  scapGap: 5, scapLen: 19, scapSegs: 6, scapW: 5, scapGrav: 900, scapTrail: 4, scapLift: 5, scapInertia: 0.4, scapDamp: 0.9, scapDrape: 0.4,
  mouthX: 5, mouthY: -6,
  vortexNear: 6, vortexRange: 100, vortexH: 56, pullAccel: 900, pullMax: 420, catchDist: 8, shrinkTo: 0.3,
  inhaleMax: 4, fullSlow: 0.65, fullJump: 0.8, fullPuff: 1.2, cheekTime: 0.5, bellyR: 5, bellyStep: 2.5, bellyFwd: 2.5, bellyY: -10,
  squash: 0.35, squashTime: 0.15, crouch: 0.3,
};
// Belly of body frame n, relative to the feet (x forward, y up negative).
export const belly = n => n ? { x: 1 + C.bellyFwd * n, y: C.bellyY, rx: C.bellyR + C.bellyStep * n, ry: C.bellyR + 1 + C.bellyStep * 0.8 * n } : null;
