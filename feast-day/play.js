import { W, H, C } from './config.js';
import { makeInput, ACT } from './input.js';
import { makeArt } from './art.js';
import { makeMonk } from './monk.js';
import { makeTune } from './tune.js';
import { makeInhale } from './inhale.js';
import { makeHearts } from './heart.js';
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
    this.things = this.physics.add.group();
    this.sweets = () => [200, 240, 300, 360, 420].forEach(x => this.things.create(x, H - 40, 'sweet')); // test sweets until enemies exist
    this.sweets();
    this.physics.add.collider(this.things, ground);
    this.hearts = makeHearts(this, this.monk);
    this.inhale = makeInhale(this, this.monk, this.things, this.hearts);
    this.frozen = 0;
    this.freeze = t => { this.frozen = t; this.physics.world.pause(); };
    this.in = makeInput(this);
    makeTune(this, this.monk);
  }
  update(_, ms) {
    this.in.update();
    if (this.frozen > 0 && (this.frozen -= ms / 1000) > 0) return; // hit-stop
    this.physics.world.resume();
    if (!this.things.countActive()) this.sweets();
    this.inhale.update(this.in, ms / 1000);
    this.monk.update(this.in, ms / 1000);
    this.hearts.update(ms / 1000);
  }
}
