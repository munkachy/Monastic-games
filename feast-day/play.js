import { W, H, C } from './config.js';
import { makeInput, ACT } from './input.js';
import { makeArt } from './art.js';
import { makeMonk } from './monk.js';
import { makeTune } from './tune.js';
export class Play extends Phaser.Scene {
  constructor() { super('play'); }
  create() {
    makeArt(this);
    this.physics.world.gravity.y = C.gravity;
    const ground = this.add.rectangle(W / 2, H - 12, W, 24, 0x6b8f4e);
    this.physics.add.existing(ground, true);
    this.monk = makeMonk(this, 80, H - 60);
    this.physics.add.collider(this.monk.box, ground);
    this.add.circle(ACT.x, ACT.y, ACT.r, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.4);
    this.in = makeInput(this);
    makeTune(this, this.monk);
  }
  update(_, ms) {
    this.in.update();
    this.monk.update(this.in, ms / 1000);
  }
}
