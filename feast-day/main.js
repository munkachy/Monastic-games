import { W, H } from './config.js';
import { Play } from './play.js';
window.game = new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, backgroundColor: '#e8d9b5', pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' }, scene: [Play],
});
