import { C } from './config.js';
// Scapular: front and back panels as bendy chains (verlet) in the monk's local space.
// Back panel stays behind him, front panel stays in front and drapes over the belly.
export function makeScapular(scene) {
  return [0, 1].map(k => {
    const g = scene.add.graphics();
    g.k = k; g.pts = Array.from({ length: C.scapSegs + 1 }, (_, i) => ({ x: 0, y: i * seg(), px: 0, py: i * seg() }));
    return g;
  });
}
const seg = bell => (C.scapLen + (bell ? bell.r * C.scapDrape : 0)) / C.scapSegs;
export function flap(m, scap, robe, dt) {
  const b = m.box.body, face = m.face || 1, vx = b.velocity.x * face, vy = b.velocity.y;
  const ax = (vx - (m.lvx ?? vx)) / dt, ay = (vy - (m.lvy ?? vy)) / dt;
  m.lvx = vx; m.lvy = vy;
  const fx = -vx * C.scapTrail - ax * C.scapInertia;
  const fy = C.scapGrav - Math.max(0, vy) * C.scapLift - ay * C.scapInertia;
  const top = robe.y - robe.height + C.shoulder, bell = m.bellyCircle;
  for (const g of scap) {
    const side = g.k ? 1 : -1, ox = side * C.scapGap, p = g.pts;
    p[0].x = p[0].px = ox; p[0].y = p[0].py = top;
    if (side > 0 && bell) push(p[0], bell), p[0].px = p[0].x;
    for (let i = 1; i < p.length; i++) {
      const q = p[i], x = q.x, y = q.y;
      q.x += (x - q.px) * C.scapDamp + fx * dt * dt;
      q.y += (y - q.py) * C.scapDamp + fy * dt * dt;
      q.px = x; q.py = y;
    }
    for (let n = 0; n < 4; n++) for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], q = p[i], dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, f = seg(side > 0 && bell) / d;
      q.x = a.x + dx * f; q.y = a.y + dy * f;
      if (side < 0) q.x = Math.min(q.x, ox); else q.x = Math.max(q.x, ox);
      if (side > 0 && bell) push(q, bell);
    }
    g.clear().lineStyle(C.scapW, 0x3a3442).strokePoints(p);
  }
}
// Drape over the front of the belly.
function push(q, c) {
  const dy = q.y - c.y;
  if (Math.abs(dy) < c.r) q.x = Math.max(q.x, c.x + Math.sqrt(c.r * c.r - dy * dy));
}
