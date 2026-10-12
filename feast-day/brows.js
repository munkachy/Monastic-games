import { C } from './config.js';
// Eyebrows: one expression per situation as [raise in px, tilt in degrees (+ = angry, - = worried)].
const FACES = {
  idle: [0, 0], walk: [0.5, 0], crouch: [-1, 12], jump: [2, -8], fall: [2.5, -22],
  inhale: [-1.2, 28], full: [2.5, -6], fed: [2, -14], windup: [1, -30], pop: [4, -10], knock: [3, -24],
};
export function makeBrows(scene) {
  const b = [0, 1].map(() => scene.add.image(0, 0, 'brow'));
  b.raise = 0; b.tilt = 0;
  return b;
}
export function moveBrows(m, brows, head, dt) {
  const key = m.pop > 0.3 ? 'pop' : m.windup > 0 ? 'windup' : m.knock > 0 ? 'knock' : m.mode
    || (m.state === 'jump' && m.box.body.velocity.y > 0 ? 'fall' : m.state);
  const [raise, tilt] = FACES[key] || FACES.idle, k = Math.min(1, dt * C.browSpeed);
  brows.raise += (raise - brows.raise) * k;
  brows.tilt += (tilt - brows.tilt) * k;
  const chew = Math.sin((m.chew || 0) / C.chewTime * Math.PI), bob = m.walking ? Math.abs(Math.sin(m.t)) * C.browBob : 0;
  const wiggle = m.windup ? Math.sin(m.t2 || 0) * C.browWiggle : 0;
  const y = C.eyesY - C.browGap - brows.raise - bob + chew * C.browChew;
  brows.forEach((br, i) => {
    const side = i ? 1 : -1;
    const v = new Phaser.Math.Vector2((C.eyesX + side * C.browApart) * head.scaleX, y * head.scaleY).rotate(head.rotation);
    br.setPosition(head.x + v.x, head.y + v.y).setScale(head.scaleX, head.scaleY)
      .setAngle(head.angle - side * brows.tilt + wiggle);
  });
}
