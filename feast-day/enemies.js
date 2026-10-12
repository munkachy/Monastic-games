import { C } from './config.js';
import { tex } from './art.js';
// Enemies are data: { draw(g, happy), speed, behavior, swallowable }. Add one = one row + one tiny behavior.
const eyes = (g, x, y, happy) => happy
  ? g.lineStyle(1.2, 0x222222).beginPath().arc(x, y + 1, 1.5, Math.PI, 0).strokePath().beginPath().arc(x + 4, y + 1, 1.5, Math.PI, 0).strokePath()
  : g.fillStyle(0x222222).fillCircle(x, y, 1.3).fillCircle(x + 4, y, 1.3);
const smile = (g, x, y) => g.lineStyle(1.2, 0x5a1e24).beginPath().arc(x, y - 1.5, 2, 0.3, Math.PI - 0.3).strokePath();
export const ENEMIES = {
  gummy: { w: 14, h: 16, speed: () => C.gummySpeed, behavior: walk, swallowable: true, draw: (g, happy) => {
    g.fillStyle(0xe04a3a, 0.9).fillCircle(3, 3, 2.5).fillCircle(11, 3, 2.5).fillCircle(7, 6, 5).fillEllipse(7, 12, 11, 8);
    g.fillStyle(0xffffff, 0.35).fillCircle(5, 4, 1.5); eyes(g, 6, 6, happy); if (happy) smile(g, 8, 9);
  } },
  pizza: { w: 22, h: 14, speed: () => C.pizzaSpeed, behavior: fly, swallowable: true, fly: true, draw: (g, happy) => {
    g.fillStyle(0xffffff, 0.8).fillEllipse(4, 3, 7, 4).fillEllipse(18, 3, 7, 4);       // little wings
    g.fillStyle(0xb5762f).fillRect(3, 2, 16, 3);                                          // crust
    g.fillStyle(0xf2c94c).fillTriangle(3, 4, 19, 4, 11, 14);
    g.fillStyle(0xc0392b).fillCircle(8, 7, 1.5).fillCircle(14, 6, 1.3).fillCircle(11, 11, 1.1);
    eyes(g, 9, 6, happy); if (happy) smile(g, 11, 9.5);
  } },
  jawbreaker: { w: 14, h: 14, speed: () => C.jawSpeed, behavior: roll, swallowable: false, draw: (g, happy) => {
    g.fillStyle(0x7b5cd6).fillCircle(7, 7, 7).fillStyle(0xf4d35e).fillCircle(7, 7, 5).fillStyle(0x4ec9b0).fillCircle(7, 7, 3);
    g.fillStyle(0xffffff).fillCircle(5, 6, 1.8).fillCircle(9, 6, 1.8); eyes(g, 5, 6, happy);
    if (happy) smile(g, 7, 10.5); else g.lineStyle(1.2, 0x222222).lineBetween(3, 3, 6, 4.5).lineBetween(11, 3, 8, 4.5);
  } },
  lust: { w: 20, h: 20, speed: () => C.lustSpeed, behavior: fly, swallowable: false, demon: true, fly: true, draw: g => g.fillStyle(0x9b7fd1).fillCircle(10, 10, 10) },
  avarice: { w: 20, h: 20, speed: () => C.avariceSpeed, behavior: walk, swallowable: false, demon: true, draw: g => g.fillStyle(0x8a8470).fillCircle(10, 10, 10) },
  gluttony: { w: 20, h: 20, speed: () => C.gluttonySpeed, behavior: walk, swallowable: false, demon: true, draw: g => g.fillStyle(0x8a8a2a).fillCircle(10, 10, 10) },
};
// Action sheets (sprites/<kind>_sheet.png, one strip of 12 frames from a 4x3 sheet):
// 0-3 move loop, 4-5 being sucked in, 6 hit, 7 attack, 8-11 won over (sweets) or fleeing (demons).
export const SHEETS = { pizza: [59, 44, 1, 1], gluttony: [52, 44, 1, -1], lust: [55, 47, 1, -1], avarice: [55, 44, 1, -1] }; // frame w, h, px below the feet, way the art faces (1 right, -1 left)
export const loadSheets = scene => Object.entries(SHEETS).forEach(([k, [w, h]]) =>
  scene.load.spritesheet(k, 'sprites/' + k + '_sheet.png', { frameWidth: w, frameHeight: h, spacing: 2 }));
// A sprite in sprites/ with the enemy's name wins over the drawing; with no `_happy` sprite, won-over enemies blush pink.
export function makeEnemyArt(scene) {
  for (const k in SHEETS) for (const [name, a, z] of [['move', 0, 3], ['won', 8, 11]])
    scene.anims.create({ key: k + '_' + name, frames: scene.anims.generateFrameNumbers(k, { start: a, end: z }), frameRate: C.animFps, repeat: name === 'won' && ENEMIES[k].demon ? 0 : -1 });
  for (const [k, e] of Object.entries(ENEMIES)) for (const happy of [0, 1]) if (!scene.textures.exists(k + (happy ? '_happy' : ''))) tex(scene, k + (happy ? '_happy' : ''), e.w, e.h, g => e.draw(g, happy));
}
export function spawn(group, kind, x, y) {
  const e = group.create(x, y, kind), d = ENEMIES[kind];
  Object.assign(e, { kind, dir: -1, y0: y, t: Math.random() * 6, noSwallow: !d.swallowable });
  e.body.setAllowGravity(!d.fly).setCollideWorldBounds(true);
  if (SHEETS[kind]) { // body sits at the feet of the frame
    const bw = e.width * C.sheetBody, bh = e.height * C.sheetBody;
    e.play(kind + '_move'); e.body.setSize(bw, bh).setOffset((e.width - bw) / 2, e.height - bh - SHEETS[kind][2]);
  }
  const feet = e.height / 2 - (SHEETS[kind] ? SHEETS[kind][2] : 0); // stand on the tile's floor, not inside it
  if (!d.fly) e.body.reset(x, y + C.tile / 2 - feet - 1);
  return e;
}
export function updateEnemies(group, dt, solidAt) {
  for (const e of group.getChildren()) {
    if (!e.kind || e.won) continue;
    if (SHEETS[e.kind]) {
      if (e.pulled) { e.anims.stop(); e.setFrame(e.scale < C.pulledFrame2 ? 5 : 4); continue; }
      if (!e.anims.isPlaying) e.play(e.kind + '_move');
    }
    if (e.pulled) continue;
    const d = ENEMIES[e.kind];
    if (e.body.blocked.left) e.dir = 1; else if (e.body.blocked.right) e.dir = -1;
    else if (!d.fly && e.body.blocked.down && !solidAt(e.body.center.x + e.dir * (e.body.halfWidth + 2), e.body.bottom + 2)) e.dir = -e.dir; // turn at ledges
    e.t += dt;
    d.behavior(e, d.speed(), dt);
    e.setFlipX(e.dir !== (SHEETS[e.kind] ? SHEETS[e.kind][3] : -1)); // drawings face left
  }
}
function walk(e, speed) { e.body.velocity.x = e.dir * speed; }
function fly(e, speed) { walk(e, speed); e.y = e.y0 + Math.sin(e.t * C.pizzaBobRate) * C.pizzaBob; e.body.velocity.y = 0; }
function roll(e, speed, dt) { walk(e, speed); e.angle += e.dir * speed * dt * 4; }
// A heart wins it over: it smiles, gives a little heart, and hops off to the feast. A demon flees into smoke instead.
export function winOver(scene, e, group) {
  e.won = true; group.remove(e); e.body.enable = false;
  if (ENEMIES[e.kind].demon) return flee(scene, e);
  const happy = e.kind + '_happy';
  if (SHEETS[e.kind]) e.play(e.kind + '_won');
  else if (scene.textures.exists(happy)) e.setTexture(happy); else e.setTint(C.wonTint);
  e.setAngle(0);
  const love = scene.add.image(e.x, e.y - 12, 'heart').setScale(0.5);
  scene.tweens.add({ targets: love, y: love.y - 20, alpha: 0, duration: C.wonTime, onComplete: () => love.destroy() });
  scene.tweens.add({ targets: e, y: e.y - C.wonHop, duration: C.wonTime / 6, yoyo: true, repeat: 2, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: e, x: e.x + C.wonAway, alpha: 0, duration: C.wonTime, onComplete: () => e.destroy() });
}
function flee(scene, e) {
  e.play(e.kind + '_won');
  scene.tweens.add({ targets: e, x: e.x + C.fleeAway * Math.sign(e.x - scene.monk.box.x || 1), duration: C.wonTime, ease: 'Quad.easeIn' }); // away from the monk
  e.once('animationcomplete', () => scene.tweens.add({ targets: e, alpha: 0, duration: 200, onComplete: () => e.destroy() }));
}
