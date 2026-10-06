"use strict";
// While You Have the Light: the seven. Each sin fights in its own way, so its colour, once the
// light shows it, tells you how to fight it:
//   Pride ..... keeps to the air above, throws shards down; struck out of the air it falls,
//               humbled, and the fall hurts it double.
//   Avarice ... gathers every loose thing into its sack and throws from the dark; its touch
//               steals a flask of holy water. Cast it out and the hoard spills.
//   Lust ...... keeps its distance and casts a ribbon that draws you in, then strikes.
//               Block, or strike it, to break the ribbon.
//   Envy ...... a blow of the same kind as your last is blocked, and copied back at you.
//   Gluttony .. huge and slow; swallows whatever is thrown at it and spits it back. It cannot
//               be launched. Holy water burns it double.
//   Wrath ..... charges in a straight line and cannot stop: step aside and it hits the rock.
//               Parry it and it is thrown.
//   Sloth ..... drifts through the rock and comes from behind. It never wounds, but its touch
//               drains the flow and the oil.
// As in Arkham, only a few strike at a time (they take turns); the rest prowl in the dark.

const FOE = {
  pride: { hp: 4, speed: 120, fly: true, windup: 0.5 },
  avarice: { hp: 3, speed: 100, windup: 0.45 },
  lust: { hp: 3, speed: 82, windup: 0.5 },
  envy: { hp: 4, speed: 112, windup: 0.42 },
  gluttony: { hp: 9, speed: 42, windup: 0.9 },
  wrath: { hp: 4, speed: 96, windup: 0.5 },
  sloth: { hp: 3, speed: 30, float: true, windup: 1.1 },
};

const Foes = {
  spawn(sin) {
    const h = G.hero;
    // From a crack far from him, out of the light if it can be.
    const cr = World.cracks.map((c) => ({ c, d: dist(c.x, c.y, h.x, h.y), lit: Arena.lit(c.x, c.y - 20) }))
      .filter((o) => o.d > 200).sort((a, b) => (a.lit - b.lit) || (a.d - b.d));
    const pool = cr.slice(0, 4), pickc = pool.length ? pool[Math.floor(Math.random() * pool.length)].c : World.cracks[0];
    const D = FOE[sin], extra = G.practice ? 0 : Math.max(0, Math.floor((G.wave - 6) / 4));
    const f = {
      id: G.nextId++, sin, x: pickc.x, y: pickc.y, vx: 0, vy: 0, dir: h.x >= pickc.x ? 1 : -1,
      hp: D.hp + extra, maxHp: D.hp + extra, act: { kind: "emerge", t: 0, dur: 1.0 },
      node: World.node(pickc.cx, pickc.cy), path: null, mv: null, think: 0.5 + Math.random() * 0.4, routeT: 0,
      lit: false, reveal: 0, hurtK: 0, carry: [], belly: [], stolen: 0, cool: { throw: 2 + Math.random() * 2, tether: 2.5, spit: 1.5, cast: 2.5 + Math.random() * 1.5, swoop: 4, touch: 1 },
      slot: Math.random(), token: false, air: !!(D.fly || D.float), brokenT: 0, held: false, copy: null,
    };
    G.demons.push(f);
    Sound.fx.spawn(Arena.pan(f.x));
    for (let i = 0; i < 14; i++) G.parts.push({ kind: "smoke", x: f.x + (Math.random() - 0.5) * 16, y: f.y - Math.random() * 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, t: 0, life: 1.2, c: "#0a0a0c" });
    return f;
  },
  airborne(f) { return f.sin === "pride" ? f.act.kind !== "down" && f.act.kind !== "broken" && f.act.kind !== "getUp" && f.act.kind !== "emerge" : f.act.kind === "launched"; },
  size(f) { return DEMON_SIZE[f.sin]; },
  set(f, kind, o) { f.act = Object.assign({ kind, t: 0 }, o || {}); },
  busy(f) { return !["idle", "move"].includes(f.act.kind); },
  maxTokens() { return G.practice ? 2 : Math.min(4, 1 + Math.ceil(G.wave / 3)); },
  takeToken(f) {
    if (f.token) return true;
    const n = G.demons.filter((g) => g.token).length;
    if (n >= Foes.maxTokens()) return false;
    f.token = true; f.tokenT = 0; return true;
  },
  release(f) {
    f.token = false;
    if (G.hero.pulled && G.hero.pulled.f === f) G.hero.pulled = null;
  },

  // ---- Every frame ---------------------------------------------------------------------------------
  step(dt, rdt) {
    const h = G.hero;
    for (let i = G.demons.length - 1; i >= 0; i--) {
      const f = G.demons[i], a = f.act;
      a.t += dt;
      f.reveal = Math.max(0, f.reveal - rdt);
      f.hurtK = Math.max(0, f.hurtK - dt * 4);
      for (const k in f.cool) f.cool[k] -= dt;
      // A turn to strike that is not used soon is given up, so another may come.
      if (f.token) { f.tokenT = (f.tokenT || 0) + dt; if (f.tokenT > 4 && ["idle", "move"].includes(a.kind)) Foes.release(f); }
      const wasLit = f.lit;
      f.lit = a.kind !== "emerge" && Arena.demonLit(f);
      if (f.lit && !wasLit && a.kind !== "dying") {
        if (!save.seen.lit) Arena.hintOnce("lit", "In the light it shows its true colour. Tap it to strike; swipe up, down or across on it for other blows.", "In the light it shows its true colour. Click it (or Space) to strike.");
      }
      if (!f.lit && a.kind !== "emerge" && !save.seen.dark && G.rt > 4) Arena.hintOnce("dark", "Tap a demon in the dark to throw holy water at it. You have only so many flasks.", "Click a demon in the dark (or Space) to throw holy water at it.");
      switch (a.kind) {
        case "dying": if (a.t >= a.dur) { G.demons.splice(i, 1); } continue;
        case "emerge": if (a.t >= a.dur) Foes.set(f, "idle"); continue;
        case "broken": {
          // It waits only while his finisher on it is actually under way.
          f.held = h.act.kind === "finisher" && h.act.f === f;
          if (!f.held) f.brokenT -= dt;
          if (f.brokenT <= 0 && !f.held) { f.hp = Math.max(1, Math.round(f.maxHp * 0.3)); Foes.set(f, "getUp", { dur: 0.6 }); Arena.say(f.x, f.y - 50, "IT RISES", "#bdbdbd", 8); }
          continue;
        }
        case "launched": Foes.fly(f, dt); continue;
        case "down": if (a.t >= (a.dur || 1)) Foes.set(f, "getUp", { dur: 0.55 }); continue;
        case "getUp": case "hurt": case "mirror": case "stunned": case "recover": case "pickup":
          if (a.kind === "hurt") { Foes.slide(f, dt); }
          if (a.kind === "recover" && f.sin === "sloth") { f.x += (f.retreat || -f.dir) * 24 * dt; f.y -= 6 * dt; }
          if (a.kind === "pickup" && !a.done && a.t >= a.dur * (DEMON_HIT.pickup || 0.5)) { a.done = true; Foes.grab(f, a.o); }
          if (a.t >= a.dur) {
            if (a.kind === "mirror") { Foes.set(f, "windup", { dur: 0.22, counter: true }); f.copy = a.copy; break; }
            Foes.set(f, "idle");
          }
          continue;
      }
      if (f.sin === "pride") Foes.stepPride(f, dt);
      else if (f.sin === "sloth") Foes.stepSloth(f, dt);
      else {
        Foes.stepGround(f, dt);
        // The safety net: a demon on foot never stays inside the rock.
        // (Its feet and lower body only: a tall demon may stoop under a low ledge.)
        if (!f.mv && f.act.kind !== "launched" && (World.solidAt(f.x, f.y - 4) || World.solidAt(f.x, f.y - 20))) { const n = World.nearestNode(f.x, f.y, 96); if (n >= 0) { f.x = World.feetX(n); f.y = World.feetY(n); f.path = null; } }
      }
    }
    // Keep the ones on the ground from standing in one another.
    for (let i = 0; i < G.demons.length; i++) for (let j = i + 1; j < G.demons.length; j++) {
      const a = G.demons[i], b = G.demons[j];
      if (a.air || b.air || Math.abs(a.y - b.y) > 6 || a.act.kind !== "idle" || b.act.kind !== "idle") continue;
      const d = b.x - a.x, need = (DEMON_SIZE[a.sin].w + DEMON_SIZE[b.sin].w) * 0.35;
      if (Math.abs(d) < need) { const s = d >= 0 ? 1 : -1, push = (need - Math.abs(d)) * 0.5 * Math.min(1, dt * 8); if (!World.solidAt(a.x - s * push - s * 6, a.y - 10)) a.x -= s * push; if (!World.solidAt(b.x + s * push + s * 6, b.y - 10)) b.x += s * push; }
    }
  },

  // ---- On the ground: Avarice, Lust, Envy, Gluttony, Wrath ---------------------------------------------
  stepGround(f, dt) {
    const h = G.hero, a = f.act, D = FOE[f.sin], S = DEMON_SIZE[f.sin];
    const dx = h.x - f.x, dy = h.y - f.y, adx = Math.abs(dx);
    const reach = S.w / 2 + 18;
    switch (a.kind) {
      case "windup": {
        f.dir = dx >= 0 ? 1 : -1;
        if (a.t >= a.dur) {
          if (a.charge) { Foes.set(f, "charge", { dur: 1.6 }); Sound.fx.charge(); }
          else Foes.set(f, "strike", { dur: 0.36, hit: false });
        }
        return;
      }
      case "strike": {
        if (!a.hit && a.t >= a.dur * (DEMON_HIT.strike || 0.4)) {
          a.hit = true;
          const near = f.sin === "gluttony" ? dist(f.x, f.y - S.h * 0.5, h.x, h.y - 26) < 64 : Math.abs(h.x - f.x) < reach + 12 && Math.abs(h.y - f.y) < 34;
          if (near) {
            if (f.sin === "avarice" && G.flasks > 0 && !G.practice && !h.blocking && h.inv <= 0) {
              G.flasks--; f.stolen++; Sound.fx.steal(); Arena.say(h.x, h.y - 60, "A FLASK STOLEN", SINS.avarice.color, 9);
              Arena.heroHit(0, Math.sign(h.x - f.x) || 1, f);
            } else Arena.heroHit(1, Math.sign(h.x - f.x) || 1, f, f.sin === "gluttony");
          }
        }
        if (a.t >= a.dur) { f.copy = null; Foes.release(f); Foes.set(f, "recover", { dur: f.sin === "gluttony" ? 0.8 : 0.45 }); f.think = 0.3; }
        return;
      }
      case "charge": {
        // Wrath: straight on, and it cannot stop.
        const sp = 290, nx = f.x + f.dir * sp * dt;
        if (World.solidAt(nx + f.dir * S.w * 0.5, f.y - 10) || World.solidAt(nx + f.dir * S.w * 0.5, f.y - S.h * 0.6)) {
          Sound.fx.wallSlam(Arena.pan(f.x)); Arena.shake(4);
          Arena.sparks(f.x + f.dir * S.w * 0.5, f.y - S.h * 0.5, SINS.wrath.color, 10);
          Foes.release(f); Foes.hurt(f, 1, { kx: -f.dir * 60, ky: -40, by: "wall" });
          if (f.act.kind !== "broken") { Foes.set(f, "stunned", { dur: 1.8 }); Arena.say(f.x, f.y - 60, "STUNNED", SINS.wrath.color, 8); }
          return;
        }
        f.x = nx;
        if (World.groundY(f.x, f.y - 4) > f.y + 4) { Foes.release(f); f.vx = f.dir * 200; f.vy = 0; Foes.set(f, "launched", { soft: true }); return; }
        if (!a.hit && Math.abs(h.x - f.x) < S.w / 2 + 10 && Math.abs(h.y - f.y) < 30) {
          a.hit = true;
          const r = Arena.heroHit(1, f.dir, f, true);
          if (r === "parry") return;
          if (r === "block") { Foes.release(f); Foes.set(f, "stunned", { dur: 0.7 }); return; }
        }
        if (a.t >= a.dur) { Foes.release(f); Foes.set(f, "recover", { dur: 0.6 }); }
        return;
      }
      case "throw": {
        f.dir = dx >= 0 ? 1 : -1;
        if (!a.done && a.t >= a.dur * (DEMON_HIT.throw || 0.45)) { a.done = true; Foes.throwAtHero(f, f.carry.pop(), 430); }
        if (a.t >= a.dur) Foes.set(f, "idle");
        return;
      }
      case "spit": {
        f.dir = dx >= 0 ? 1 : -1;
        if (!a.done && a.t >= a.dur * (DEMON_HIT.spit || 0.5)) { a.done = true; Sound.fx.spit(); Foes.throwAtHero(f, f.belly.pop(), 560); }
        if (a.t >= a.dur) Foes.set(f, "idle");
        return;
      }
      case "swallow": if (a.t >= a.dur) Foes.set(f, "idle"); return;
      case "tether": {
        // Lust: the ribbon holds him for a while; if he comes close, it strikes.
        f.dir = dx >= 0 ? 1 : -1;
        if (!a.on && a.t >= 0.55) {
          if (World.lineClear(f.x, f.y - S.h * 0.6, h.x, h.y - 30) && dist(f.x, f.y, h.x, h.y) < 300 && !h.blocking && !["finisher", "chain"].includes(h.act.kind)) { a.on = true; h.pulled = { f }; Sound.fx.tether(); Arena.hintOnce("lust", "Lust's ribbon draws you in. Block (two fingers) or strike it to break free.", "Lust's ribbon draws you in. Block (Q) or strike it to break free."); }
          else { Foes.release(f); Foes.set(f, "idle"); f.cool.tether = 2; return; }
        }
        if (a.on && (!h.pulled || h.pulled.f !== f)) { Foes.release(f); Foes.set(f, "idle"); f.cool.tether = 4; return; }
        if (a.on && Math.abs(h.x - f.x) < reach + 6 && Math.abs(h.y - f.y) < 30) { h.pulled = null; Foes.set(f, "windup", { dur: 0.16 }); return; }
        if (a.t > 2.9) { Foes.release(f); h.pulled = null; Foes.set(f, "idle"); f.cool.tether = 4.5; }
        return;
      }
      case "move": case "idle": break;
      default: return;
    }
    // Following a route.
    if (f.mv) { Foes.stepMove(f, dt); f.idleT = 0; return; }
    f.idleT = (f.path && f.path.length) ? 0 : (f.idleT || 0) + dt;
    if (f.idleT > 3.5 && dist(f.x, f.y, h.x, h.y) > 140) { f.idleT = 0; Foes.routeTo(f, h.x - Math.sign(dx || 1) * 60, h.y); }
    f.think -= dt;
    if (f.think > 0 && !f.path) return;
    if (f.think <= 0) { f.think = 0.22 + Math.random() * 0.15; Foes.decide(f); if (f.act.kind !== "idle" && f.act.kind !== "move") return; }
    if (f.path && f.path.length) Foes.walkPath(f, dt);
    else if (f.act.kind === "move") Foes.set(f, "idle");
  },
  // What a demon on the ground does next.
  decide(f) {
    const h = G.hero, S = DEMON_SIZE[f.sin], D = FOE[f.sin];
    const dx = h.x - f.x, dy = h.y - f.y, adx = Math.abs(dx), d = Math.hypot(dx, dy), reach = S.w / 2 + 18;
    const sameLevel = Math.abs(dy) < 26 && Arena.onGround() && h.act.kind !== "fall";
    const sees = World.lineClear(f.x, f.y - S.h * 0.6, h.x, h.y - 30);
    // Gluttony spits back what it swallowed.
    if (f.sin === "gluttony" && f.belly.length && f.cool.spit <= 0 && sees && d < 360) { f.cool.spit = 1.6; Foes.set(f, "spit", { dur: 0.6 }); return; }
    // Avarice gathers, then throws from the dark.
    if (f.sin === "avarice") {
      if (f.carry.length && f.cool.throw <= 0 && sees && d < 330 && d > 70) { f.cool.throw = 2.2 + Math.random() * 1.5; Foes.set(f, "throw", { dur: 0.55 }); return; }
      if (f.carry.length < 3 && !f.token) {
        const o = Arena.thingAt(f.x, f.y - 6, 340, (o) => o.state === "rest" && o.kind !== "flask" && !G.demons.some((g) => g !== f && g.want === o));
        if (o) {
          f.want = o;
          if (dist(f.x, f.y, o.x, o.y + 6) < 18) { Foes.set(f, "pickup", { dur: 0.5, o }); f.path = null; return; }
          Foes.routeTo(f, o.x, o.y + 4); return;
        }
      }
    }
    // Any of them may throw what lies at its feet now and then.
    if (f.sin !== "gluttony" && f.sin !== "avarice" && f.cool.throw <= 0 && sees && d > 90 && d < 300 && !f.token && Math.random() < 0.3) {
      const o = Arena.thingAt(f.x, f.y - 6, 26, (o) => o.state === "rest" && o.kind !== "flask");
      if (o) { f.cool.throw = 4 + Math.random() * 3; o.state = "held"; f.carry.push(o); Foes.set(f, "throw", { dur: 0.55 }); return; }
      f.cool.throw = 1.5;
    }
    // Lust casts its ribbon from a distance.
    if (f.sin === "lust" && f.cool.tether <= 0 && sees && d < 260 && d > 70 && !h.pulled && Foes.takeToken(f)) { Foes.set(f, "tether", { dur: 3 }); f.path = null; return; }
    // Wrath charges along the level.
    if (f.sin === "wrath" && sameLevel && adx > 60 && adx < 300 && sees && World.lineClear(f.x, f.y - 10, h.x, h.y - 10) && Foes.takeToken(f)) {
      f.dir = dx >= 0 ? 1 : -1; f.path = null; Foes.set(f, "windup", { dur: 0.62, charge: true }); return;
    }
    // Close enough to strike, with a turn to strike: wind up.
    if (adx < reach + (f.sin === "gluttony" ? 20 : 4) && Math.abs(dy) < 28 && h.act.kind !== "dying") {
      if (Foes.takeToken(f)) { f.dir = dx >= 0 ? 1 : -1; f.path = null; Foes.set(f, "windup", { dur: D.windup * (G.practice ? 1.1 : Math.max(0.7, 1 - G.wave * 0.02)) }); return; }
    }
    // Otherwise close in (with a turn) or prowl round him at a distance (without one).
    const want = f.sin !== "lust" && (f.token || Foes.takeToken(f));
    let gx, gy = h.y;
    if (want && f.sin !== "lust") gx = h.x - Math.sign(dx || 1) * (reach - 4);
    else {
      const side = (f.slot < 0.5 ? -1 : 1) * (Math.sign(-dx) || 1), ring = f.sin === "lust" ? 150 : 95 + f.slot * 80;
      gx = h.x + side * ring;
    }
    f.routeT -= 0.25;
    if (!f.path || f.routeT <= 0 || f.path.length === 0) { f.routeT = 0.6 + Math.random() * 0.4; Foes.routeTo(f, gx, gy); }
  },
  routeTo(f, x, y) {
    const from = Foes.node(f); if (from < 0) { f.path = null; Foes.release(f); return; }
    let to = World.nearestNode(x, y, 120);
    if (to < 0) { f.path = null; Foes.release(f); return; }
    const p = World.route(from, to);
    f.path = p && p.length ? p : null;
    if (f.path) Foes.set(f, "move");
    else if (!p) Foes.release(f);
  },
  node(f) {
    let id = World.node(Math.floor(f.x / CS), Math.floor((f.y - 1) / CS));
    if (id < 0) id = World.nearestNode(f.x, f.y, 48);
    return id;
  },
  walkPath(f, dt) {
    const s = f.path[0], D = FOE[f.sin];
    // Not on the floor this step begins from? A hop onto it first.
    const fx0 = World.feetX(s.from), fy0 = World.feetY(s.from);
    if (Math.abs(f.y - fy0) > 3) {
      f.mv = { t: 0, dur: 0.18, from: [f.x, f.y], to: [Math.abs(f.x - fx0) < 12 ? f.x : fx0, fy0], top: Math.min(f.y, fy0) - 8, kind: "hop" };
      Foes.set(f, "move"); return;
    }
    if (s.kind === "walk") {
      const tx = World.feetX(s.to), d = tx - f.x, sp = D.speed;
      f.dir = Math.sign(d) || f.dir; f.vx = Math.sign(d) * sp;
      if (Math.abs(d) <= sp * dt) { f.x = tx; f.y = World.feetY(s.to); f.path.shift(); }
      else f.x += Math.sign(d) * sp * dt;
      f.ph = (f.ph || 0) + sp * dt / 40;
      if (f.act.kind !== "move") Foes.set(f, "move");
      return;
    }
    // Everything else is a quick hop, as the demons go: they leap like spiders.
    f.path.shift();
    const fx = f.x, fy = f.y, tx = World.feetX(s.to), ty = World.feetY(s.to);
    const dur = s.kind === "drop" ? 0.28 + s.n * 0.025 : s.kind.startsWith("climb") ? 0.32 + s.n * 0.04 : s.kind === "leap" ? 0.3 + s.n * 0.04 : 0.14;
    f.dir = tx >= fx ? 1 : -1;
    f.mv = { t: 0, dur: dur * (f.sin === "gluttony" ? 1.6 : 1), from: [fx, fy], to: [tx, ty], top: Math.min(fy, ty) - (s.kind === "drop" ? 4 : 10 + s.n * 5), kind: s.kind };
    Foes.set(f, "move");
  },
  stepMove(f, dt) {
    const m = f.mv; m.t += dt;
    const u = clamp(m.t / m.dur, 0, 1);
    if (m.kind === "climbUp") {
      if (u < 0.6) { f.x = m.from[0]; f.y = lerp(m.from[1], m.to[1] - 6, ease(u / 0.6)); }
      else { const k = (u - 0.6) / 0.4; f.x = lerp(m.from[0], m.to[0], smooth(k)); f.y = lerp(m.to[1] - 6, m.to[1], k); }
    } else if (m.kind === "climbDown" || m.kind === "drop") {
      if (u < 0.4) { const k = u / 0.4; f.x = lerp(m.from[0], m.to[0], smooth(k)); f.y = m.from[1] - Math.sin(k * PI) * 5; }
      else { const k = (u - 0.4) / 0.6; f.x = m.to[0]; f.y = lerp(m.from[1], m.to[1], k * k); }
    } else { f.x = lerp(m.from[0], m.to[0], u); f.y = World.arcY(m.from[1], m.to[1], m.top, u); }
    if (u >= 1) { f.mv = null; f.x = m.to[0]; f.y = m.to[1]; }
  },
  slide(f, dt) {
    if (!f.vx) return;
    const S = DEMON_SIZE[f.sin], nx = f.x + f.vx * dt;
    if (!World.solidAt(nx + Math.sign(f.vx) * S.w * 0.4, f.y - 10)) f.x = nx; else f.vx = 0;
    f.vx *= Math.pow(0.03, dt);
    if (f.sin !== "pride" && f.sin !== "sloth") { const gy = World.groundY(f.x, f.y - 6); if (gy !== null && gy > f.y + 6) { f.vy = 0; Foes.set(f, "launched", { soft: true }); } }
  },
  // In the air: launched, knocked flying, or falling off an edge.
  fly(f, dt) {
    const S = DEMON_SIZE[f.sin];
    if (f.y - S.h < 8 && f.vy < 0) f.vy = 0;
    f.vy += T.grav * dt * (f.act.slowFall ? 0.55 : 1);
    let nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
    if (World.solidAt(nx + Math.sign(f.vx) * S.w * 0.4, f.y - S.h * 0.5) || World.solidAt(nx + Math.sign(f.vx) * S.w * 0.4, f.y - 6)) { f.vx *= -0.3; nx = f.x; }
    if (f.vy < 0 && World.solidAt(nx, ny - S.h)) { f.vy = 0; ny = f.y; }
    f.x = nx;
    // Falling sideways onto a raised floor: it lands on it, not in it.
    if (World.solidAt(f.x, f.y - 2)) { const top = Math.floor((f.y - 2) / CS) * CS; if (!World.solidAt(f.x, top - 2) && f.y - top < 20) { f.y = top; ny = Math.max(ny, top); } }
    const gy = World.groundY(f.x, f.y - 4);
    if (gy !== null && ny >= gy && f.vy >= 0) {
      f.y = gy; const hard = f.vy > 380 || f.act.down;
      if (f.sin === "pride" && f.act.humbled) {
        // Pride, struck out of the air: the fall hurts it double.
        Arena.say(f.x, f.y - 56, "HUMBLED", SINS.pride.color, 9); Arena.shake(3); Sound.fx.heavy(0.7, Arena.pan(f.x));
        f.hp -= 1;
        if (f.hp <= 0) { Foes.breakDown(f); return; }
        Foes.set(f, "down", { dur: 1.6 }); f.vx = 0; f.vy = 0; return;
      }
      if (f.brokenNext) { f.brokenNext = false; Foes.breakDown(f); return; }
      if (hard && f.vy > 260) { f.vy = -f.vy * 0.25; f.vx *= 0.5; if (Math.abs(f.vy) < 90 || f.act.bounced) { f.vy = 0; f.vx = 0; Foes.set(f, "down", { dur: 0.9 }); } else f.act.bounced = true; Sound.fx.land(0.6); return; }
      f.vx = 0; f.vy = 0;
      Foes.set(f, f.act.down ? "down" : "idle", { dur: 0.8 });
      return;
    }
    f.y = ny;
    if (f.y > World.h + 80) { const n = World.nearestNode(G.hero.x, G.hero.y - 200, 600); if (n >= 0) { f.x = World.feetX(n); f.y = World.feetY(n); } f.vy = 0; Foes.set(f, "idle"); }
  },

  // ---- Pride, in the air ------------------------------------------------------------------------------
  stepPride(f, dt) {
    const h = G.hero, a = f.act, S = DEMON_SIZE.pride;
    const side = f.slot < 0.5 ? -1 : 1;
    switch (a.kind) {
      case "windup": f.dir = h.x >= f.x ? 1 : -1; if (a.t >= a.dur) { if (a.swoop) { Foes.set(f, "swoop", { dur: 0.95, from: [f.x, f.y], hit: false }); Sound.fx.swoop(); } else { Foes.castShard(f); Foes.set(f, "recover", { dur: 0.4 }); } } return;
      case "swoop": {
        // A dive down through where he is, and up again.
        const [hx, hy] = [h.x, h.y + 6], vx = hx - f.x, vy = hy - f.y, d = Math.hypot(vx, vy) || 1;
        const sp = 340;
        // Never through the rock: the swoop breaks off where the rock is.
        const nx = a.t < 0.55 ? f.x + vx / d * sp * dt : f.x + f.dir * 90 * dt, ny = a.t < 0.55 ? f.y + vy / d * sp * dt : f.y - sp * 0.8 * dt;
        if (Foes.blocked(f, nx, ny)) { Foes.release(f); Foes.set(f, "idle"); return; }
        f.x = nx; f.y = ny;
        if (!a.hit && dist(f.x, f.y - S.h * 0.4, h.x, h.y - 26) < 30) { a.hit = true; Arena.heroHit(1, f.dir, f); }
        if (a.t >= a.dur) { Foes.release(f); Foes.set(f, "idle"); }
        return;
      }
      case "move": case "idle": break;
      default: return;
    }
    // Caught in the rock somehow? Out to the nearest open air.
    if (Foes.inRock(f)) { const q = Foes.freeSpot(f, f.x, f.y, 160); if (q) { f.x += clamp(q[0] - f.x, -6, 6); f.y += clamp(q[1] - f.y, -6, 6); } return; }
    // Hover high above him, to one side, out of reach of a simple blow; in the open, where it can
    // see him (not up inside the roof of a cave).
    let tx = h.x + side * (70 + f.slot * 90), ty = h.y - 120 - f.slot * 50;
    tx = clamp(tx, 40, World.w - 40); ty = clamp(ty, 30, World.h - 40);
    if (Foes.blocked(f, tx, ty) || !World.lineClear(tx, ty - S.h * 0.5, h.x, h.y - 30)) {
      const q = Foes.freeSpot(f, tx, ty, 200, true); if (q) [tx, ty] = q;
    }
    Foes.steer(f, tx, ty, FOE.pride.speed, dt, false);
    f.dir = h.x >= f.x ? 1 : -1;
    const sees = World.lineClear(f.x, f.y - S.h * 0.5, h.x, h.y - 30);
    if (f.cool.swoop <= 0 && sees && Foes.takeToken(f)) { f.cool.swoop = 5 + Math.random() * 3; Foes.set(f, "windup", { dur: 0.55, swoop: true }); return; }
    if (f.cool.cast <= 0 && sees && dist(f.x, f.y, h.x, h.y) < 380) { f.cool.cast = 3 + Math.random() * 1.6; Foes.set(f, "windup", { dur: 0.5 }); }
  },
  // Whether a demon's body at (x, y) would be in the rock.
  blocked(f, x, y) { const S = DEMON_SIZE[f.sin]; return World.solidAt(x, y - 4) || World.solidAt(x, y - S.h * 0.5) || World.solidAt(x, y - S.h); },
  inRock(f) { return Foes.blocked(f, f.x, f.y); },
  // The nearest open place for its body near (x, y), in rings outward; if `see`, one from which it
  // can see him.
  freeSpot(f, x, y, maxR, see) {
    const h = G.hero, S = DEMON_SIZE[f.sin];
    for (let r = 16; r <= maxR; r += 16) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r;
      if (qy < S.h + 10 || qx < 20 || qx > World.w - 20) continue;
      if (Foes.blocked(f, qx, qy)) continue;
      if (see && !World.lineClear(qx, qy - S.h * 0.5, h.x, h.y - 30)) continue;
      return [qx, qy];
    }
    return null;
  },
  castShard(f) {
    const h = G.hero, S = DEMON_SIZE.pride, x = f.x + f.dir * 8, y = f.y - S.h * 0.6;
    const o = Arena.addThing("shard", x, y), d = dist(x, y, h.x, h.y - 28) || 1, sp = 250;
    o.state = "flying"; o.vx = (h.x - x) / d * sp; o.vy = (h.y - 28 - y) / d * sp; o.by = f; o.rot = Math.atan2(o.vy, o.vx); o.vr = 0;
    Sound.fx.swoop();
  },
  // Move toward a point through the air, round the rock.
  steer(f, tx, ty, sp, dt, ghost) {
    const vx = tx - f.x, vy = ty - f.y, d = Math.hypot(vx, vy);
    if (d < 3) { f.vx *= 0.8; f.vy *= 0.8; return; }
    let ux = vx / d, uy = vy / d;
    const go = Math.min(sp, d * 3);
    f.vx += (ux * go - f.vx) * Math.min(1, dt * 3); f.vy += (uy * go - f.vy) * Math.min(1, dt * 3);
    let nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
    if (!ghost) {
      const S = DEMON_SIZE[f.sin], blocked = (x, y) => World.solidAt(x, y - 4) || World.solidAt(x, y - S.h * 0.5) || World.solidAt(x, y - S.h);
      if (blocked(nx, ny)) {
        if (!blocked(f.x, ny)) nx = f.x; else if (!blocked(nx, f.y)) ny = f.y; else { nx = f.x; ny = f.y - 40 * dt; }
      }
    }
    f.x = nx; f.y = ny;
    if (f.act.kind === "idle") Foes.set(f, "move");
  },

  // ---- Sloth, drifting --------------------------------------------------------------------------------
  stepSloth(f, dt) {
    const h = G.hero, a = f.act, S = DEMON_SIZE.sloth;
    switch (a.kind) {
      case "windup": {
        f.dir = h.x >= f.x ? 1 : -1;
        // It leans in, slowly.
        f.x += f.dir * 6 * dt;
        if (a.t >= a.dur) {
          if (dist(f.x, f.y - S.h * 0.55, h.x, h.y - 26) < 46) Arena.drained();
          Foes.set(f, "recover", { dur: 1.6 }); f.cool.touch = 3.2; f.retreat = -f.dir;
        }
        return;
      }
      case "recover": return;
      case "move": case "idle": break;
      default: return;
    }
    if (f.retreat && f.cool.touch > 1.6) { Foes.steer(f, f.x + f.retreat * 60, h.y - 10, 26, dt, true); return; }
    f.retreat = 0;
    // It comes at his back (or, if his back is to the rock, at his front: it may pass through the
    // rock, but it does not linger inside it).
    let tx = h.x - h.dir * 26; const ty = h.y - 2;
    if (World.solidAt(tx, ty - 20)) tx = h.x + h.dir * 26;
    Foes.steer(f, tx, ty, FOE.sloth.speed * (G.flare.on ? 1 : 1), dt, true);
    f.dir = h.x >= f.x ? 1 : -1;
    if (f.cool.touch <= 0 && dist(f.x, f.y - S.h * 0.55, h.x, h.y - 26) < 34) Foes.set(f, "windup", { dur: FOE.sloth.windup });
  },

  // ---- Blows on them ----------------------------------------------------------------------------------
  // A blow from the monk. Envy turns aside the same blow twice running, and copies it back.
  struck(f, blow, dmg, o) {
    if (f.sin === "envy" && blow === G.prevMove && blow !== "chain" && f.act.kind !== "broken" && !G.flare.chain) {
      Sound.fx.mirror(); f.mirrorK = 1;
      Arena.say(f.x, f.y - 56, "MIRRORED", SINS.envy.color, 9);
      Arena.hintOnce("envy", "Envy turns aside the same blow twice running, and copies it back. Vary your blows.");
      Foes.release(f); f.path = null; f.mv = null;
      Foes.set(f, "mirror", { dur: 0.32, copy: blow });
      f.token = true;
      return "mirrored";
    }
    if (f.sin === "gluttony" && o && o.air) o = Object.assign({}, o, { air: false, ky: -20, kx: o.kx * 0.3 });
    Foes.hurt(f, dmg, Object.assign({ by: blow }, o));
    return "hit";
  },
  hurt(f, dmg, o) {
    o = o || {};
    // Already broken (or falling, broken, to the ground): no blow does more.
    if (f.act.kind === "dying" || f.act.kind === "broken" || f.brokenNext) return;
    f.hp -= dmg; f.hurtK = 1;
    Sound.fx.demonHurt(f.sin, Arena.pan(f.x));
    if (f.act.kind === "tether" && G.hero.pulled && G.hero.pulled.f === f) { G.hero.pulled = null; Sound.fx.tetherBreak(); }
    Foes.release(f); f.path = null; f.mv = null; f.copy = null;
    const airborne = Foes.airborne(f);
    if (f.hp <= 0) {
      if (airborne || o.air) { f.vx = (o.kx || 0) * 0.5; f.vy = Math.min(o.ky || -60, -40); f.brokenNext = true; Foes.set(f, "launched", { down: true }); return; }
      Foes.breakDown(f); return;
    }
    if (f.sin === "pride" && airborne) {
      // Struck out of the air.
      f.vx = (o.kx || 0) * 0.6; f.vy = Math.max(120, o.ky || 0); Foes.set(f, "launched", { humbled: true }); return;
    }
    if (f.sin === "sloth") { f.x += Math.sign(o.kx || 1) * 14; Foes.set(f, "hurt", { dur: 0.35 }); return; }
    if (f.sin === "gluttony" && f.act.kind === "windup" && !o.down) { return; }   // too heavy to flinch mid-swing
    if (o.air || airborne) {
      // A juggle: the higher it already is above the ground, the less it goes up.
      const gy = World.groundY(f.x, f.y - 4), above = gy === null ? 0 : gy - f.y;
      let vy = o.ky || -300;
      if (above > 60) vy = Math.max(vy, -140 * clamp(1 - (above - 60) / 120, 0, 1));
      f.vx = (o.kx || 0) * 0.5; f.vy = vy; Foes.set(f, "launched", { slowFall: true }); return;
    }
    if (o.down) { f.vx = (o.kx || 0) * 0.5; f.vy = Math.min(-80, o.ky < 0 ? o.ky : -80); Foes.set(f, "launched", { down: true }); return; }
    f.vx = (o.kx || 0) * 0.8; Foes.set(f, "hurt", { dur: 0.32 });
  },
  // Brought to nothing: broken, kneeling, waiting for the finisher.
  breakDown(f) {
    if (f.act.kind === "dying") return;
    Foes.release(f); f.path = null; f.mv = null; f.copy = null; f.held = false;
    if (f.sin === "pride" || f.sin === "sloth") { const gy = World.groundY(f.x, f.y - 10); if (gy !== null) f.y = gy; }
    f.brokenT = T.brokenFor; f.hp = 0;
    Foes.set(f, "broken");
    Sound.fx.demonBroken(f.sin);
    Arena.say(f.x, f.y - 52, "BROKEN", SINS[f.sin].color, 9);
    Arena.hintOnce("broken", "Broken. Tap it to cast it out. Other finishers open as you go.", "Broken. Click it (or X) to cast it out. Other finishers open as you go.");
  },
  parried(f) {
    Foes.release(f); f.path = null; f.mv = null;
    if (f.sin === "wrath") { f.vx = -f.dir * 160; f.vy = -320; Foes.set(f, "launched", { down: true }); Foes.hurt(f, 1, { kx: -f.dir * 160, ky: -320, down: true, by: "parry" }); Arena.say(f.x, f.y - 60, "THROWN", SINS.wrath.color, 9); return; }
    if (f.sin === "pride") { f.vy = 140; Foes.set(f, "launched", { humbled: true }); return; }
    Foes.set(f, "stunned", { dur: 1.2 });
  },
  breakTether(f) { if (f.act.kind === "tether") { Sound.fx.tetherBreak(); Foes.release(f); Foes.set(f, "stunned", { dur: 0.6 }); f.cool.tether = 4; } },
  swallow(f, o) {
    const i = G.things.indexOf(o); if (i >= 0) G.things.splice(i, 1);
    o.state = "held"; f.belly.push(o); if (f.belly.length > 3) f.belly.shift();
    Sound.fx.swallow(); Arena.say(f.x, f.y - 70, "SWALLOWED", SINS.gluttony.color, 8);
    Arena.hintOnce("glutton", "Gluttony swallows what you throw, and spits it back. Holy water burns it double.");
    if (!Foes.busy(f) || f.act.kind === "hurt") Foes.set(f, "swallow", { dur: 0.5 });
    f.cool.spit = 1.2;
  },
  grab(f, o) {
    if (!o || !G.things.includes(o) || o.state !== "rest") return;
    o.state = "held"; f.carry.push(o); f.want = null;
    Sound.fx.pickup();
  },
  // A thing thrown at him (Avarice's hoard, Gluttony's spit, anything picked up).
  throwAtHero(f, o, speed) {
    if (!o) return;
    const h = G.hero, S = DEMON_SIZE[f.sin], x = f.x + f.dir * 10, y = f.y - S.h * 0.7;
    if (!G.things.includes(o)) G.things.push(o);
    const tx = h.x + h.vx * 0.2, ty = h.y - 28, d = dist(x, y, tx, ty);
    Arena.throwThing(o, x, y, tx, ty, clamp(d / speed, 0.35, 1.1), f, null);
    Sound.fx.throw(0.6);
  },
  // Avarice's hoard: everything it took, and the flasks it stole, and one more.
  spill(f) {
    const n = f.stolen + 1;
    for (const o of f.carry) { if (!G.things.includes(o)) G.things.push(o); o.state = "flying"; o.x = f.x; o.y = f.y - 20; o.vx = (Math.random() - 0.5) * 220; o.vy = -200 - Math.random() * 120; o.by = null; }
    f.carry = [];
    for (let i = 0; i < n; i++) { const o = Arena.addThing("flask", f.x, f.y - 24); o.state = "flying"; o.vx = (Math.random() - 0.5) * 180; o.vy = -240 - Math.random() * 100; }
    Arena.say(f.x, f.y - 70, "THE HOARD SPILLS", SINS.avarice.color, 9);
  },

  // ---- Its pose this frame ------------------------------------------------------------------------------
  pose(f) {
    const a = f.act, t = G.t + f.slot * 10, u = clamp(a.t / (a.dur || 1), 0, 1);
    const A = (name, k) => (DEMON_ANIM[name] || DEMON_ANIM.idle)(k, t, f.sin);
    // Envy, mirroring, moves as he moved.
    if (f.copy && (a.kind === "strike" || a.kind === "windup" || a.kind === "mirror") && MONK_ANIM[f.copy]) {
      const k = a.kind === "windup" ? u * (MONK_HIT[f.copy] || 0.5) * 0.8 : a.kind === "mirror" ? 0.15 : lerp((MONK_HIT[f.copy] || 0.5) * 0.8, 1, u);
      return MONK_ANIM[f.copy](k, t);
    }
    switch (a.kind) {
      case "emerge": return A("emerge", u);
      case "idle": return f.sin === "pride" ? A("fly", (t * 1.4) % 1) : f.sin === "sloth" ? A("float", (t * 0.5) % 1) : A("idle", (t * 0.6) % 1);
      case "move": return f.sin === "pride" ? A("fly", (t * 1.8) % 1) : f.sin === "sloth" ? A("float", (t * 0.5) % 1) : f.mv ? A("run", 0.25) : A(f.sin === "gluttony" ? "walk" : "run", (f.ph || 0) % 1);
      case "charge": return A("run", (t * 3.2) % 1);
      case "launched": return A("launched", (t * 2) % 1);
      case "down": return A("down", (t * 0.5) % 1);
      case "broken": return A("broken", (t * 0.7) % 1);
      case "stunned": return A("stunned", (t * 0.8) % 1);
      case "dying": return A("broken", 0.5);
      case "swoop": return A("strike", 0.5);
      case "tether": return A("tether", clamp(a.t / 0.6, 0, 1));
      case "recover": return f.sin === "sloth" ? A("float", (t * 0.5) % 1) : A("strike", 1);
      default: return A(a.kind, u);
    }
  },
};
