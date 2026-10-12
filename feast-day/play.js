import { W, H, C } from './config.js';
import { makeInput, ACT } from './input.js';
export class Play extends Phaser.Scene {
  constructor() { super('play'); }
  create() {
    this.physics.world.gravity.y = C.gravity;
    const ground = this.add.rectangle(W / 2, H - 12, W, 24, 0x6b8f4e);
    this.physics.add.existing(ground, true);
    this.monk = this.add.rectangle(80, H - 60, 18, 32, 0xc9a26b);
    this.physics.add.existing(this.monk);
    this.monk.body.setMaxVelocityY(C.maxFall).setCollideWorldBounds(true);
    this.physics.add.collider(this.monk, ground);
    this.add.circle(ACT.x, ACT.y, ACT.r, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.4);
    this.in = makeInput(this);
    this.coyote = this.buffer = 0;
  }
  update(_, ms) {
    const dt = ms / 1000, b = this.monk.body, i = this.in;
    i.update();
    const ground = b.blocked.down, dir = i.right - i.left;
    const a = dir ? (ground ? C.accel : C.airAccel) : C.decel;
    b.velocity.x = Phaser.Math.Linear(b.velocity.x, dir * C.walk, Math.min(1, a * dt / C.walk));
    this.coyote = ground ? C.coyote : this.coyote - dt;
    this.buffer = i.jumpPressed ? C.buffer : this.buffer - dt;
    if (this.buffer > 0 && this.coyote > 0) { b.velocity.y = -C.jump; this.buffer = this.coyote = 0; }
    const cut = -C.jump * C.jumpCut; // let go early: a lower jump
    if (!i.jump && b.velocity.y < cut) b.velocity.y = cut;
  }
}
