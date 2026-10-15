"use strict";
// While You Have the Light, the climb (5 of 7): each frame (his moves, the rope, the world going on).

// ---- Each frame --------------------------------------------------------------------------------------
// Which ways are held: the arrows (or WASD; both arrows together is up), or the thumb on its cross.
function pads() {
  let l = false, r = false, u = false, dn = false;
  for (const t of S.touches.values()) if (t.dpad) { const [hx, vy] = dpadDir(t); if (hx < 0) l = true; if (hx > 0) r = true; if (vy < 0) u = true; if (vy > 0) dn = true; }
  if (S.keys.ArrowLeft || S.keys.KeyA) l = true;
  if (S.keys.ArrowRight || S.keys.KeyD) r = true;
  if (S.keys.ArrowUp || S.keys.KeyW) u = true;
  if (S.keys.ArrowDown || S.keys.KeyS) dn = true;
  return { l, r, d: (r ? 1 : 0) - (l ? 1 : 0), both: l && r, u: u || (l && r), dn };
}
// Reaching a ledge, he hangs from it by his hand, just below the edge (out of sight of what is
// above). A fresh push toward it (let go of the pad and press again) and he pulls himself up;
// away from it, or down, and he drops.
// Is the way just before him (side d) too low to stand in, but not to crawl?
function lowWay(d) { const x = S.x + d * (HW + 6); return !boxAt(x, S.y - 0.5, HW, CRAWL_H) && boxAt(x, S.y - 0.5, HW, HT) && solidAt(x, S.y + 4); }   // (with a floor to crawl on)
function startCrawl() {
  if (S.rope) dropRope(true);
  S.crawl = true; S.climbing = false; Sound.fx.grab(); ev("crawling");
  if (!S.crawlSeen) { S.crawlSeen = true; tip("crawlSeen", { text: "A LOW WAY", sub: usingKeys() ? "He goes on his hands and knees (or hold \u2193 to crawl)." : "He goes on his hands and knees (or hold \u25bc to crawl).", t: 0 }); }
}
// Getting up from his knees to do something: only where there is room to stand.
function upFromCrawl() { if (!S.crawl) return true; if (boxAt(S.x, S.y - 0.5, HW, HT)) return false; S.crawl = false; return true; }
function hangAt(L) {
  const hx = L.edge - L.s * 7, hy = L.top - 0.01 + hangReach(), ok = !boxHit(hx, hy);
  S.hang = { L, need: true, k: 0, fx: S.x, fy: S.y, x: ok ? hx : S.x, y: ok ? hy : S.y };
  S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.dir = L.s;
  S.hangs = (S.hangs || 0) + 1; Sound.fx.grab();
}
function physics(dt) {
  if (S.clingWas && !S.cling) unclip(S.clingWas);
  S.clingWas = S.cling;
  briars();
  const I = S.hurtT > 0 ? { l: false, r: false, d: 0, both: false, u: false, dn: false } : pads(), d = I.d, wasGround = S.ground, vyIn = S.vy, vxIn = S.vx;
  if (S.hang) {
    const H0 = S.hang, s = H0.L.s, up = d === s || I.u;
    H0.k = Math.min(1, H0.k + dt / 0.12);
    S.x = lerp(H0.fx, H0.x, ease(H0.k)); S.y = lerp(H0.fy, H0.y, ease(H0.k)); S.vx = 0; S.vy = 0; S.dir = s;
    if (!up) H0.need = false;
    if (d === -s || I.dn) { S.hang = null; S.ground = false; return; }
    if (up && !H0.need && H0.k >= 1) { S.hang = null; startAct("ledge", H0.L); }
    return;
  }
  if (S.crawl && !S.ground && !boxAt(S.x, S.y, HW, HT)) S.crawl = false;
  S.groundT = S.ground ? (S.groundT || 0) + dt : 0;
  if (S.shot) flyShot(dt);
  const R = S.rope;
  // Up: climb the rope, hand over hand. Down: let it out.
  S.climbing = !!R && I.u;
  // (Not while rock is over his head: then he leans out round it first, and the rope waits.)
  if (R && S.climbing && !(!S.ground && boxHit(S.x, S.y - 4)) && freeOf(R) > ROPE_MIN) { R.len = Math.max((R.fixed || 0) + ROPE_MIN, R.len - CLIMB_V * (1 - 0.8 * heavy()) * dt); S.climbPh += dt * 9; }
  if (R && S.leapT > 0) R.len = Math.max((R.fixed || 0) + ROPE_MIN, R.len - 380 * dt);
  if (R && I.dn && R.len < ROPE_MAX) R.len = Math.min(ROPE_MAX, R.len + PAYOUT * dt);
  // A long throw: he reels the rope in fast, and it draws him toward the hook, till it is a length he can swing on.
  if (R && R.len > ROPE_MAX) { R.len = Math.max(ROPE_MAX, (R.fixed || 0) + ROPE_MIN, R.len - REEL_V * dt); }
  const PV = R ? pivotOf(R) : null, [gx, gy] = grip(), rd = R ? dist(gx, gy, PV.x, PV.y) : 0, taut = R && rd >= freeOf(R) - 1;
  // A ledge near his hands. Climbing the rock with bare hands, he takes hold of it. On the rope:
  // not while he is going up it (he goes on up, past it), only at its top, where he can go no
  // higher; or hanging still on it, not climbing and not swinging. Swinging, never by himself.
  if (!S.ground && !S.held) {
    let L = null;
    const top = R && S.climbing && freeOf(R) <= ROPE_MIN + 8, still = R && !S.climbing && (S.swingSp || 0) < 60 && Math.hypot(S.vx, S.vy) < 60;
    if (S.cling) L = ledge(S.cling, 18, 96, true);
    else if (top || still) L = ledge(S.dir, 18, top ? 140 : 90, true) || ledge(-S.dir, 18, top ? 140 : 90, true);
    if (L) { hangAt(L); return; }
  }
  // On the rock with bare hands. Holding toward the wall (or up): he climbs. Nothing held: he
  // stays. Away from it: he lets go. Down: he climbs down.
  if (S.cling) {
    if (R) { const [cgx, cgy] = grip(); wrapRope(R, S.prevGx === undefined ? cgx : S.prevGx, S.prevGy === undefined ? cgy : S.prevGy); R.len = Math.max(R.len, (R.fixed || 0) + dist(cgx, cgy, pivotOf(R).x, pivotOf(R).y)); }
    // (Down wins over toward the rock: a thumb pressing down and a little toward the wall means down.)
    const s = S.cling, down = I.dn, up = (d === s && !down) || I.u;
    if (slickWall(s)) {
      // Slimed rock: his hands find no hold, and he slides down it.
      S.vx = 0; S.vy = 0; S.climbPh -= dt * 4;
      if (d === -s) { S.cling = 0; S.vx = -s * 40; }
      else if (moveY(130 * dt) > 0) { S.cling = 0; S.ground = true; }
      if (S.cling) return;
    } else if (d === -s) { S.cling = 0; S.vx = -s * 40; }
    else {
      S.vx = 0; S.vy = 0; S.dir = s;
      // He keeps to an even line up the rock: its face smoothed over his height and a little
      // above him, so that the crags standing out of it pass in front of him (the rock is drawn
      // over him) instead of each one carrying him out round it. Only rock standing out past the
      // whole of him stops him; then he looks for a way round onto a ledge.
      const fx = faceLine(s);
      if (fx === null) S.cling = 0;
      else {
        // (Under rock leaning out over him, he leans out from his line as far as he must to get
        // past it, a little at a time; too far, and he stops.)
        const tx = fx - s * (HW + 4);
        let lean = 0; while (lean <= 28 && solidAt(tx - s * (HW - 2 + lean), S.y - HT - 3)) lean += 2;
        S.x += clamp((up && lean <= 28 ? tx - s * lean : tx) - S.x, -110 * dt, 110 * dt);
        const ox = S.x - s * (HW - 2);                 // his side away from the rock
        if (up) {
          if (lean <= 28 && !solidAt(ox, S.y - HT - 3)) {
            S.y -= WALL_V * (1 - 0.7 * heavy()) * dt; S.climbPh += dt * 7; S.wallStall = 0;
            const b = -Math.sin(S.climbPh);
            if (b > 0.97 && !S.planted) { S.planted = true; plant(s); } else if (b < 0.5) S.planted = false;
          }
          else if (lean > 28) { S.wallStall = (S.wallStall || 0) + dt; if (S.wallStall > 0.3) { S.wallStall = 0; const L = ledgeAround(); if (L) { startAct("ledge", L); return; } } }
        } else if (down) {
          if (!solidAt(ox, S.y + 3) && !solidAt(S.x, S.y + 3)) { S.y += WALL_DOWN * dt; S.climbPh -= dt * 7; }
          else { S.cling = 0; S.ground = true; }
        }
      }
      if (S.cling) return;
    }
    unclip(s);
  }
  // Climbing the rope with rock over his head: he leans out round it, whichever way is nearer.
  // And if he stops rising with a wall beside him, he takes to the wall with his hands.
  if (S.climbing && R && !S.ground) {
    let lean = 0;
    if (boxHit(S.x, S.y - 4)) for (let k = 2; k <= 44 && !lean; k += 2) for (const sd of [-1, 1]) if (!boxHit(S.x + sd * k, S.y - 4) && !boxHit(S.x + sd * k, S.y)) { lean = sd * k; break; }
    if (lean) { moveX(sign(lean) * Math.min(Math.abs(lean), 150 * dt)); R.len = Math.max(R.len, (R.fixed || 0) + dist(S.x, S.y - GRIP, PV.x, PV.y) + 1); S.climbPh += dt * 6; }
    // Stalled: no new height for a little while, whatever he is doing to the side.
    if (S.climbY === undefined || S.y < S.climbY - 1) { S.climbY = S.y; S.climbStall = 0; } else S.climbStall = (S.climbStall || 0) + dt;
    if (S.climbStall > 0.6) {
      const w = near(S.dir, 9) ? S.dir : near(-S.dir, 9) ? -S.dir : 0;
      if (w) { S.cling = w; S.dir = w; S.rope = null; S.climbing = false; S.climbStall = 0; Sound.fx.grab(); return; }
      const L = ledgeAround(); if (L) { S.climbStall = 0; startAct("ledge", L); return; }
    }
  } else { S.climbStall = 0; S.climbY = undefined; }
  // On the ground with the rope above him, up or a push and he leaps: straight up the rope (up),
  // or off to that side to start a swing (left or right; with up as well, higher). The rope is
  // taken up behind him as he goes, so he hangs clear of the ground and swinging at once.
  if (S.ground && R && (d || I.u) && !S.held && !(S.leapCd > 0) && PV.y < gy - 24) {
    R.len = Math.min(R.len, (R.fixed || 0) + Math.max(ROPE_MIN, rd));
    // (And short enough that at the bottom of the swing, under the hook, his feet clear the ground.)
    const deep = rayRock(PV.x, PV.y, PI / 2, 1400);
    if (deep > 0) R.len = Math.min(R.len, (R.fixed || 0) + Math.max(ROPE_MIN, deep - GRIP - 24));
    const w = 1 - 0.4 * heavy();
    S.ground = false; S.vy = -(d && !I.u ? 290 : 340) * w; S.vx = d * 190 * w; if (d) S.dir = d;
    S.leapT = d && !I.u ? 0.12 : 0.2; S.liftT = 0.5; S.leapCd = 0.45; Sound.fx.whoosh(0.5);
  }
  if (S.ground && !(taut && S.climbing)) {
    // Down (off the rope), or a way before him too low to stand in: he gets down on his hands and
    // knees, and crawls. He gets up again where there is room, unless down is still held.
    // (On the rope, not at a touch of the ground in a swing: only once he is standing.)
    if (!S.crawl && !S.held && !S.legsIn && ((I.dn && !R) || (d && lowWay(d) && (!R || S.groundT > 0.35)))) startCrawl();
    else if (S.crawl && !I.dn && !(d && lowWay(d)) && !boxAt(S.x, S.y - 0.5, HW, HT)) S.crawl = false;
    // Walking: careful and heavy. Into a step, he steps up; into a ledge he can reach, he climbs.
    const want = S.landT > 0 ? 0 : d * (S.crawl ? CRAWL_V : WALK) * (S.legsIn ? 0.35 : 1) * (S.held ? 0.55 : 1) * (1 - 0.35 * heavy()) * (S.dragging && S.tied && sign(S.tied.x - S.x) !== d ? 0.55 : 1);       // slower with a boulder in his arms, or gold on him; slower still dragging a block
    // On slime or grease his feet hardly hold: he slides, and down a slab that lies askew. And
    // once he has stepped in it, his feet are greased for a while, and he slides everywhere.
    const onSlick = slickAt(S.x, S.y);
    if (onSlick) S.greaseT = GREASE_T;
    // (Greased, his feet still get him going, scrabbling; but stopping or turning, they skate.)
    const slick = onSlick || S.greaseT > 0, going = want !== 0 && (sign(want) === sign(S.vx) || Math.abs(S.vx) < 15) && Math.abs(want) > Math.abs(S.vx);
    const acc = !slick ? 500 : going ? 170 : 26;
    S.vx += clamp(want * (slick ? 1.25 : 1) - S.vx, -acc * dt, acc * dt);
    if (slick) { const tl = tiltDy(S.x + 4, S.y) - tiltDy(S.x - 4, S.y); if (tl) S.vx += sign(tl) * 150 * dt; }
    if (S.greaseT > 0 && Math.abs(S.vx) > 20 && Math.random() < 0.25) S.parts.push({ kind: "glob", x: S.x + (Math.random() - 0.5) * 10, y: S.y - 1, vx: -S.vx * 0.2 + (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, r: 1 + Math.random() * 1.2, life: 0.5, age: 0 });
    if (d) S.dir = d;
    if (d && S.landT <= 0 && !S.held && !S.crawl && near(d, 2)) {
      const L = ledge(d, 8, 86);
      // (Up to his knee he steps up; to his head, a little flip up onto it; higher, he climbs.)
      if (L) { startAct(L.h <= 20 ? "stepUp" : L.h <= HT ? "flipUp" : "climbUp", L); return; }
      // Too high to climb onto: he takes hold of the rock and climbs it.
      S.pushT = (S.pushT || 0) + dt;
      if (S.pushT > 0.15 && !boxHit(S.x, S.y - 3)) { S.cling = d; S.rope = null; S.climbing = false; S.ground = false; S.vx = 0; S.vy = 0; S.pushT = 0; moveY(-3); Sound.fx.grab(); return; }
    } else S.pushT = 0;
  } else if (!S.ground) {
    if (taut && d) {
      // Pumping the swing, as on a real one: a push adds speed only with the swing's motion,
      // a little each time, so the arc grows over several swings; against it, only a little check.
      const nx = (gx - PV.x) / rd, ny = (gy - PV.y) / rd; let tx = -ny, ty = nx;
      if (tx < 0) { tx = -tx; ty = -ty; }
      const vt = S.vx * tx + S.vy * ty, a = (Math.abs(vt) < 30 ? PUMP_START : sign(vt) === d ? PUMP_WITH : PUMP_AGAINST) * (1 - 0.5 * heavy());
      S.vx += tx * d * a * dt; S.vy += ty * d * a * dt;
    } else if (d && S.vx * d < 160) S.vx += d * AIR * dt;
    const drag = 1 - (S.dragging ? 0.6 : 0.1) * dt; S.vx *= drag; S.vy *= drag;      // (a block dragging on the ground under him slows the swing)
  }
  if (S.pulled) pullOf(dt);
  // (Light in a flip from the rope; all but weightless in the hover after it.)
  if (S.hoverT > 0 && !S.rope) { S.vy *= Math.max(0, 1 - 12 * dt); S.vx *= Math.max(0, 1 - 2.5 * dt); }
  S.vy += GRAV * dt * (S.hoverT > 0 && !S.rope ? 0.05 : S.flip && S.flip.swap ? 0.35 : S.floatT > 0 ? 0.2 : 1) * (1 + 0.45 * heavy()) * (boonOn("friar") ? 0.45 : 1);
  if (boonOn("friar") && !S.rope && S.vy > FRIAR_FALL) S.vy = FRIAR_FALL;
  const sp = Math.hypot(S.vx, S.vy); if (sp > VMAX) { S.vx *= VMAX / sp; S.vy *= VMAX / sp; }
  // On the ground the rope pays out as he walks, unless he is climbing it.
  if (R && S.ground && !S.climbing) R.len = clamp((R.fixed || 0) + rd, ROPE_MIN, Math.max(ROPE_MAX, R.len));
  const n = clamp(Math.ceil(Math.max(Math.abs(S.vx), Math.abs(S.vy)) * dt / 6), 1, 10), h = dt / n;
  let side = 0;
  for (let k = 0; k < n; k++) {
    const [pgx, pgy] = grip();
    if (S.rope) {
      // The rope: no going further from its last bend (or the hook) than what is left of it.
      const Q = pivotOf(S.rope), F = freeOf(S.rope), [qx, qy] = grip(), L = dist(qx, qy, Q.x, Q.y);
      if (L > F - 0.5) {
        const nx = (qx - Q.x) / L, ny = (qy - Q.y) / L, out = S.vx * nx + S.vy * ny;
        if (out > 0) { S.vx -= out * nx; S.vy -= out * ny; }
      }
    }
    const hx = moveX(S.vx * h); if (hx) { side = hx; S.vx = 0; }
    const y0 = S.y, vy0 = S.vy, hy = moveY(S.vy * h); if (hy) S.vy = hy < 0 ? 40 : 0;
    if (!S.rope && vy0 > 0 && stomp(vy0, y0)) break;
    if (S.rope) {
      const Q = pivotOf(S.rope), F = freeOf(S.rope), [qx, qy] = grip(), L = dist(qx, qy, Q.x, Q.y);
      if (L > F) {
        const nx = (qx - Q.x) / L, ny = (qy - Q.y) / L, e = L - F;
        if (moveX(-nx * e)) side = -sign(nx); moveY(-ny * e);
      }
      wrapRope(S.rope, pgx, pgy);
    }
  }
  S.ground = S.vy >= 0 && boxHit(S.x, S.y + 1);
  if (S.ground && !wasGround && vyIn > 300) { S.landT = vyIn > 620 ? 0.5 : 0.32; S.landMax = S.landT; Sound.fx.land(clamp(vyIn / 700, 0.3, 1)); }
  // Swinging, his feet touch the ground: he lets go of the rope (and the hook comes back), and
  // stands. No dragging and bouncing along the ground at the rope's end.
  if (S.rope && S.ground && !wasGround && !S.climbing && !(S.liftT > 0)) dropRope();
  // Into a wall in the air, holding toward it, on the rope or falling: he takes hold of it (and
  // the hook comes back to his hand). Not in the middle of a flip: then he turns over past the
  // rock and on. (Only a true wall, not the side of a platform or a lump hanging from a roof.)
  if (S.legsIn && ((side && Math.abs(vxIn) > 200) || (S.ground && !wasGround && vyIn > 420) || (!S.ground && d && near(d) && Math.abs(vxIn) > 200))) { freeLegs(true); Sound.fx.wallSlam(0); }
  if (!S.ground && d && near(d) && !S.climbing && !S.cling && !S.held && !(S.flip && !S.flip.half) && wallBeside(d)) {
    if (S.rope) { const P = pivotOf(S.rope); S.shot = { ph: "back", t: 0, T: 0.2, bx: P.x, by: P.y, x: P.x, y: P.y }; S.shotVis = S.ropeVis; S.ropeVis = []; }
    S.cling = d; S.dir = d; S.vx = 0; S.vy = 0; S.rope = null; S.next = null; Sound.fx.grab();
  }
  if (side && !S.cling && Math.abs(vyIn) + Math.abs(S.vx) > 500) Sound.fx.wallSlam(0);

  if (S.rope && !S.ground) swingKick();
  if (boxHit(S.x, S.y)) { const f = freeSpot(S.x, S.y); if (f) { S.x = f[0]; S.y = f[1]; } }
}

// Lost out of the world (some fault gave him no place, or an endless speed): back where he last
// stood firm, everything he was doing let go, and the fault kept for a note.
function unlose() {
  fault(new Error("lost out of the world: " + JSON.stringify([S.x, S.y, S.vx, S.vy, S.rope && [S.rope.x, S.rope.y, S.rope.len], S.act && S.act.kind])));
  const p = (S.foot && Number.isFinite(S.foot[0] + S.foot[1]) && S.foot) || (S.keptAt && Number.isFinite(S.keptAt[0] + S.keptAt[1]) && S.keptAt) || [(edges(-2).L + edges(-2).R + 1) / 2 * CELL, -0.01];
  S.x = p[0]; S.y = p[1]; S.vx = 0; S.vy = 0; S.rope = null; S.shot = null; S.act = null; S.cling = 0; S.hang = null; S.flip = null; S.next = null; S.climbing = false;
  if (!Number.isFinite(S.torch[0] + S.torch[1])) S.torch = [S.x, S.y - 40];
  if (!Number.isFinite(S.cam.x + S.cam.y)) { S.cam.x = clamp(S.x - W / 2, 0, COLS * CELL - W); S.cam.y = S.y - H * 0.62; }
  ev("lost out of the world, set back");
}
function step(dt) {
  // Stopped at a verse, to read it: nothing moves till he goes on.
  if (S.verseHold) { if (S.verse) S.verse.t = Math.min(S.verse.t + dt, 0.6); return; }
  // A tip being read: nothing moves till he goes on.
  if (S.tipHold) { if (S.say) S.say.t = Math.min(S.say.t + dt, 0.6); else if (S.tipHold === "fightSeen") S.fightHintT = Math.min(S.fightHintT + dt, 0.6); return; }
  // A great demon showing itself, or a relic held up: the world stopped, all but that.
  if (S.dread) { stepDread(dt); return; }
  if (S.boonShow) { stepBoonShow(dt); return; }
  if (S.angel) { stepAngel(dt); return; }
  if (S.slowT > 0) { S.slowT -= dt; dt *= 0.5; }            // (a crowned blow: a moment at half speed)
  S.rt += dt;
  if (!Number.isFinite(S.x + S.y + S.vx + S.vy)) unlose();
  if (NOV) { if (NOV.torch && !S.latched) S.fuel = 1; if (NOV.flare) S.meter = 1; }       // (an endless torch, but not in a great demon's mouth)
  { const [pgx, pgy] = grip(); S.prevGx = pgx; S.prevGy = pgy; }
  S.whiteT = Math.max(0, (S.whiteT || 0) - dt); S.meterFlash = Math.max(0, (S.meterFlash || 0) - dt);
  for (const c of S.crosses) c.t += dt; S.crosses = S.crosses.filter((c) => c.t < (c.kind === "smite" ? 1.1 : 0.8));
  if (S.kick) { S.kick.t += dt; if (S.kick.t > 0.2) S.kick = null; }
  if (S.pend && (S.pend.t -= dt) <= 0) {
    const { wx, wy, side } = S.pend; S.pend = null;
    if (S.rope && !S.ground) swapHook(wx, wy, side); else if (!S.next && !S.act && !S.atk && !S.held && !S.rope) throwHook(wx, wy);
  }
  if (S.freeze > 0) { S.freeze -= dt; return; }        // a held breath, as the sign strikes
  // A finger held still on a demon (or on him): the sign of the cross, once the cross is drawn.
  for (const t of S.touches.values()) {
    const g = t.g; if (!g || g.done || g.o || !(g.f || g.self)) continue;
    const [x0, y0] = g.path[0], [x1, y1] = g.path[g.path.length - 1];
    if (dist(x0, y0, x1, y1) > 14) { g.still = false; continue; }
    g.still = true;
    if (S.rt - g.t0 >= HOLD_SIGN) { g.done = true; if (g.f) blessDemon(g.f); else ward(); }
  }
  if (S.dying) { S.dying += dt; if (S.dying > 1.7) { finish(); return; } }
  const F = S.flare;
  if (F.on) { F.t += dt; S.meter -= dt * METER_DRAIN; if (S.meter <= 0) { S.meter = 0; endFlare(); } }
  else if (!S.dying) S.meter = Math.min(1, S.meter + dt * METER_REGEN);
  if (S.hangT > 0) S.hangT -= dt;
  const wdt = dt * (F.on ? FLARE_SLOW : S.hangT > 0 ? 0.5 : 1);
  S.t += wdt;
  if (!S.dying) {
    if (S.fuel <= 0) lightOut();
    else if (S.fuel < 0.15 && Math.floor(S.rt * 0.8) !== Math.floor((S.rt - dt) * 0.8)) Sound.fx.gutter();
  }
  if (!S.dying) {
    if (S.latched) { S.vx = 0; S.vy = 0; if (S.shot) flyShot(wdt); }       // (held up in a great demon's jaws)
    else if (S.act) { if (S.shot) flyShot(wdt); stepAct(wdt); }
    else if (S.atk) { if (S.shot) flyShot(wdt); stepAtk(F.on ? dt * 0.8 : wdt); }       // his blows keep their speed in the flare
    else physics(wdt);
    // Rock that crumbles: his weight on it (his feet, or his hook) cracks it.
    if (S.ground) { weigh(crumblerAt(S.x - HW + 2, S.y + 3)); weigh(crumblerAt(S.x + HW - 2, S.y + 3)); }
    if (S.rope) weigh(crumblerAt(S.rope.hx === undefined ? S.rope.x : S.rope.hx, S.rope.hy === undefined ? S.rope.y : S.rope.hy));
  }
  stepCrumbling(wdt);
  if (S.ground && !S.act && !S.latched && !S.dying && !slickAt(S.x, S.y) && !crumblerAt(S.x, S.y + 3) && !thornAt(S.x, S.y - 4)) S.foot = [S.x, S.y];
  // The demons, and the stones.
  if (!S.dying) populate(dt);
  for (const f of S.demons) { updDemon(f, wdt); if (f.brokenT > 0) f.brokenT -= dt; }
  S.demons = S.demons.filter((f) => f.st !== "gone");
  for (const o of S.things) updThing(o, wdt);
  S.things = S.things.filter((o) => o.st !== "gone" && o.y < S.y + 1400);
  if (S.blocks.length) stepBlocks(wdt);
  if (S.bigs.length) stepGreat(wdt);
  if (S.rt >= REC.next) { REC.next = S.rt + 0.25; REC.snaps.push(snapNow()); if (REC.snaps.length > REC_N) REC.snaps.shift(); }
  if (S.yank) stepYank(wdt);
  S.hurtT = Math.max(0, S.hurtT - wdt); S.invT = Math.max(0, S.invT - dt); S.flashT = Math.max(0, S.flashT - dt); S.floatT = Math.max(0, S.floatT - wdt); S.shake = Math.max(0, S.shake - dt);
  if (S.crownSpin > 0) { S.crownSpin = Math.max(0, S.crownSpin - wdt); if (Math.random() < 0.5) S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0.35 }); if (S.ground) S.crownSpin = 0; }
  S.leanT = Math.max(0, (S.leanT || 0) - wdt); S.greaseT = Math.max(0, (S.greaseT || 0) - dt); S.liftT = Math.max(0, (S.liftT || 0) - wdt); S.leapT = Math.max(0, (S.leapT || 0) - wdt); S.leapCd = Math.max(0, (S.leapCd || 0) - wdt); S.kickCd = Math.max(0, S.kickCd - wdt); S.swingKickT = Math.max(0, S.swingKickT - wdt);

  if (!S.fightSeen && S.demons.some((f) => alive(f) && !f.idol && dist(f.x, f.y, S.x, S.y) < 420)) {
    // (The moves against the demons: a tip, held while it is read; off or seen before, not shown.)
    S.fightSeen = true; S.fightHintT = 0;
    if (!tipsOn() || tipSeen("fightSeen")) S.fightHintT = 99; else { S.tipHold = "fightSeen"; Sound.muffle(true, 0.3); }
  }
  if (S.fightSeen) S.fightHintT += dt;
  S.landT = Math.max(0, S.landT - wdt); S.throwT = Math.max(0, S.throwT - wdt); S.stompT = Math.max(0, (S.stompT || 0) - wdt); S.jumpT = Math.max(0, (S.jumpT || 0) - wdt);
  S.hoverT = Math.max(0, (S.hoverT || 0) - wdt);
  if (S.flip) {
    S.flip.t += wdt; const done = S.flip.t > flipDur(S.flip);
    if (done || S.ground || S.rope || S.cling || S.act) { if (done && S.flip.swap && !S.ground) S.hoverT = HOVER_T; S.flip = null; }
  }
  if (S.next) nextHook(wdt);
  swingChains(wdt);
  if (S.coins > 0 && !S.dying) { const [mx, my] = middle(); for (const sec of sectionsIn(-S.y / CELL - 12, -S.y / CELL + 12)) for (const b of almsOf(sec)) if (dist(mx, my, b.x, b.y - 8) < 40) giveAlms(b); }
  if (S.ward && (S.ward.t += dt) > WARD_T) { S.ward = null; ev("ward faded"); }
  if (S.boon) stepBoon(dt);
  if (S.legsIn) stepLegs(dt);
  S.swingSp = S.rope && !S.ground ? Math.max(Math.hypot(S.vx, S.vy), (S.swingSp || 0) - 150 * wdt) : 0;
  // Against a wall, climbing the rope: he walks up it.
  S.wall = 0;
  if (S.climbing && !S.ground && S.rope) { if (near(S.dir, 7)) S.wall = S.dir; else if (near(-S.dir, 7)) S.wall = -S.dir; }
  S.anim += wdt * (S.ground ? Math.abs(S.vx) / (S.crawl ? 26 : 62) : 1.2);
  // Greased, he leaves prints of the fat where he treads (one at each step), fading.
  const stepN = Math.floor(S.anim * 2);
  if (stepN !== S.stepN) { if (S.ground && S.greaseT > 0 && Math.abs(S.vx) > 12 && !S.act) { S.prints.push({ x: S.x + S.dir * (stepN % 2 ? 3 : -2), y: S.y, t: S.rt, a: clamp(S.greaseT / 3, 0.35, 1), dir: S.dir }); if (S.prints.length > 40) S.prints.shift(); } S.stepN = stepN; }
  if (S.prints.length && S.rt - S.prints[0].t > 9) S.prints.shift();
  if (S.rope && !S.ground && !S.cling && Math.abs(S.vx) > 30) S.dir = sign(S.vx);
  if (!Number.isFinite(S.x + S.y + S.vx + S.vy)) unlose();
  S.top = Math.max(S.top, -S.y);
  // Out on the summit, the first time: the wind, the sky, and what waits there.
  if (NOV && !S.atSummit && S.ground && !S.dying) {
    const su = summitSec();
    if (su && -S.y / CELL > su.h0 + 2) {
      S.atSummit = true; ev("the summit", { m: metres(-S.y) });
      S.say = { text: "THE SUMMIT", sub: "The top of the mountain, under the open sky. The greatest of its demons waits here.", t: 0 };
      Sound.ambience({ wind: 1 }); keepHere("summit");
    }
  }
  // The summit won: on the top, the angel comes for him. (Gone down off it, it waits for him there.)
  if (S.won && !S.dying) {
    S.won.t += dt;
    const su = summitSec(), up = !!su && -S.y / CELL > su.h0 + SUM_G - 1;
    if (up && S.won.t > 1.8 && S.ground && !S.act && !S.latched && !S.legsIn && !S.crawl) startAngel();
    else if (!up && !S.won.said && S.won.t > 1) { S.won.said = true; S.say = { text: "THE ANGEL WAITS AT THE TOP", sub: "Go back up onto the summit, and you will be carried down to the monastery.", t: 0 }; }
  }
  // The verses: come near one and the torch is full again.
  const [mx, my] = middle(), hNow = -S.y / CELL;
  for (let n = 0; ; n++) {
    const w = wallAt(n); if (w.h > hNow + 40) break;
    w.lit = Math.max(0, w.lit - dt * 0.5);
    if (w.read || w.h < hNow - 40) continue;
    const p = wallPos(w);
    if (dist(mx, my, p.x, p.y) < 70 && !S.dying) {
      w.read = true; w.lit = 1; S.fuel = 1; S.read++; ev("verse read", { n: w.n });
      if (S.haunt) { ev("the Word: the great demon follows no further"); S.haunt = null; if (!S.freedSeen) S.freedPend = true; }
      if (NOV) keepHere("verse");
      // (The next verse of its stanza not yet read, kept in the library at home; but not from the white room.)
      const si = w.n % 22, had = typeof Verses !== "undefined" ? Verses.count(si) : 0;
      const vv = typeof Verses !== "undefined" ? Verses.next(si, !(NOV && NOV.room)) : CLIMB_VERSES[si];
      S.verse = { v: vv, ps: "PSALM " + (vv[4] || 118), t: 0, book: typeof Verses !== "undefined" && !(NOV && NOV.room) && Verses.count(si) > had ? Verses.count(si) : 0 };
      // (Playing, the game stops here, so the verse can be read; a tap, and it goes on.)
      if (mode === M) { S.verseHold = true; Sound.muffle(true, 0.4); }
      Sound.fx.unlock();
      for (let k = 0; k < 16; k++) S.parts.push({ kind: "spark", x: p.x, y: p.y + (Math.random() - 0.5) * 30, vx: -w.side * (30 + Math.random() * 90), vy: -20 - Math.random() * 80, life: 0.9, age: 0, real: true });
    }
  }
  if (S.verse) { S.verse.t += dt; if (S.verse.t > 7) S.verse = null; }
  if (S.freedPend && !S.verseHold) freedSay();
  // The lamps: passing one, he lights it from his torch, and if he falls it is there he wakes.
  // The reliquaries at the foot of a cavern's deepest chains: the torch and the flare made full.
  if (!S.dying) for (const sec of sectionsIn(hNow - 30, hNow + 30)) {
    for (const L of lampsOf(sec)) {
      if (L.lit || dist(mx, my, L.x, L.y - 20) > 46) continue;
      L.lit = true; L.litT = S.rt;
      if (NOV) { const sp = freeSpot(L.x, L.y); if (sp && boxHit(sp[0], sp[1] + 3)) keepPlace(sp[0], sp[1], "lamp"); }
      Sound.fx.kindle(1, panX(L.x));
      for (let k = 0; k < 10; k++) S.parts.push({ kind: "spark", x: L.x, y: L.y - 22, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 60, life: 0.7, age: 0, real: true });
    }
    for (const R of relicsOf(sec)) {
      if (R.got || S.latched || S.boonShow || dist(mx, my, R.x, R.y - 8) > 30) continue;
      R.got = true; S.relics++; S.fuel = 1; S.meter = 1;
      showBoon(boonOf(S.relics - 1));
      for (let k = 0; k < 24; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 120; S.parts.push({ kind: "spark", c: C.gold, x: R.x, y: R.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 1, age: 0, real: true }); }
    }
  }
  if (S.say) { S.say.t += dt; if (S.say.t > 3) S.say = null; }
  const lv = Math.min(4, Math.floor(metres(S.top) / 40));
  if (lv !== S.level && !S.dying) { S.level = lv; Sound.setLevel(lv); }
  // The camera: a little below the middle, so more of the way up shows; ahead of him in a crossing.
  const sec = sectionAt(Math.max(1, Math.floor(hNow))), cv = sec.type === "cave", sl = sec.type === "slope", look = sec.type === "trav" ? trav(sec).dir * 90 : cv ? cave(sec).dir * 140 : sl ? slope(sec).dir * 120 : 0;
  const tx = clamp(S.x + look - W / 2, 0, COLS * CELL - W), ty = Math.min(S.y - HT / 2 - H * (sec.type === "summit" ? 0.74 : sec.type === "trav" || sl ? 0.5 : cv ? 0.42 : 0.58), 70 - H);
  S.cam.x += (tx - S.cam.x) * (1 - Math.exp(-dt * 4)); S.cam.y += (ty - S.cam.y) * (1 - Math.exp(-dt * 4));
  if (!S.dying && Math.random() < (F.on ? 0.9 : boonOn("unconsumed") ? 0.75 : 0.3)) S.parts.push({ kind: "ember", x: S.torch[0] + (Math.random() - 0.5) * 4, y: S.torch[1] - 6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, life: 0.8, age: 0 });
  for (const p of S.parts) {
    const k = p.real ? dt : wdt; p.age += k; p.x += p.vx * k; p.y += p.vy * k;
    if (p.kind === "chip") p.vy += 500 * k; else if (p.kind === "smoke") { p.vx *= 1 - 2 * k; p.vy *= 1 - 2 * k; }
    else if (p.kind === "glob") p.vy += 600 * k;
    else if (p.kind === "coinfly") { const u = Math.min(1, p.age / p.life); p.x = lerp(p.x, p.tx, Math.min(1, k * 9)); p.y = lerp(p.y, p.ty, Math.min(1, k * 9)) - Math.sin(u * PI) * 1.5; if (u >= 1 && !p.done) { p.done = true; if (!p.quiet) Sound.fx.coin(panX(p.tx), 0.45); } }
    else if (p.kind === "draft") { const q = 1 - Math.exp(-k * 4.5); p.px = p.x; p.py = p.y; p.x = lerp(p.x, p.tx, q); p.y = lerp(p.y, p.ty, q); }
  }
  S.parts = S.parts.filter((p) => p.age < p.life);
  for (const g of S.ghosts) g.age += dt;
  S.ghosts = S.ghosts.filter((g) => g.age < 0.9);
  S.hintT += dt;
}
