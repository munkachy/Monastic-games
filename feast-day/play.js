import { W, H, C } from './config.js';
import { makeInput, ACT } from './input.js';
import { makeArt, loadSprites } from './art.js';
import { makeMonk } from './monk.js';
import { makeTune } from './tune.js';
import { makeInhale } from './inhale.js';
import { makeHearts } from './heart.js';
import { makeEnemyArt, loadSheets, updateEnemies, winOver } from './enemies.js';
import { LEVELS, buildLevel, populate } from './levels.js';
export class Play extends Phaser.Scene {
  constructor() { super('play'); }
  preload() { loadSprites(this); loadSheets(this); }
  create() {
    makeArt(this); makeEnemyArt(this);
    this.physics.world.gravity.y = C.gravity;
    const lv = this.level = Object.assign(buildLevel(this, LEVELS[0]), LEVELS[0]);
    this.physics.world.setBounds(0, -C.camUp, lv.w, C.camUp + lv.h + H).setBoundsCollision(true, true, true, false);
    this.monk = makeMonk(this, lv.start.x, lv.start.y);
    this.physics.add.collider(this.monk.box, [lv.solid, lv.plats]);
    this.add.circle(ACT.x, ACT.y, ACT.r, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.4).setScrollFactor(0).setDepth(10);
    this.things = this.physics.add.group();
    populate(this.things, lv);
    this.physics.add.collider(this.things, [lv.solid, lv.plats]);
    this.hearts = makeHearts(this, this.monk);
    this.physics.add.overlap(this.hearts.group, this.things, (h, e) => {
      if (!e.kind || e.won) return;
      winOver(this, e, this.things); this.hearts.hit(h);
    });
    this.inhale = makeInhale(this, this.monk, this.things, this.hearts);
    this.frozen = 0;
    this.freeze = t => { this.frozen = t; this.physics.world.pause(); };
    this.cameras.main.setBounds(0, -C.camUp, lv.w, C.camUp + lv.h + H / 2).startFollow(this.monk.box, true, C.camLerp, C.camLerpY); // monk mid-screen, room below for thumbs
    this.in = makeInput(this);
    makeTune(this, this.monk, lv.name);
  }
  restart() {
    this.monk.box.body.reset(this.level.start.x, this.level.start.y);
    populate(this.things, this.level);
  }
  // Reached the refectory door: the feast!
  finish() {
    this.ended = true; this.monk.box.body.setVelocity(0, 0);
    const t = this.add.text(W / 2, H / 3, 'Feast day!', { fontFamily: 'serif', fontSize: '36px', color: '#7a1f2b', stroke: '#fff8e7', strokeThickness: 6 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(C.endTime, () => { t.destroy(); this.ended = false; this.restart(); });
  }
  update(_, ms) {
    this.in.update();
    if (this.frozen > 0 && (this.frozen -= ms / 1000) > 0) return; // hit-stop
    this.physics.world.resume();
    this.sky.tilePositionX = this.cameras.main.scrollX * C.skyScroll;
    if (this.ended) return;
    if (this.monk.box.y > this.level.h + C.fallOut) this.restart(); // fell in a pit (health comes in chunk 9)
    if (Math.abs(this.monk.box.x - this.level.door.x) < C.tile && this.monk.box.body.blocked.down) this.finish();
    updateEnemies(this.things, ms / 1000);
    this.inhale.update(this.in, ms / 1000);
    this.monk.update(this.in, ms / 1000);
    this.hearts.update(ms / 1000);
  }
}
