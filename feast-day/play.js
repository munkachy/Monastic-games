import { W, H, C } from './config.js';
import { makeInput, ACT } from './input.js';
import { makeArt } from './art.js';
import { makeMonk } from './monk.js';
import { makeTune } from './tune.js';
import { makeInhale } from './inhale.js';
import { makeHearts } from './heart.js';
import { makeEnemyArt, spawn, updateEnemies, winOver } from './enemies.js';
export class Play extends Phaser.Scene {
  constructor() { super('play'); }
  create() {
    makeArt(this); makeEnemyArt(this);
    this.physics.world.gravity.y = C.gravity;
    const ground = this.add.rectangle(W / 2, H - 24 + H / 2, W, H, 0x6b8f4e); // top at H - 24, deep enough to fill below
    this.physics.add.existing(ground, true);
    this.monk = makeMonk(this, 80, H - 60);
    this.physics.add.collider(this.monk.box, ground);
    this.add.circle(ACT.x, ACT.y, ACT.r, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.4).setScrollFactor(0).setDepth(10);
    this.things = this.physics.add.group();
    this.test = () => { // test row until level 1 exists
      [180, 210].forEach(x => this.things.create(x, H - 40, 'sweet'));
      spawn(this.things, 'gummy', 270, H - 40); spawn(this.things, 'pizza', 360, H - 75); spawn(this.things, 'jawbreaker', 430, H - 40);
    };
    this.test();
    this.physics.add.collider(this.things, ground);
    this.hearts = makeHearts(this, this.monk);
    this.physics.add.overlap(this.hearts.group, this.things, (h, e) => {
      if (!e.kind || e.won) return;
      winOver(this, e, this.things); this.hearts.hit(h);
    });
    this.inhale = makeInhale(this, this.monk, this.things, this.hearts);
    this.frozen = 0;
    this.freeze = t => { this.frozen = t; this.physics.world.pause(); };
    this.cameras.main.setBounds(0, -C.camUp, W, C.camUp + H * 1.5).startFollow(this.monk.box, true, C.camLerp, C.camLerpY); // monk mid-screen, room below for thumbs
    this.in = makeInput(this);
    makeTune(this, this.monk);
  }
  update(_, ms) {
    this.in.update();
    if (this.frozen > 0 && (this.frozen -= ms / 1000) > 0) return; // hit-stop
    this.physics.world.resume();
    if (!this.things.countActive()) this.test();
    updateEnemies(this.things, ms / 1000);
    this.inhale.update(this.in, ms / 1000);
    this.monk.update(this.in, ms / 1000);
    this.hearts.update(ms / 1000);
  }
}
