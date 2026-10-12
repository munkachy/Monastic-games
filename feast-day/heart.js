import { C } from './config.js';
// Fed + tap: a glow rises from belly to chest, then a heart flies out. Bigger with more chews; big ones pierce.
export function makeHearts(scene, monk) {
  const group = scene.physics.add.group({ allowGravity: false });
  const glow = scene.add.image(0, 0, 'glow').setVisible(false).setDepth(6);
  const h = { group, glowT: -1 };
  h.give = fed => { h.fed = fed; h.glowT = 0; glow.setVisible(true); };
  // The funny bit: he stretches tall and shivers holding his chest, then the heart pops out like a hiccup.
  h.update = dt => {
    const b = monk.box.body, face = monk.face || 1;
    if (h.glowT >= 0) {
      h.glowT += dt / C.glowTime;
      monk.windup = Math.min(1, h.glowT);
      glow.setPosition(b.center.x + face * 3, b.bottom - Phaser.Math.Linear(C.glowFrom, C.glowTo, h.glowT))
        .setScale(1 + h.fed * C.heartGrow).setAlpha(1 - h.glowT * 0.5);
      if (h.glowT >= 1) { h.glowT = -1; glow.setVisible(false); shoot(group, b, face, h.fed); hiccup(monk, b, face); }
    }
    for (const t of group.getChildren()) {
      t.life -= dt;
      t.y = t.y0 + Math.sin(t.life * C.heartWobbleRate) * C.heartWobble;
      if (t.life <= 0) t.destroy();
      else if (t.life < 0.2) t.setAlpha(t.life / 0.2);
    }
  };
  // Chunk 6 calls this on overlap with an enemy.
  h.hit = t => { scene.freeze(C.hitFreeze); if (!t.big) t.destroy(); };
  return h;
}
function shoot(group, b, face, fed) {
  const chews = fed * C.chewsPer, y = b.bottom - C.glowTo;
  const t = group.create(b.center.x + face * C.heartOut, y, 'heart').setScale(C.heartBase + chews * C.heartGrow);
  t.setFlipX(face < 0).body.setVelocityX(face * C.heartSpeed);
  Object.assign(t, { big: fed >= C.heartPierce, life: C.heartLife, y0: y });
}
function hiccup(monk, b, face) {
  monk.windup = 0; monk.pop = 1;
  b.velocity.x = -face * C.recoil; monk.knock = C.knockTime; // thrown back even mid-run
  if (b.blocked.down) b.velocity.y = -C.popHop;
}
