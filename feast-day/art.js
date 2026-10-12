// Monk parts come from sprites/ (PNG); everything else is drawn from shapes once at start.
export const SPRITES = ['head', 'robe', 'arm', 'brow', 'face_inhale', 'face_full', 'face_love', 'face_love2'];
export const loadSprites = scene => SPRITES.forEach(k => scene.load.image(k, 'sprites/' + k + '.png'));
export const tex = (scene, key, w, h, draw) => {
  const g = scene.make.graphics({ add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
};
export function makeArt(scene) {
  tex(scene, 'heart', 16, 14, g => g.fillStyle(0xe8364f).fillCircle(4, 4, 4).fillCircle(12, 4, 4).fillTriangle(0.5, 6, 15.5, 6, 8, 14)
    .fillStyle(0xffffff, 0.5).fillCircle(4, 3, 1.5));
  tex(scene, 'glow', 12, 12, g => g.fillStyle(0xfff2a8, 0.4).fillCircle(6, 6, 6).fillStyle(0xfffbe0, 0.9).fillCircle(6, 6, 3));
  tex(scene, 'sweet', 12, 12, g => g.fillStyle(0xe5578a).fillCircle(6, 6, 6).fillStyle(0xffffff, 0.6).fillCircle(4, 4, 2));
}
