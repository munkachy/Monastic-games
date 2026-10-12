// All textures, drawn from shapes once at start.
const tex = (scene, key, w, h, draw) => {
  const g = scene.make.graphics({ add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
};
export function makeArt(scene) {
  tex(scene, 'robe', 16, 22, g => {
    g.fillStyle(0x3b2a1e).fillTriangle(8, 0, 0, 21, 16, 21).fillRect(5, 0, 6, 21);
    g.fillStyle(0xd8c49a).fillRect(4, 10, 8, 2);           // rope belt
    g.fillStyle(0x1e140d).fillRect(3, 20, 4, 2).fillRect(9, 20, 4, 2); // sandals
  });
  tex(scene, 'head', 26, 26, g => {
    g.fillStyle(0x2a1a10).fillCircle(13, 14, 12);           // ring of hair
    g.fillStyle(0xf0c9a0).fillCircle(13, 13, 11);           // face + tonsure
    g.fillStyle(0xf7dcbc).fillCircle(10, 7, 4);             // shine
    g.fillStyle(0x2a1a10).fillRect(1, 12, 3, 6).fillRect(22, 12, 3, 6);
    g.fillStyle(0x222222).fillCircle(16, 14, 1.6).fillCircle(21, 14, 1.6);
    g.fillStyle(0xe89a8a).fillCircle(19, 19, 1.5);          // small mouth
  });
}
