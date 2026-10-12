import { C } from './config.js';
import { makeScapular, flap } from './scapular.js';
// Monk: invisible physics box + drawn robe and head. States: idle, walk, jump, crouch, inhale, full (m.mode set by inhale.js).
export function makeMonk(scene, x, y) {
  const box = scene.add.rectangle(x, y, C.boxW, C.boxH, 0, 0);
  scene.physics.add.existing(box);
  box.body.setMaxVelocityY(C.maxFall).setCollideWorldBounds(true);
  const robe = scene.add.image(0, 0, 'robe').setOrigin(0.5, 1);
  const head = scene.add.image(0, 0, 'head').setOrigin(0.5, 1);
  const arms = [0, 1].map(() => scene.add.image(0, 0, 'arm').setOrigin(0.5, 0));
  const scap = makeScapular(scene);
  const mouth = scene.add.image(0, 0, 'mouth').setVisible(false);
  const cheeks = scene.add.image(0, 0, 'cheeks').setVisible(false);
  const eyes = scene.add.image(0, 0, 'heyes0').setVisible(false);
  const look = scene.add.container(x, y, [scap[0], arms[0], robe, scap[1], head, cheeks, eyes, mouth, arms[1]]);
  const m = { box, look, state: 'idle', coyote: 0, buffer: 0, t: 0, squash: 0, wasGround: true };
  m.update = (i, dt) => { move(m, i, dt); draw(m, robe, head, arms, scap, dt); face(m, head, mouth, cheeks, robe, dt, eyes); };
  return m;
}
function move(m, i, dt) {
  const b = m.box.body, ground = b.blocked.down;
  const crouch = ground && i.down && !m.mode, stop = m.mode === 'inhale';
  const full = m.mode === 'full', walk = C.walk * (full ? C.fullSlow : stop ? C.inhaleSlow : 1);
  m.knock = Math.max(0, (m.knock || 0) - dt);
  const dir = crouch || m.knock ? 0 : i.right - i.left;
  const a = dir ? (ground ? C.accel : C.airAccel) : m.knock ? C.knockDecel : C.decel;
  b.velocity.x = Phaser.Math.Linear(b.velocity.x, dir * walk, Math.min(1, a * dt / walk));
  m.coyote = ground ? C.coyote : m.coyote - dt;
  m.buffer = i.jumpPressed && !stop ? C.buffer : m.buffer - dt;
  if (m.buffer > 0 && m.coyote > 0) { b.velocity.y = -C.jump * (full ? C.fullJump : 1); m.buffer = m.coyote = 0; }
  const cut = -C.jump * C.jumpCut;
  if (!i.jump && b.velocity.y < cut) b.velocity.y = cut;
  if (ground && !m.wasGround) m.squash = Math.min(1, m.fallSpeed / C.maxFall);
  m.wasGround = ground; m.fallSpeed = b.velocity.y;
  if (dir && !stop) m.face = dir; // facing stays locked while inhaling
  m.walking = ground && !crouch && Math.abs(b.velocity.x) > 10;
  m.state = m.mode || (!ground ? 'jump' : crouch ? 'crouch' : Math.abs(b.velocity.x) > 10 ? 'walk' : 'idle');
}
function draw(m, robe, head, arms, scap, dt) {
  const b = m.box.body;
  m.t += dt * (m.walking ? C.bobRate : 0);
  if (!m.walking) m.t = Phaser.Math.Linear(m.t, Math.round(m.t / Math.PI) * Math.PI, 0.2);
  m.squash = Math.max(0, m.squash - dt / C.squashTime);
  const crouch = m.state === 'crouch' ? C.crouch : 0;
  m.pop = Math.max(0, (m.pop || 0) - dt / C.popTime);
  const w = m.windup || 0, pop = m.pop;
  const sq = m.squash * C.squash + crouch - w * C.windStretch + pop * C.popSquash;
  const shiver = w ? Math.sin(m.t2 = (m.t2 || 0) + dt * C.shiverRate) * w * C.shiver : 0;
  m.look.setPosition(b.center.x + shiver, b.bottom);
  m.look.setScale((m.face || 1) * (1 + sq), 1 - sq);
  const bob = Math.abs(Math.sin(m.t)) * C.bob, late = Math.abs(Math.sin(m.t - C.headLag)) * C.bob;
  robe.y = -bob * 0.5;
  head.y = -robe.height + 3 - late * C.headBob;
  head.angle = Math.sin(m.t) * C.headTilt - pop * C.popHead;
  m.air = Phaser.Math.Linear(m.air || 0, m.state === 'jump' ? C.armAir : 0, Math.min(1, dt * C.armAirRate));
  arms.forEach((arm, k) => {
    const side = k ? 1 : -1;
    arm.setPosition(side, robe.y - robe.height + C.shoulder);
    arm.angle = side * Math.sin(m.t - C.armLag) * C.armSwing - side * m.air - w * C.clutch - pop * C.popArms * (k ? 1 : 0.8);
  });
  flap(m, scap, robe, dt);
  robe.angle = m.state === 'jump' ? -b.velocity.y * C.leanAir : Math.sin(m.t * 2) * C.waddle;
}
// Open mouth while inhaling; cheeks stay puffed while full and squish on each chew; a quick gulp when he swallows.
function face(m, head, mouth, cheeks, robe, dt, eyes) {
  m.gulp = Math.max(0, (m.gulp || 0) - dt);
  m.chew = Math.max(0, (m.chew || 0) - dt);
  const chew = Math.sin(m.chew / C.chewTime * Math.PI) * C.chewSquash;
  const full = m.mode === 'full', fed = m.mode === 'fed' || m.windup > 0;
  head.scaleX = fed ? C.fedPuff : full ? C.fullPuff : 1 + m.gulp / C.gulpTime * (C.fullPuff - 1);
  head.scaleY = 1 - m.gulp / C.gulpTime * C.squash - chew;
  mouth.setVisible(m.mode === 'inhale').setPosition(head.x + C.mouthX, head.y + C.mouthY);
  const eye = new Phaser.Math.Vector2(C.eyesX * head.scaleX, C.eyesY * head.scaleY).rotate(head.rotation); // stays glued to the eyes
  eyes.setVisible(m.mode === 'fed' || m.windup > 0).setPosition(head.x + eye.x, head.y + eye.y)
    .setRotation(head.rotation).setScale(head.scaleX, head.scaleY);
  m.flash = ((m.flash || 0) + dt * C.eyeFlash) % 2;
  eyes.setTexture('heyes' + (m.flash | 0));
  cheeks.setVisible(full || fed).setPosition(head.x + C.mouthX - 2, head.y + C.mouthY + (fed ? 2 : 1))
    .setScale((fed ? C.fedCheeks : 1) * (1 + chew * 2), (fed ? C.fedCheeks : 1) * (1 - chew));
}
