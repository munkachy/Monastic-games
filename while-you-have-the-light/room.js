"use strict";
// The white room: for trying things out, on the copy kept on claude.ai only. A list of places (a
// whole mountain, each room alone, the summit); choose one and he is set down in it, empty. Then,
// while he plays, a finger held still on the rock or the air for a second (twice the blessing's
// hold) opens a menu there, of everything the game has, by kind: choose, and it is put in at that
// spot. As much as you like, as often as you like. Going to another place clears all of it. What
// was put where goes with a note for Claude, so Claude can learn how a room is liked to be set out.
// Nothing done here is kept, and no place kept on a mountain is touched.

const Room = (() => {
  const R = { ok: !!window.claude, t: 0, menu: null };
  const HOLD_MENU = 1.0;                         // (seconds held still; the blessing's is 0.5)
  R.HOLD = HOLD_MENU;
  R.live = () => R.ok && !!Climb.nov && !!Climb.nov.room;

  // ---- The places ----
  const base = { empty: true, mountain: "gluttony", metres: 0, place: "any", demons: 0, near: [], great: 0, block: false, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false };
  const PLACES = () => [
    { name: "A WHOLE MOUNTAIN", sub: "Two or three ways to the top", sc: { piece: ["mountain"] } },
    ...Object.keys(ROOMS).map((n) => ({ name: ROOMS[n].name, sub: "Ways: " + ROOMS[n].ways, sc: { piece: [n] } })),
    { name: "THE SUMMIT", sub: "Gluttony's top, and its great demon", sc: { summit: true } },
    { name: "A WHOLE MOUNTAIN, PEOPLED", sub: "Its demons and creatures placed by the rules", sc: { piece: ["mountain"], empty: false } },
  ];
  function go(P) {
    R.menu = null;
    Game.scene(Object.assign({}, base, P.sc, { title: P.name, seed: (Math.random() * 1e9) | 0 }));
    Climb.S.placed = [];
  }

  // ---- What can be put in (built from the game's own lists, so what is added to it shows here) ----
  const here = (m) => sectionAt(Math.max(1, Math.floor(-m.y / CELL))).k;
  // (The floor under a point: down from it to the rock; up out of it, if it is in the rock.)
  function floorAt(x, y) {
    let yy = y; while (solidAt(x, yy) && yy > y - 400) yy -= 2;
    for (let d = 0; d < 900; d += 2) if (solidAt(x, yy + d + 1)) return yy + d - 0.01;
    return y;
  }
  // (The roof over a point: up from it to the rock.)
  function roofAt(x, y) { for (let d = 0; d < 900; d += 2) if (solidAt(x, y - d - 1)) return y - d + 16; return y; }
  const mark = (what, m) => { const S = Climb.S; (S.placed = S.placed || []).push({ what, x: Math.round(m.x), y: Math.round(m.y), m: metres(-m.y) }); ev("put in, in the white room", { what }); };
  const KINDS = () => {
    const S = Climb.S, sins = BUILT.filter((d) => DEM[d]);
    return [
      { name: "DEMONS", items: sins.map((d) => ({ name: "A DEMON OF " + SINS[d].name.toUpperCase(), put(m) { const y = floorAt(m.x, m.y), f = spawnDemon(d, m.x, y, m.x - 120, m.x + 120, here(m)); if (f) { f.placed = true; f.dir = sign(S.x - f.x) || 1; f.cd = 1.5; } } })) },
      { name: "GREAT DEMONS", items: [1, 2, 3, 4].map((tier) => ({ name: "THE MAW, " + ["", "SMALLEST", "LARGER", "LARGER STILL", "GREATEST"][tier], put(m) {
        const G = GREAT.gluttony, gs = 1 + 0.2 * (tier - 1), hw = G.hw * gs, ht = G.ht * gs, at = dFree(m.x, floorAt(m.x, m.y) - 1, hw, ht) || [m.x, m.y];
        S.bigs.push({ sin: "gluttony", tier, sc: gs, hw, ht, x: at[0], y: at[1], vx: 0, vy: 0, kx: 0, ky: 0, dir: sign(S.x - at[0]) || 1, hp: tier + 2, maxHp: tier + 2, st: "stone", t: 0, wake: 0, lit: 0,
          anim: Math.random() * 9, stunT: 0, hurtT: 0, showHp: 0, chew: 0, sec: here(m), id: ++S.ids, growlT: -9, stoneT: -9, placed: true });
        if (!S.tied) { const b = makeBlock(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)], "gluttony"); b.x = S.x - S.dir * 18; b.y = S.y; S.blocks.push(b); b.st = "tied"; b.rope = TETHER; S.tied = b; }
      } })) },
      { name: "HARMFUL", items: ROLES.harmful.map((k) => ({ name: "A " + k.toUpperCase(), put(m) { const c = spawnCritter(k, m.x, CRITTERS[k].roof ? roofAt(m.x, m.y) : floorAt(m.x, m.y)); if (c) c.placed = true; } })) },
      { name: "NEUTRAL", items: [...ROLES.neutral.map((k) => ({ name: "A " + k.toUpperCase(), put(m) { const c = spawnCritter(k, m.x, CRITTERS[k].air ? m.y : floorAt(m.x, m.y)); if (c) c.placed = true; } })),
        ...sins.map((d) => ({ name: "AN IDOL OF " + SINS[d].name.toUpperCase(), sub: "And its worshippers", put(m) {
        const y = floorAt(m.x, m.y), n0 = S.demons.length; placeShrine(here(m), d, [[m.x, y, m.x - 90, m.x + 90]], []);
        for (const f of S.demons.slice(n0)) f.placed = true;
      } }))] },
      { name: "PLATFORMS", items: ROLES.platform.map((k) => ({ name: "A " + (k === "vulture" ? "PLATFORM BIRD" : k.toUpperCase()), sub: "Flies to and fro across here", put(m) { const c = spawnCritter(k, m.x, m.y); if (c) c.placed = true; } })) },
      { name: "THINGS", items: [
        ...HERB_KEYS.map((k) => ({ name: "AN HERB: " + HERBS[k].name.toUpperCase(), put(m) { S.herbs.push({ x: m.x, y: floorAt(m.x, m.y), kind: k, k: here(m), got: false, placed: true }); } })),
        { name: "A STONE BLOCK", sub: "Loose, to take up", put(m) { const b = makeBlock(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)], NOV ? NOV.domain : "gluttony"); b.x = m.x; b.y = floorAt(m.x, m.y); b.placed = true; S.blocks.push(b); } },
        { name: "A CARVED VERSE", sub: "In rooms only", off: () => !(secs[0] && secs[0].type === "room"), put(m) {
          walls.push({ h: Math.floor(-m.y / CELL) + 2, px: m.x, py: m.y, side: 1, n: 0, read: false, lit: 0, placed: true });
          walls.sort((a, b) => a.h - b.h); walls.forEach((w, i) => { w.n = i; });
        } },
      ] },
      { name: "YOURSELF", items: [
        { name: "ALL HEARTS", put() { S.hearts = HEARTS; } },
        { name: "A FULL TORCH", put() { S.fuel = 1; } },
        { name: "THE TORCH NEARLY OUT", put() { S.fuel = 0.08; NOV.torch = false; } },
        { name: "A BLOCK ON YOUR ROPE", off: () => !!S.tied, put() { const b = makeBlock(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)], NOV.domain); b.x = S.x - S.dir * 18; b.y = S.y; S.blocks.push(b); b.st = "tied"; b.rope = TETHER; S.tied = b; } },
        ...Object.keys(BOONS).map((k) => ({ name: "A RELIC: " + BOONS[k].name.toUpperCase(), put() { showBoon(k); } })),
      ] },
      { name: "CLEAR WHAT I PUT IN", put() {
        S.demons = S.demons.filter((f) => !f.placed); S.critters = (S.critters || []).filter((c) => !c.placed); S.bigs = S.bigs.filter((g) => !g.placed); S.herbs = S.herbs.filter((h) => !h.placed);
        if (S.tied && S.tied.placed) S.tied = null; S.blocks = S.blocks.filter((b) => !b.placed);
        for (let i = walls.length - 1; i >= 0; i--) if (walls[i].placed) walls.splice(i, 1); walls.forEach((w, i) => { w.n = i; });
        S.placed = []; ev("cleared, in the white room", {});
      } },
    ];
  };

  // ---- The menu, held open over the play (the play stands still under it) ----
  R.menuAt = (sx, sy) => {
    const S = Climb.S; R.menu = { sx, sy, wx: sx + S.cam.x, wy: sy + S.cam.y, cat: null, t: 0 };
    // (The press that held still may have thrown the hook: it is called back.)
    if (S.shot) S.shot = null; S.pend = null; if (S.rope && R.rope0 === false) dropRope(true);
    mode = Menu; Sound.fx.tick(900, 0.4);
  };
  const Menu = {
    step(dt) { if (R.menu) R.menu.t += dt; },
    draw() {
      try { Climb.draw(); } catch (e) { fault(e); }
      const m = R.menu; if (!m) { mode = Climb; return; }
      rect(0, 0, W, H, "rgba(3,3,5,0.35)");
      circle(m.sx, m.sy, 5, C.flameHot); glow(m.sx, m.sy, 18, C.flame, 0.5);
      const list = m.cat ? m.cat.items : KINDS(), bw = 200, bh = 28, gap = 4, cols = list.length > 9 ? 2 : 1;
      const rows = Math.ceil((list.length + 1) / cols), pw = cols * (bw + gap) + 12, ph = rows * (bh + gap) + 34;
      const px = clamp(m.sx + 16, 8, W - pw - 8), py = clamp(m.sy - ph / 2, 8, H - ph - 8);
      rect(px, py, pw, ph, "rgba(10,9,12,0.92)"); ctx.strokeStyle = "rgba(255,179,71,0.45)"; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      text(m.cat ? m.cat.name : "PUT IN HERE", px + 8, py + 16, { size: 8, weight: 800, spacing: 3, color: C.flame });
      const close = () => { R.menu = null; Climb.resume(); };
      list.forEach((it, i) => {
        const x = px + 6 + (i % cols) * (bw + gap), y = py + 26 + Math.floor(i / cols) * (bh + gap), off = it.off && it.off();
        button(it.name, x, y, bw, bh, () => {
          if (off) return;
          if (it.items) { m.cat = it; return; }
          try { it.put({ x: m.wx, y: m.wy }); mark(it.name, { x: m.wx, y: m.wy }); } catch (e) { fault(e); }
          close();
        }, { size: 8, sub: it.sub, off, hot: !m.cat && !it.items });
      });
      const i = list.length, x = px + 6 + (i % cols) * (bw + gap), y = py + 26 + Math.floor(i / cols) * (bh + gap);
      button(m.cat ? "BACK" : "CLOSE", x, y, bw, bh, () => { if (m.cat) m.cat = null; else close(); }, { size: 8 });
    },
    key(code, down) { if (down && code === "Escape") { if (R.menu && R.menu.cat) R.menu.cat = null; else { R.menu = null; Climb.resume(); } } },
  };
  R.Menu = Menu; R.kinds = KINDS; R.places = PLACES; R.mark = mark;

  // ---- The list of places ----
  R.step = (dt) => { R.t += dt; };
  R.draw = () => {
    rect(0, 0, W, H, "#f4f1ea");
    text("THE WHITE ROOM", W / 2, 34, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 5, color: "#2a2620" });
    text("Choose a place: you go in, and it is empty. Then hold a finger still for a second on the rock or the air, and put in whatever you like there.", W / 2, 52, { align: "center", font: FONT.line, italic: true, size: 12, color: "#6a6255", max: W - 40 });
    const P = PLACES(), cols = 3, bw = Math.min(210, (W - 60) / cols - 10);
    P.forEach((p, i) => { const x = W / 2 - (cols * (bw + 10)) / 2 + 5 + (i % cols) * (bw + 10), y = 76 + Math.floor(i / cols) * 52; button(p.name, x, y, bw, 42, () => go(p), { sub: p.sub, hot: i === 0 }); });
    button("BACK", 16, H - 44, 80, 30, () => Game.toTitle(), {});
  };
  R.key = (code, down) => { if (down && code === "Escape") Game.toTitle(); };
  R.open = () => {
    R.t = 0; R.menu = null; mode = R;
    Sound.flare(false); Sound.muffle(false); Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.15 });
  };
  return R;
})();
