// Benedictine Bricks — physics.
//
// The stones are simulated with planck.js (lib/planck.min.js), a JavaScript
// port of Box2D, the engine that WeirdBeard's own stacking games were built
// on. Box2D stacks boxes far more steadily than Matter.js, keeps friction
// where it belongs, and lets a resting tower fall asleep instead of jiggling.
//
// This file offers the handful of calls game.js makes (in the style of the
// Matter.js engine it used before) on top of planck. Game code works in
// pixels and in "per step" speeds at 60 steps a second; planck works in
// metres and seconds. One stone square is one metre.

const Matter = (() => {
  const pl = planck;
  const PPM = 24;            // pixels per metre: one stone square
  const HZ = 60;             // physics steps per second
  // Box2D gives every box a thin skin (twice its linear slop). Trim the box
  // by that much, so a square's solid size is exactly one square and squares
  // sit flush beside and on top of one another.
  const SKIN = 2 * 0.005;

  let nextId = 1;

  // The bounds of a square from its corners now, in pixels. (Box2D's own
  // bounding boxes are only refreshed when the world steps, which is too late
  // right after a stone is moved or turned.)
  function fixtureBounds(body, fixture, box) {
    for (const v of fixture.getShape().m_vertices) {
      const p = body.getWorldPoint(v);
      box.min.x = Math.min(box.min.x, p.x * PPM);
      box.min.y = Math.min(box.min.y, p.y * PPM);
      box.max.x = Math.max(box.max.x, p.x * PPM);
      box.max.y = Math.max(box.max.y, p.y * PPM);
    }
    return box;
  }
  const emptyBox = () => ({ min: { x: Infinity, y: Infinity }, max: { x: -Infinity, y: -Infinity } });

  // One square of a stone (a Box2D fixture), with its centre and bounds in pixels.
  class Part {
    constructor(body, fixture) {
      this.body = body;
      this.parent = body;
      this.fixture = fixture;
    }
    get position() {
      const c = this.fixture.getShape().m_centroid;
      const p = this.body.pb.getWorldPoint(c);
      return { x: p.x * PPM, y: p.y * PPM };
    }
    get bounds() {
      return fixtureBounds(this.body.pb, this.fixture, emptyBox());
    }
  }

  // A stone, a plank or the foundation: one rigid body made of squares.
  class ShimBody {
    constructor(shapes, opts) {
      this.id = nextId++;
      this.shapes = shapes;      // [{ x, y, w, h }] in pixels, before it exists
      this.opts = opts || {};
      this.plugin = {};
      this.label = this.opts.label || "";
      this.pb = null;
      this.parts = [this];
    }

    create(world) {
      const n = this.shapes.length;
      const cx = this.shapes.reduce((s, r) => s + r.x, 0) / n;
      const cy = this.shapes.reduce((s, r) => s + r.y, 0) / n;
      const o = this.opts;
      this.pb = world.pw.createBody({
        type: o.isStatic ? "static" : "dynamic",
        position: pl.Vec2(cx / PPM, cy / PPM),
        linearDamping: o.linearDamping || 0,
        angularDamping: o.angularDamping || 0,
      });
      const fixtures = this.shapes.map((r) => this.pb.createFixture({
        shape: pl.Box(r.w / 2 / PPM - SKIN, r.h / 2 / PPM - SKIN, pl.Vec2((r.x - cx) / PPM, (r.y - cy) / PPM), 0),
        density: o.density || 1,
        friction: o.friction === undefined ? 0.7 : o.friction,
        restitution: o.restitution || 0,
      }));
      this.pb.setUserData(this);
      this.parts = n > 1 ? [this, ...fixtures.map((f) => new Part(this, f))] : [this];
      this.fixtures = fixtures;
      world.bodies.push(this);
    }

    get parent() { return this; }
    get position() {
      const p = this.pb.getWorldCenter();
      return { x: p.x * PPM, y: p.y * PPM };
    }
    get angle() { return this.pb.getAngle(); }
    get velocity() {
      const v = this.pb.getLinearVelocity();
      return { x: (v.x * PPM) / HZ, y: (v.y * PPM) / HZ };
    }
    get speed() {
      const v = this.velocity;
      return Math.hypot(v.x, v.y);
    }
    get angularVelocity() { return this.pb.getAngularVelocity() / HZ; }
    get isStatic() { return this.pb.isStatic(); }
    get isSleeping() { return !this.pb.isAwake(); }
    get bounds() {
      const box = emptyBox();
      for (const f of this.fixtures) fixtureBounds(this.pb, f, box);
      return box;
    }
  }

  const Bodies = {
    rectangle(x, y, w, h, opts) {
      return new ShimBody([{ x, y, w, h }], opts);
    },
  };

  const Body = {
    create({ parts, ...opts }) {
      return new ShimBody(parts.map((p) => p.shapes[0]), { ...parts[0].opts, ...opts });
    },
    setPosition(b, { x, y }) {
      // Move the centre of mass to (x, y).
      const c = b.pb.getWorldCenter();
      const o = b.pb.getPosition();
      b.pb.setTransform(pl.Vec2(o.x + (x / PPM - c.x), o.y + (y / PPM - c.y)), b.pb.getAngle());
      b.pb.setAwake(true);
    },
    setAngle(b, angle) {
      const c = b.pb.getWorldCenter();
      b.pb.setTransform(b.pb.getPosition(), angle);
      const c2 = b.pb.getWorldCenter();
      const o = b.pb.getPosition();
      b.pb.setTransform(pl.Vec2(o.x + c.x - c2.x, o.y + c.y - c2.y), angle);   // turn about the centre
      b.pb.setAwake(true);
    },
    setVelocity(b, { x, y }) {
      b.pb.setLinearVelocity(pl.Vec2((x * HZ) / PPM, (y * HZ) / PPM));
    },
    setAngularVelocity(b, w) {
      b.pb.setAngularVelocity(w * HZ);
    },
    setStatic(b, on) {
      if (on) b.pb.setStatic();
      else b.pb.setDynamic();
    },
  };

  const Composite = {
    add(world, item) {
      for (const b of [].concat(item)) b.create(world);
    },
    remove(world, b) {
      if (!b.pb || b.removed) return;
      b.removed = true;
      world.pw.destroyBody(b.pb);
      world.bodies = world.bodies.filter((x) => x !== b);
    },
    allBodies(world) {
      return world.bodies.slice();
    },
    get(world, id) {
      return world.bodies.find((b) => b.id === id) || null;
    },
  };

  const Engine = {
    create() {
      const pw = new pl.World({ gravity: pl.Vec2(0, 10) });
      const world = { pw, bodies: [], contacts: [] };
      const engine = {
        world,
        handlers: [],
        velocityIterations: 10,
        positionIterations: 8,
        gravity: {
          set y(v) { pw.setGravity(pl.Vec2(0, v)); },
          get y() { return pw.getGravity().y; },
        },
      };
      // Contacts are gathered during a step and reported after it, when the
      // world may be changed again (a stone may turn static on landing).
      pw.on("begin-contact", (contact) => {
        const a = contact.getFixtureA().getBody().getUserData();
        const b = contact.getFixtureB().getBody().getUserData();
        if (a && b) world.contacts.push({ bodyA: a, bodyB: b });
      });
      return engine;
    },
    update(engine, ms) {
      engine.world.pw.step(ms / 1000, engine.velocityIterations, engine.positionIterations);
      const pairs = engine.world.contacts;
      engine.world.contacts = [];
      if (pairs.length) for (const fn of engine.handlers) fn({ pairs });
    },
  };

  const Events = {
    on(engine, name, fn) {
      if (name === "collisionStart") engine.handlers.push(fn);
    },
  };

  const Sleeping = {
    set(b, asleep) { b.pb.setAwake(!asleep); },
  };

  // Would these squares (axis-aligned, as a steered stone is) overlap any
  // other body by more than `slack` pixels?
  function overlaps(body, others, slack) {
    const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
    for (const part of parts) {
      const pos = part.position;
      const half = (part === body ? body.shapes[0].w : body.shapes[0].w) / 2 - slack;
      const probe = pl.Box(half / PPM, half / PPM);
      const xf = pl.Transform(pl.Vec2(pos.x / PPM, pos.y / PPM), body.angle);
      for (const other of others) {
        if (!other.pb || other === body) continue;
        const oxf = other.pb.getTransform();
        for (const f of other.fixtures) {
          if (pl.testOverlap(probe, 0, f.getShape(), 0, xf, oxf)) return true;
        }
      }
    }
    return false;
  }

  return { Engine, Bodies, Body, Composite, Events, Sleeping, overlaps, PPM };
})();
