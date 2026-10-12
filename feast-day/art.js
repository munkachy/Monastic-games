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
  tex(scene, 'arm', 5, 13, g => {
    g.fillStyle(0x2c2733).fillRect(0, 0, 5, 10);            // sleeve, a shade lighter so it reads
    g.fillStyle(0xf0c9a0).fillCircle(2.5, 11, 2);           // hand
  });
  tex(scene, 'head', 28, 28, g => {
    g.fillStyle(0x16131a).fillCircle(13, 14, 13);           // hood
    g.fillStyle(0xf0c9a0).fillCircle(16, 15, 9);            // face
    g.fillStyle(0x222222).fillCircle(17, 14, 1.6).fillCircle(22, 14, 1.6);
    g.fillStyle(0xe89a8a).fillCircle(20, 19, 1.5);          // small mouth
  });
}
