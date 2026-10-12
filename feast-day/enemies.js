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
};
export function makeEnemyArt(scene) {
  for (const [k, e] of Object.entries(ENEMIES)) for (const happy of [0, 1]) tex(scene, k + (happy ? '_happy' : ''), e.w, e.h, g => e.draw(g, happy));
}
export function spawn(group, kind, x, y) {
  const e = group.create(x, y, kind), d = ENEMIES[kind];
  Object.assign(e, { kind, dir: -1, y0: y, t: Math.random() * 6, noSwallow: !d.swallowable });
  e.body.setAllowGravity(!d.fly).setCollideWorldBounds(true);
  return e;
}
export function updateEnemies(group, dt) {
  for (const e of group.getChildren()) {
    if (!e.kind || e.pulled || e.won) continue;
    const d = ENEMIES[e.kind];
    if (e.body.blocked.left) e.dir = 1; else if (e.body.blocked.right) e.dir = -1;
    e.t += dt;
    d.behavior(e, d.speed(), dt);
    e.setFlipX(e.dir > 0);
  }
}
function walk(e, speed) { e.body.velocity.x = e.dir * speed; }
function fly(e, speed) { walk(e, speed); e.y = e.y0 + Math.sin(e.t * C.pizzaBobRate) * C.pizzaBob; e.body.velocity.y = 0; }
function roll(e, speed, dt) { walk(e, speed); e.angle += e.dir * speed * dt * 4; }
// A heart wins it over: it smiles, gives a little heart, and hops off to the feast.
export function winOver(scene, e, group) {
  e.won = true; group.remove(e); e.body.enable = false;
  e.setTexture(e.kind + '_happy').setAngle(0);
  const love = scene.add.image(e.x, e.y - 12, 'heart').setScale(0.5);
  scene.tweens.add({ targets: love, y: love.y - 20, alpha: 0, duration: C.wonTime, onComplete: () => love.destroy() });
  scene.tweens.add({ targets: e, y: e.y - C.wonHop, duration: C.wonTime / 6, yoyo: true, repeat: 2, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: e, x: e.x + C.wonAway, alpha: 0, duration: C.wonTime, onComplete: () => e.destroy() });
}
