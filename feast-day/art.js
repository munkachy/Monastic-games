// Monk parts come from sprites/ (PNG); everything else is drawn from shapes once at start.
export const SPRITES = ['head', 'robe', 'arm', 'face_inhale', 'face_full', 'face_love', 'face_love2', 'sky', 'abbey', 'arcade'];
export const loadSprites = scene => {
  SPRITES.forEach(k => scene.load.image(k, 'sprites/' + k + '.png'));
  scene.load.spritesheet('tiles', 'sprites/tiles.png', { frameWidth: 32, frameHeight: 32 });
};
export const tex = (scene, key, w, h, draw) => {
  const g = scene.make.graphics({ add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
};
export function makeArt(scene) {
  tex(scene, 'heart', 16, 14, g => g.fillStyle(0xe8364f).fillCircle(4, 4, 4).fillCircle(12, 4, 4).fillTriangle(0.5, 6, 15.5, 6, 8, 14)
    .fillStyle(0xffffff, 0.5).fillCircle(4, 3, 1.5));
  tex(scene, 'brow', 5, 2, g => g.fillStyle(0x3a2418).fillRoundedRect(0, 0, 5, 1.6, 0.8)); // straight brow, 3/4 of the sprite's
  tex(scene, 'glow', 12, 12, g => g.fillStyle(0xfff2a8, 0.4).fillCircle(6, 6, 6).fillStyle(0xfffbe0, 0.9).fillCircle(6, 6, 3));
  tex(scene, 'door', 24, 40, g => {                        // refectory door
    g.fillStyle(0x5b3a1e).fillRect(0, 12, 24, 28).fillCircle(12, 12, 12).fillStyle(0x7a4f29).fillRect(3, 14, 18, 26).fillCircle(12, 14, 9);
    g.fillStyle(0xf2c94c).fillCircle(17, 28, 1.5);
  });
  tex(scene, 'sweet', 12, 12, g => g.fillStyle(0xe5578a).fillCircle(6, 6, 6).fillStyle(0xffffff, 0.6).fillCircle(4, 4, 2));
}
