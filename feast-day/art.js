import { C, belly } from './config.js';
// All textures, drawn from shapes once at start.
const tex = (scene, key, w, h, draw) => {
  const g = scene.make.graphics({ add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
};
export function makeArt(scene) {
  for (let n = 0; n <= C.inhaleMax; n++) tex(scene, 'robe' + n, 48, 22, g => robe(g, n));
  tex(scene, 'arm', 5, 13, g => {
    g.fillStyle(0x2c2733).fillRect(0, 0, 5, 10);            // sleeve, a shade lighter so it reads
    g.fillStyle(0xf0c9a0).fillCircle(2.5, 11, 2);           // hand
  });
  tex(scene, 'head', 34, 40, g => {
    g.fillStyle(0x16131a).fillTriangle(0, 39, 34, 39, 13, 0); // triangle hood, tip leaning back
    g.fillStyle(0xf0c9a0).fillCircle(18, 30, 8.5);            // face
    g.fillStyle(0x222222).fillCircle(19, 29, 1.7).fillCircle(24, 29, 1.7);
    g.fillStyle(0xe89a8a).fillCircle(22, 34, 1.5);          // small mouth
  });
  tex(scene, 'mouth', 8, 7, g => g.fillStyle(0x5a1e24).fillEllipse(4, 3.5, 8, 7));
  tex(scene, 'cheeks', 22, 10, g => g.fillStyle(0xf0c9a0).fillCircle(5, 5, 5).fillCircle(17, 5, 5)
    .fillStyle(0xe89a8a, 0.7).fillCircle(5, 5, 2.5).fillCircle(17, 5, 2.5));
  tex(scene, 'sweet', 12, 12, g => g.fillStyle(0xe5578a).fillCircle(6, 6, 6).fillStyle(0xffffff, 0.6).fillCircle(4, 4, 2));
}
// Body frame n: the whole habit gets rounder with each thing eaten, belly forward.
function robe(g, n) {
  const cx = 24, b = belly(n) || { x: 0, rx: 0 };
  g.fillStyle(0x16131a).fillTriangle(cx, 0, cx - 8 - 1.5 * n, 21, cx + 8 + 1.5 * n, 21).fillRect(cx - 3, 0, 6, 21);
  if (n) g.fillEllipse(cx + b.x, 22 + b.y, b.rx * 2, b.ry * 2).fillEllipse(cx - n, 22 + b.y + 2, 8 + 3 * n, b.ry * 1.6);
  g.fillStyle(0x3a3540).fillRect(cx - 4 - n, 10, 8 + n + b.x + b.rx * 0.9, 1); // belt
  g.fillStyle(0x0a080c).fillRect(cx - 5, 20, 4, 2).fillRect(cx + 1, 20, 4, 2); // sandals
}
