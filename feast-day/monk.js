import { C } from './config.js';
// Monk: invisible physics box + drawn robe and head. States: idle, walk, jump, crouch, inhale, full (m.mode set by inhale.js).
export function makeMonk(scene, x, y) {
  const box = scene.add.rectangle(x, y, C.boxW, C.boxH, 0, 0);
  scene.physics.add.existing(box);
  box.body.setMaxVelocityY(C.maxFall).setCollideWorldBounds(true);
  const robe = scene.add.image(0, 0, 'robe').setOrigin(0.5, 1);
  const head = scene.add.image(0, 0, 'head').setOrigin(0.5, 1);
  const arms = [0, 1].map(() => scene.add.image(0, 0, 'arm').setOrigin(0.5, 0));
  const scap = [0, 1].map(() => scene.add.image(0, 0, 'scap').setOrigin(0.5, 0));
  const mouth = scene.add.image(0, 0, 'mouth').setVisible(false);
  const cheeks = scene.add.image(0, 0, 'cheeks').setVisible(false);
  const look = scene.add.container(x, y, [scap[0], arms[0], robe, scap[1], head, cheeks, mouth, arms[1]]);
  scap.forEach(p => { p.a = p.v = 0; });
  const m = { box, look, state: 'idle', coyote: 0, buffer: 0, t: 0, squash: 0, wasGround: true };
  m.update = (i, dt) => { move(m, i, dt); draw(m, robe, head, arms, scap, dt); face(m, head, mouth, cheeks); };
  return m;
}
function move(m, i, dt) {
  const b = m.box.body, ground = b.blocked.down;
  const crouch = ground && i.down && !m.mode, stop = m.mode === 'inhale';
  const full = m.mode === 'full', walk = C.walk * (full ? C.fullSlow : 1);
  const dir = crouch || stop ? 0 : i.right - i.left;
  const a = dir ? (ground ? C.accel : C.airAccel) : C.decel;
  b.velocity.x = Phaser.Math.Linear(b.velocity.x, dir * walk, Math.min(1, a * dt / walk));
  m.coyote = ground ? C.coyote : m.coyote - dt;
  m.buffer = i.jumpPressed && !stop ? C.buffer : m.buffer - dt;
  if (m.buffer > 0 && m.coyote > 0) { b.velocity.y = -C.jump * (full ? C.fullJump : 1); m.buffer = m.coyote = 0; }
  const cut = -C.jump * C.jumpCut;
  if (!i.jump && b.velocity.y < cut) b.velocity.y = cut;
  if (ground && !m.wasGround) m.squash = Math.min(1, m.fallSpeed / C.maxFall);
  m.wasGround = ground; m.fallSpeed = b.velocity.y;
  if (dir) m.face = dir;
  m.walking = ground && !crouch && Math.abs(b.velocity.x) > 10;
  m.state = m.mode || (!ground ? 'jump' : crouch ? 'crouch' : Math.abs(b.velocity.x) > 10 ? 'walk' : 'idle');
}
function draw(m, robe, head, arms, scap, dt) {
  const b = m.box.body;
  m.t += dt * (m.walking ? C.bobRate : 0);
  if (!m.walking) m.t = Phaser.Math.Linear(m.t, Math.round(m.t / Math.PI) * Math.PI, 0.2);
  m.squash = Math.max(0, m.squash - dt / C.squashTime);
  const crouch = m.state === 'crouch' ? C.crouch : 0;
  const sq = m.squash * C.squash + crouch;
  m.look.setPosition(b.center.x, b.bottom);
  m.look.setScale((m.face || 1) * (1 + sq), 1 - sq);
  const bob = Math.abs(Math.sin(m.t)) * C.bob, late = Math.abs(Math.sin(m.t - C.headLag)) * C.bob;
  robe.y = -bob * 0.5;
  head.y = -robe.height + 3 - late * C.headBob;
  head.angle = Math.sin(m.t) * C.headTilt;
  m.air = Phaser.Math.Linear(m.air || 0, m.state === 'jump' ? C.armAir : 0, Math.min(1, dt * C.armAirRate));
  arms.forEach((arm, k) => {
    const side = k ? 1 : -1;
    arm.setPosition(side, robe.y - robe.height + C.shoulder);
    arm.angle = side * Math.sin(m.t - C.armLag) * C.armSwing - side * m.air;
  });
  flap(m, scap, robe, dt);
  robe.angle = m.state === 'jump' ? -b.velocity.y * C.leanAir : Math.sin(m.t * 2) * C.waddle;
}
// Front and back panels hang on each side of the body; each stays on its own side and swings on its own spring.
function flap(m, scap, robe, dt) {
  const b = m.box.body, vx = b.velocity.x * (m.face || 1), vy = b.velocity.y;
  const trail = vx * C.scapTrail, lift = Math.max(0, vy) * C.scapLift + Math.max(0, -vy) * C.scapPress;
  scap.forEach((p, k) => {
    const side = k ? 1 : -1;
    p.setPosition(side * C.scapGap, robe.y - robe.height + C.shoulder);
    const lo = k ? -C.scapMax : 0, hi = k ? 0 : C.scapMax; // back swings back, front swings forward
    const target = Phaser.Math.Clamp(trail - side * lift, lo, hi);
    p.v += ((target - p.a) * C.scapSpring * (k ? C.scapOffbeat : 1) - p.v * C.scapDamp) * dt;
    p.a = Phaser.Math.Clamp(p.a + p.v * dt, lo, hi);
    p.angle = p.a;
  });
}
// Open mouth while inhaling; puffed cheeks and a wider head while full.
function face(m, head, mouth, cheeks) {
  const full = m.mode === 'full';
  head.scaleX = full ? C.fullPuff : 1;
  mouth.setVisible(m.mode === 'inhale').setPosition(head.x + C.mouthX, head.y + C.mouthY);
  cheeks.setVisible(full).setPosition(head.x + C.mouthX - 2, head.y + C.mouthY + 1);
}
