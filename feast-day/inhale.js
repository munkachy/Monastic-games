import { C } from './config.js';
// Hold act: stop, open mouth, pull things in the vortex box toward the mouth, catch up to C.inhaleMax.
// Let go with something inside: full (cheeks). Each tap of act (or Down) is one chew; after count * C.chewsPer chews he swallows -> fed. Fed + tap: a heart (heart.js).
export function makeInhale(scene, monk, things, hearts) {
  const g = scene.add.graphics().setDepth(5);
  const s = { count: 0, t: 0 };
  s.update = (i, dt) => {
    const b = monk.box.body, face = monk.face || 1;
    if (monk.mode === 'full' && (i.actPressed || i.downPressed)) chew(s, monk);
    else if (s.fed && i.actPressed) { hearts.give(s.fed); s.fed = 0; s.cool = C.heartCool; s.held = true; }
    s.cool = Math.max(0, (s.cool || 0) - dt);
    if (!i.act) s.held = false; // the press that shot the heart never starts an inhale
    const inhaling = i.act && !s.held && !s.cool && !s.fed && s.count < C.inhaleMax && (monk.mode === 'inhale' || !s.count);
    monk.mode = inhaling ? 'inhale' : s.count ? 'full' : s.fed ? 'fed' : null;
    const mx = b.center.x + face * C.vortexNear, my = b.bottom - C.boxH;
    const box = new Phaser.Geom.Rectangle(face > 0 ? mx : mx - C.vortexRange, b.bottom - C.vortexH, C.vortexRange, C.vortexH);
    g.clear();
    if (inhaling) swirl(g, s, mx, my, face, dt);
    for (const t of things.getChildren()) {
      if (t.caught) continue;
      if (inhaling && (t.pulled || box.contains(t.x, t.y))) pull(t, mx, my, dt, s, things, monk, scene);
      else if (t.pulled) release(t);
    }
  };
  return s;
}
function pull(t, mx, my, dt, s, things, monk, scene) {
  if (!t.pulled) { t.pulled = true; t.speed = 0; t.d0 = Math.hypot(mx - t.x, my - t.y); t.body.setAllowGravity(false); }
  t.speed = Math.min(C.pullMax, t.speed + C.pullAccel * dt);
  const dx = mx - t.x, dy = my - t.y, d = Math.hypot(dx, dy);
  t.body.setVelocity(dx / d * t.speed, dy / d * t.speed);
  t.setScale(Phaser.Math.Linear(C.shrinkTo, 1, Math.min(1, d / t.d0)));
  if (d < C.catchDist) { t.caught = true; s.count++; s.chews = s.count * C.chewsPer; things.remove(t, true, true); scene.freeze(C.catchFreeze); }
}
function chew(s, monk) {
  monk.chew = C.chewTime;
  if (--s.chews > 0) return;
  s.fed = s.count; s.count = 0; monk.gulp = C.gulpTime;
}
function release(t) {
  t.pulled = false; t.setScale(1);
  t.body.setAllowGravity(true).setVelocity(0, 0);
}
// Streaks rushing into the mouth.
function swirl(g, s, mx, my, face, dt) {
  s.t = (s.t + dt * 3) % 1;
  g.lineStyle(2, 0xffffff, 0.6);
  for (let k = 0; k < 5; k++) {
    const f = (s.t + k / 5) % 1, x = mx + face * C.vortexRange * (1 - f);
    const y = my + (Math.sin(k * 2.1) * C.vortexH / 2 + C.vortexH / 4) * (1 - f);
    g.lineBetween(x, y, x - face * 10 * (1 - f), y);
  }
}
