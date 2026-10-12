import { C } from './config.js';
// Monk: invisible physics box + drawn robe and head. States: idle, walk, jump, crouch.
export function makeMonk(scene, x, y) {
  const box = scene.add.rectangle(x, y, C.boxW, C.boxH, 0, 0);
  scene.physics.add.existing(box);
  box.body.setMaxVelocityY(C.maxFall).setCollideWorldBounds(true);
  const robe = scene.add.image(0, 0, 'robe').setOrigin(0.5, 1);
  const head = scene.add.image(0, 0, 'head').setOrigin(0.5, 1);
  const look = scene.add.container(x, y, [robe, head]);
  const m = { box, look, state: 'idle', coyote: 0, buffer: 0, t: 0, squash: 0, wasGround: true };
  m.update = (i, dt) => { move(m, i, dt); draw(m, robe, head, dt); };
  return m;
}
function move(m, i, dt) {
  const b = m.box.body, ground = b.blocked.down;
  const crouch = ground && i.down;
  const dir = crouch ? 0 : i.right - i.left;
  const a = dir ? (ground ? C.accel : C.airAccel) : C.decel;
  b.velocity.x = Phaser.Math.Linear(b.velocity.x, dir * C.walk, Math.min(1, a * dt / C.walk));
  m.coyote = ground ? C.coyote : m.coyote - dt;
  m.buffer = i.jumpPressed ? C.buffer : m.buffer - dt;
  if (m.buffer > 0 && m.coyote > 0) { b.velocity.y = -C.jump; m.buffer = m.coyote = 0; }
  const cut = -C.jump * C.jumpCut;
  if (!i.jump && b.velocity.y < cut) b.velocity.y = cut;
  if (ground && !m.wasGround) m.squash = Math.min(1, m.fallSpeed / C.maxFall);
  m.wasGround = ground; m.fallSpeed = b.velocity.y;
  if (dir) m.face = dir;
  m.state = !ground ? 'jump' : crouch ? 'crouch' : Math.abs(b.velocity.x) > 10 ? 'walk' : 'idle';
}
function draw(m, robe, head, dt) {
  const b = m.box.body;
  m.t += dt * (m.state === 'walk' ? C.bobRate : 0);
  if (m.state !== 'walk') m.t = Phaser.Math.Linear(m.t, Math.round(m.t / Math.PI) * Math.PI, 0.2);
  m.squash = Math.max(0, m.squash - dt / C.squashTime);
  const crouch = m.state === 'crouch' ? C.crouch : 0;
  const sq = m.squash * C.squash + crouch;
  m.look.setPosition(b.center.x, b.bottom);
  m.look.setScale((m.face || 1) * (1 + sq), 1 - sq);
  const bob = Math.abs(Math.sin(m.t)) * C.bob, late = Math.abs(Math.sin(m.t - C.headLag)) * C.bob;
  robe.y = -bob * 0.5;
  head.y = -robe.height + 3 - late * C.headBob;
  head.angle = Math.sin(m.t) * C.headTilt;
  robe.angle = m.state === 'jump' ? -b.velocity.y * C.leanAir : Math.sin(m.t * 2) * C.waddle;
}
