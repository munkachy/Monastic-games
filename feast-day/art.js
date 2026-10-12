// All textures, drawn from shapes once at start.
const tex = (scene, key, w, h, draw) => {
  const g = scene.make.graphics({ add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
};
export function makeArt(scene) {
  tex(scene, 'robe', 16, 22, g => {
    g.fillStyle(0x16131a).fillTriangle(8, 0, 0, 21, 16, 21).fillRect(5, 0, 6, 21);
    g.fillStyle(0x3a3540).fillRect(4, 10, 8, 1);            // belt
    g.fillStyle(0x0a080c).fillRect(3, 20, 4, 2).fillRect(9, 20, 4, 2); // sandals
  });
  tex(scene, 'scap', 5, 19, g => {
    g.fillStyle(0x221e27).fillRect(0, 0, 5, 19);            // scapular panel
  });
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
  tex(scene, 'heart', 16, 14, g => g.fillStyle(0xe8364f).fillCircle(4, 4, 4).fillCircle(12, 4, 4).fillTriangle(0.5, 6, 15.5, 6, 8, 14)
    .fillStyle(0xffffff, 0.5).fillCircle(4, 3, 1.5));
  [0x8e1028, 0xff6b81].forEach((c, k) => tex(scene, 'heyes' + k, 12, 6, g => { // eyes become little hearts, dark and light
    g.fillStyle(0xf0c9a0).fillRect(0, 0, 12, 6);
    for (const x of [0.5, 5.5]) g.fillStyle(c).fillCircle(x + 1.6, 1.8, 1.5).fillCircle(x + 4.4, 1.8, 1.5).fillTriangle(x, 2.3, x + 6, 2.3, x + 3, 5.5);
  }));
  tex(scene, 'glow', 12, 12, g => g.fillStyle(0xfff2a8, 0.4).fillCircle(6, 6, 6).fillStyle(0xfffbe0, 0.9).fillCircle(6, 6, 3));
  tex(scene, 'sweet', 12, 12, g => g.fillStyle(0xe5578a).fillCircle(6, 6, 6).fillStyle(0xffffff, 0.6).fillCircle(4, 4, 2));
}
