"use strict";
// While You Have the Light: the arena drawn. The mist and the mountains behind (art.js), the
// caves' back walls, the warm light where the torch reaches (cut by the rock), the crags in
// black, the figures as silhouettes, and then, inside the light only, their true colours and the
// rim of firelight on the rock; over it all, the dark outside the light; and last, what shows in
// the dark anyway: eyes, flames, holy water, sparks.

const Scene = {
  shade: null,
  draw(paused) {
    if (!G) return;
    const c = G.cam, z = c.z, L = G.light, h = G.hero, t = G.rt;
    const shx = (Math.random() - 0.5) * c.shake, shy = (Math.random() - 0.5) * c.shake;
    const ox = W / 2 + shx - c.x * z, oy = H / 2 + shy - c.y * z;
    const [lsx, lsy] = [L.x * z + ox, L.y * z + oy];
    drawBackdrop(c.x, c.y, z, t, { warm: { x: lsx, y: lsy, r: L.R * z } });

    ctx.save();
    ctx.translate(ox, oy); ctx.scale(z, z);
    const lp = Scene.lightPath();
    World.drawBack();
    // The warm light on the mist and the back walls, inside its reach.
    ctx.save(); ctx.clip(lp);
    const fl = G.flare.on ? 1 : 0;
    glow(L.x, L.y, L.R * 1.25, "#ff8a30", 0.26 + 0.08 * fl);
    glow(L.x, L.y, L.R * 0.5, "#ffb060", 0.1);
    ctx.restore();
    // Burning brands lying about light a little round them.
    for (const o of G.things) if (o.kind === "brand") glow(o.x, o.y, 40, C.flame, 0.12);
    World.drawRock();
    Scene.trail();
    // Silhouettes.
    for (const o of G.things) if (o.state !== "held") drawObject(o.kind, o.x, o.y, o.rot, { lit: 0, t });
    const order = G.demons.slice().sort((a, b) => (a.sin === "gluttony") - (b.sin === "gluttony"));
    for (const f of order) Scene.demon(f, 0);
    Scene.tether();
    Scene.hero();
    // Inside the light: true colours, and the firelight on the rock.
    ctx.save(); ctx.clip(lp);
    World.drawRim(L.x, L.y, L.R, 1 + fl * 0.3);
    for (const o of G.things) if (o.state !== "held") drawObject(o.kind, o.x, o.y, o.rot, { lit: 1, t });
    for (const f of order) Scene.demon(f, 1);
    Scene.held(1);
    ctx.restore();
    // Shown by holy water, or a thing sent back: a flash of their colours, even in the dark.
    for (const f of order) if (f.reveal > 0 && !f.lit) Scene.demon(f, 1, Math.min(1, f.reveal));
    ctx.restore();

    Scene.dark(lp, ox, oy, z);

    // What shows in the dark anyway.
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(z, z);
    for (const f of order) if (!f.lit && f.act.kind !== "dying" && f.reveal <= 0) {
      const p = f.pose || Foes.pose(f);
      demonEyes(f.sin, f.x, f.y, f.dir, p, { t, windup: f.act.kind === "windup" ? clamp(f.act.t / (f.act.dur || 1), 0, 1) : 0, dim: f.sin === "sloth", alpha: f.act.kind === "emerge" ? clamp(f.act.t / f.act.dur, 0, 1) : 1 });
    }
    for (const o of G.things) {
      if (o.kind === "flask" && o.state !== "held") glow(o.x, o.y, 14, C.holy, 0.35 + 0.15 * Math.sin(t * 3 + o.id));
      if (o.kind === "brand" && o.state !== "held") drawFlame(o.x + Math.cos(o.rot) * 9, o.y + Math.sin(o.rot) * 9 - 2, 0.35, t + o.id, {});
      if (o.slow) { const k = 0.5 + 0.5 * Math.sin(t * 14); ring(o.x, o.y, Arena.thingR(o) + 7 + k * 3, "rgba(255,241,196," + (0.55 + 0.35 * k) + ")", 1.4); glow(o.x, o.y, 18, C.flameHot, 0.3); }
    }
    Scene.parts();
    // The torch flame, over everything.
    const flowK = (L.R - T.R0) / (T.Rmax - T.R0);
    drawFlame(h.torch[0], h.torch[1], 0.9 + clamp(flowK, 0, 1) * 0.45, t, { flare: G.flare.on ? 1 : clamp(G.light.flood, 0, 1), gutter: G.light.gutter > 0 ? 1 : 0, dir: h.dir, vx: h.vx });
    glow(h.torch[0], h.torch[1] - 4, 26 + flowK * 14 + fl * 30, C.flame, 0.5);
    Scene.flareMarks();
    for (const s of G.texts) {
      const a = s.t < 0.15 ? s.t / 0.15 : 1 - Math.max(0, s.t - 0.8) / 0.5;
      text(s.str, s.x, s.y, { align: "center", font: FONT.title, size: s.size, weight: 700, spacing: 1.5, color: s.color, alpha: clamp(a, 0, 1), glow: "rgba(0,0,0,0.9)", blur: 6 });
    }
    ctx.restore();

    Scene.hud(paused);
  },

  lightPath() {
    const P = G.light.poly, lp = new Path2D();
    if (!P) return lp;
    lp.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) lp.lineTo(P[i], P[i + 1]); lp.closePath();
    return lp;
  },
  // The dark outside the light, laid over everything at once. It is all soft gradients, so it is
  // made small (a quarter of the screen's pixels each way) and laid on stretched and smoothed.
  dark(lp, ox, oy, z) {
    const L = G.light, Q = 0.25;
    if (!Scene.shade) Scene.shade = document.createElement("canvas");
    const sc = Scene.shade, w = Math.max(2, Math.round(cv.width * Q)), hh = Math.max(2, Math.round(cv.height * Q));
    if (sc.width !== w || sc.height !== hh) { sc.width = w; sc.height = hh; Scene.vig = null; }
    const g = sc.getContext("2d"), k = scale * DPR * Q;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, hh);
    const amount = G.flare.on ? 0.7 : 0.58 + (G.over ? Math.min(0.4, G.over.t * 0.3) : 0);
    g.fillStyle = "rgba(3,3,5," + amount + ")"; g.fillRect(0, 0, w, hh);
    g.globalCompositeOperation = "destination-out";
    g.setTransform(k * z, 0, 0, k * z, ox * k, oy * k);
    const gr = g.createRadialGradient(L.x, L.y, Math.max(1, L.R * 0.2), L.x, L.y, Math.max(2, L.R));
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.62, "rgba(0,0,0,0.92)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fill(lp);
    // The edges of the screen a little darker still (the same every frame, so made once).
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over";
    if (!Scene.vig) {
      const v = Scene.vig = document.createElement("canvas"); v.width = w; v.height = hh;
      const vg2 = v.getContext("2d"), vg = vg2.createRadialGradient(w / 2, hh / 2, Math.min(w, hh) * 0.45, w / 2, hh / 2, Math.max(w, hh) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)"); vg2.fillStyle = vg; vg2.fillRect(0, 0, w, hh);
    }
    g.drawImage(Scene.vig, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sc, 0, 0, W, H);
  },
  demon(f, lit, alpha) {
    const a = f.act, S = DEMON_SIZE[f.sin], p = f.pose = Foes.pose(f);
    let y = f.y, al = alpha === undefined ? 1 : alpha;
    if (a.kind === "emerge") { const u = clamp(a.t / a.dur, 0, 1); y = f.y + (1 - ease(u)) * S.h * 0.5; al *= u; }
    if (a.kind === "dying") al *= 1 - clamp(a.t / a.dur, 0, 1);
    if (f.sin === "sloth") al *= lit ? 0.85 : 0.6;
    const o = {
      t: G.t + f.slot * 10, lit, alpha: al, hurt: f.hurtK, broken: a.kind === "broken",
      windup: a.kind === "windup" ? clamp(a.t / (a.dur || 1), 0, 1) : a.kind === "tether" && !a.on ? clamp(a.t / 0.55, 0, 1) : 0,
      carry: f.carry.length, belly: f.belly.length, mirror: f.mirrorK || 0,
    };
    if (f.mirrorK) f.mirrorK = Math.max(0, f.mirrorK - 0.05);
    drawDemon(f.sin, f.x, y, f.dir, p, o);
    // A broken demon glows in its colour; marked ones wear a ring.
    if (lit && a.kind === "broken") { const k = 0.6 + 0.4 * Math.sin(G.rt * 6); glow(f.x, f.y - S.h * 0.35, 34, SINS[f.sin].color, 0.35 * k); }
  },
  hero() {
    const h = G.hero, P = h.pose || MONK_ANIM.idle(0, 0);
    // An after-image as he zips or flies at a demon.
    if ((h.act.kind === "zip" || (h.act.kind === "attack" && !h.act.landed && (BLOWS[h.act.blow] || {}).fly)) && h.lastX !== undefined) {
      drawMonk(h.lastX, h.lastY, h.dir, h.lastP || P, { t: G.rt, alpha: 0.28, ghost: true });
    }
    const flash = h.inv > 0 && h.act.kind === "hurt" && Math.floor(G.rt * 20) % 2 === 0;
    const r = drawMonk(h.x, h.y, h.dir, P, { t: G.rt, vx: h.vx || (h.act.kind === "walk" ? h.dir * 60 : 0), vy: h.vy || 0, alpha: flash ? 0.55 : 1 });
    if (r && r.torch) h.torch = r.torch;
    if (r && r.hand) h.hand = r.hand;
    Scene.held(0);
    h.lastX = lerp(h.lastX === undefined ? h.x : h.lastX, h.x, 0.5); h.lastY = lerp(h.lastY === undefined ? h.y : h.lastY, h.y, 0.5); h.lastP = P;
  },
  held(lit) {
    const h = G.hero;
    if (h.hold) drawObject(h.hold.kind, h.hand[0], h.hand[1] - 3, h.hold.kind === "beam" || h.hold.kind === "brand" ? -0.9 * h.dir : 0, { lit, t: G.rt });
    // Avarice's hoard rides in its sack (drawn by the art); Gluttony's in its belly.
  },
  tether() {
    for (const f of G.demons) {
      if (f.act.kind !== "tether" || !f.act.on) continue;
      const h = G.hero, S = DEMON_SIZE.lust, [x0, y0] = demonJoint("lust", f.x, f.y, f.dir, f.pose || Foes.pose(f), "hF"), x1 = h.x, y1 = h.y - 30;
      const col = f.lit ? SINS.lust.color : "#2a1420";
      ctx.beginPath(); ctx.moveTo(x0, y0);
      const n = 14;
      for (let i = 1; i <= n; i++) { const u = i / n, w = Math.sin(u * PI) * 10 * Math.sin(G.rt * 9 + u * 8); ctx.lineTo(lerp(x0, x1, u), lerp(y0, y1, u) + w - Math.sin(u * PI) * 8); }
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.strokeStyle = "rgba(255,210,235,0.35)"; ctx.lineWidth = 0.8; ctx.stroke();
      if (f.lit) glow(x1, y1, 16, SINS.lust.color, 0.25);
    }
  },
  trail() {
    const T0 = G.trail; if (!T0) return;
    const a = 1 - T0.t, pts = T0.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], d = dist(x0, y0, x1, y1), n = Math.max(1, Math.round(d / 9));
      for (let k = 0; k < n; k++) {
        const u = k / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) - 3 - Math.sin(u * PI) * Math.min(14, Math.abs(y1 - y0) * 0.5 + (Math.abs(x1 - x0) > 20 ? 8 : 0));
        const fl = 0.5 + 0.5 * Math.sin(G.rt * 12 + i * 3 + k);
        circle(x, y, 1.1, "rgba(255,150,60," + (a * (0.35 + 0.35 * fl)).toFixed(3) + ")");
      }
    }
    const [ex, ey] = pts[pts.length - 1];
    glow(ex, ey - 3, 10, C.flame, 0.35 * a);
  },
  parts() {
    for (const p of G.parts) {
      const k = 1 - p.t / p.life;
      switch (p.kind) {
        case "spark": { ctx.globalAlpha = k; line(p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.c, 1.6); ctx.globalAlpha = 1; glow(p.x, p.y, 5, p.c, 0.4 * k); break; }
        case "ember": { drawEmber(p.x, p.y, 1 + k, k); break; }
        case "ash": { ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 3 + p.x); rect(-1.6, -1, 3.2, 2, p.c); ctx.restore(); ctx.globalAlpha = 1; break; }
        case "drop": { circle(p.x, p.y, 1.4, "rgba(207,233,255," + k + ")"); glow(p.x, p.y, 5, C.holy, 0.3 * k); break; }
        case "steam": { circle(p.x, p.y, 4 + (1 - k) * 10, "rgba(220,235,255," + (0.12 * k) + ")"); break; }
        case "smoke": { circle(p.x, p.y, 4 + (1 - k) * 12, hexA(p.c || "#0a0a0c", 0.3 * k)); break; }
        case "chip": { ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r + p.t * 10); poly([-2, -2, 3, 0, -1, 2], p.c); ctx.restore(); ctx.globalAlpha = 1; break; }
        case "flash": { glow(p.x, p.y, p.r * (1.2 - k * 0.4), p.c, 0.8 * k); ring(p.x, p.y, p.r * (1 - k) * 1.4, hexA(p.c, 0.6 * k), 2); break; }
      }
    }
  },
  flareMarks() {
    const F = G.flare;
    if (F.stroke && F.on && !F.chain && F.stroke.length > 1) {
      ctx.beginPath(); ctx.moveTo(F.stroke[0][0], F.stroke[0][1]); for (const p of F.stroke) ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = "rgba(255,226,170,0.75)"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.strokeStyle = "rgba(255,170,70,0.25)"; ctx.lineWidth = 8; ctx.stroke();
    }
    F.marks.forEach((f, i) => {
      if (!Arena.alive(f)) return;
      const [cx, cy] = Arena.chest(f), k = 0.5 + 0.5 * Math.sin(G.rt * 8 + i);
      ring(cx, cy, DEMON_SIZE[f.sin].h * 0.5 + 4 + k * 2, "rgba(255,232,180,0.85)", 1.6);
      text(String(i + 1), cx, cy - DEMON_SIZE[f.sin].h * 0.5 - 10, { align: "center", font: FONT.title, size: 11, weight: 700, color: C.flameHot, glow: "rgba(0,0,0,0.8)", blur: 4 });
    });
  },

  // ---- The counters, in the corners --------------------------------------------------------------------
  hud(paused) {
    const t = G.rt;
    ctx.save();
    // The oil: a small vial, amber, glowing when the flare is ready.
    const ox = 14, oy = 12, ow = 9, oh = 34, ready = G.oil >= T.oilFlareMin;
    rect(ox, oy, ow, oh, "rgba(0,0,0,0.6)");
    const fillH = (oh - 4) * G.oil;
    rect(ox + 2, oy + 2 + (oh - 4) - fillH, ow - 4, fillH, ready ? C.flame : "#8a5a24");
    ctx.strokeStyle = ready ? "rgba(255,200,120,0.9)" : "rgba(233,230,223,0.4)"; ctx.lineWidth = 1; ctx.strokeRect(ox + 0.5, oy + 0.5, ow - 1, oh - 1);
    // The line on the vial where the flare becomes possible.
    rect(ox - 2, oy + 2 + (oh - 4) * (1 - T.oilFlareMin), ow + 4, 1, "rgba(233,230,223,0.5)");
    if (ready && !G.flare.on) glow(ox + ow / 2, oy + oh / 2, 18 + 4 * Math.sin(t * 5), C.flame, 0.4);
    // The lives.
    for (let i = 0; i < T.life; i++) {
      const x = 32 + i * 13, y = 18, full = i < G.life;
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y); ctx.closePath();
      if (full) { ctx.fillStyle = G.practice ? "#bdbdbd" : "#efe9dc"; ctx.fill(); } else { ctx.strokeStyle = "rgba(233,230,223,0.35)"; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // The holy water.
    const fl = G.practice ? 9 : G.flasks;
    for (let i = 0; i < Math.min(fl, 9); i++) {
      const x = 32 + i * 10, y = 34;
      rect(x - 1, y - 7, 2, 2, "#cfd8e0"); poly([x - 1.5, y - 5, x + 1.5, y - 5, x + 3.5, y + 3, x - 3.5, y + 3], "rgba(207,233,255,0.85)");
    }
    if (G.practice) text("∞", 32 + 9 * 10 + 2, 38, { size: 10, color: C.holy });
    if (!G.practice && G.flasks === 0) text("NO HOLY WATER", 32, 38, { size: 7, weight: 700, spacing: 1, color: "rgba(207,233,255,0.5)" });
    // The flow, at the top in the middle.
    if (G.flow >= 2) {
      const lv = G.flow >= 20 ? 1 : G.flow >= 12 ? 0.7 : G.flow >= 5 ? 0.4 : 0.15;
      const col = mix("#e9e6df", C.flame, lv), k = G.flowT > 0 ? 1 : 0.5;
      text(String(G.flow), W / 2, 34, { align: "center", font: FONT.title, size: 24 + lv * 6, weight: 700, color: col, alpha: k, glow: hexA(C.flame, 0.5 * lv), blur: 12 });
      text("FLOW", W / 2, 45, { align: "center", size: 7, weight: 800, spacing: 3, color: "rgba(233,230,223,0.6)", alpha: k });
      const bw = 44, frac = clamp(G.flowT / T.flowWindow, 0, 1);
      rect(W / 2 - bw / 2, 49, bw, 1.5, "rgba(233,230,223,0.15)"); rect(W / 2 - bw / 2, 49, bw * frac, 1.5, hexA(col, 0.8));
    }
    // The wave, top right.
    text(G.practice ? "PRACTICE" : "WAVE " + G.wave, W - 54, 24, { align: "right", size: 9, weight: 800, spacing: 2, color: "rgba(233,230,223,0.7)" });
    pauseButton();
    // A new wave: its number, and a line of Scripture.
    if (!G.practice && G.waveState === "intro" && G.wave > 0) {
      const a = clamp(Math.min(G.waveT / 0.4, (2.8 - G.waveT) / 0.5), 0, 1);
      text("WAVE " + G.wave, W / 2, H * 0.34, { align: "center", font: FONT.title, size: 26, weight: 700, spacing: 6, color: "#ffffff", alpha: a, glow: "rgba(255,179,71,0.5)", blur: 16 });
      if (G.verse) {
        const lines = wrap(G.verse[0], Math.min(460, W - 80), "italic 500 15px " + FONT.line);
        lines.forEach((l, i) => text(l, W / 2, H * 0.34 + 26 + i * 18, { align: "center", font: FONT.line, italic: true, size: 15, weight: 500, color: C.warm, alpha: a }));
        text(G.verse[1], W / 2, H * 0.34 + 30 + lines.length * 18, { align: "center", size: 8, weight: 700, spacing: 2, color: "rgba(233,230,223,0.6)", alpha: a });
      }
    }
    if (!G.practice && G.waveState === "clear") {
      const a = clamp(Math.min(G.waveT / 0.4, (3.4 - G.waveT) / 0.5), 0, 1);
      text("THE HOLLOW IS QUIET", W / 2, H * 0.34, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 4, color: "#ffffff", alpha: a });
      text("A flask of holy water" + (G.wave % 2 === 0 ? ", and a life" : ""), W / 2, H * 0.34 + 22, { align: "center", font: FONT.line, italic: true, size: 14, color: C.holy, alpha: a });
    }
    // A finisher newly open, a virtue earned.
    if (G.toast && !paused) {
      const s = G.toast, a = clamp(Math.min(s.t / 0.3, (4.5 - s.t) / 0.6), 0, 1), y = 74;
      ctx.globalAlpha = a; rect(W / 2 - 190, y - 18, 380, 40, "rgba(5,5,7,0.82)"); ctx.globalAlpha = 1;
      text(s.title, W / 2, y, { align: "center", font: FONT.title, size: 13, weight: 700, spacing: 2, color: s.color, alpha: a, max: 360 });
      text(s.sub, W / 2, y + 14, { align: "center", size: 8.5, weight: 500, color: "#d8d3c8", alpha: a, max: 360 });
    }
    // A hint, at the bottom.
    if (G.hint && !paused) {
      const s = G.hint, a = clamp(Math.min(s.t / 0.4, (7 - s.t) / 0.6), 0, 1);
      const lines = wrap(s.text, Math.min(520, W - 60), "500 10px " + FONT.ui), y = H - 14 - lines.length * 13;
      ctx.globalAlpha = a * 0.85; rect(W / 2 - Math.min(540, W - 40) / 2, y - 12, Math.min(540, W - 40), lines.length * 13 + 10, "rgba(5,5,7,0.8)"); ctx.globalAlpha = 1;
      lines.forEach((l, i) => text(l, W / 2, y + i * 13, { align: "center", size: 10, weight: 500, color: "#ece6d8", alpha: a }));
    }
    // The flare: the edges of the screen breathe with the slowed heartbeat.
    if (G.flare.on) {
      const k = 0.5 + 0.5 * Math.sin(G.rt * 5);
      ctx.strokeStyle = "rgba(255,200,120," + (0.12 + 0.08 * k) + ")"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
    }
    ctx.restore();
  },
};
