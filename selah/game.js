"use strict";
// SELAH: playing a chart. The Voice (the judgment line, split for couplets), the words falling to
// it, the touch, the judging, the score, and the club-cathedral drawn around them.
//
// Time is the audio clock's: what the player hears now (Sound.heard), less the moment the song
// began, less the player's own offset. Touches are judged at the instant they were stamped, not
// at the next frame. Judgment windows: Perfect ±80 ms, Good ±160 ms, Bad ±180 ms (taps only).
const Game = (() => {
  const G = {};
  const PERFECT = 0.08, GOOD = 0.16, BAD = 0.18;
  // The stillness of a Selah is kept from just after it begins until just before the drop, so a
  // touch for the first word after it, a little early as the windows allow, does not break it.
  const STILL_IN = 0.1, STILL_OUT = BAD + 0.02;
  const H = 360;
  let W = 640, cv = null, ctx = null, scale = 1, DPR = 1;
  const C = { void: "#05040a", gold: "#e8c46a", goldHi: "#ffe39a", bone: "#ece4d2", cyan: "#6fe0f0", red: "#e0606a", dim: "rgba(236,228,210,0.42)" };

  // ---- The screen -----------------------------------------------------------------------------------
  G.mount = function (canvas) {
    cv = canvas; ctx = cv.getContext("2d");
    addEventListener("resize", resize); addEventListener("orientationchange", () => setTimeout(resize, 120));
    resize();
    cv.addEventListener("pointerdown", onDown, { passive: false });
    cv.addEventListener("pointermove", onMove, { passive: false });
    for (const k of ["pointerup", "pointercancel", "pointerleave"]) cv.addEventListener(k, onUp, { passive: false });
  };
  function resize() {
    if (!cv) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(Math.max(560, Math.min(820, H * innerWidth / Math.max(1, innerHeight))));
    scale = Math.min(innerWidth / W, innerHeight / H);
    const w = Math.floor(W * scale), h = Math.floor(H * scale);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.style.left = Math.floor((innerWidth - w) / 2) + "px"; cv.style.top = Math.floor((innerHeight - h) / 2) + "px";
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    if (S) measure();
  }
  G.size = () => ({ W, H, scale });

  // ---- A play --------------------------------------------------------------------------------------
  let S = null;          // the state of the play in progress
  // opts: { song, voice ("Douay"), mood (color), settings: { offset (ms), speed (1–10), noFlash, reducedMotion },
  //         onEnd(result), auto (play perfectly, for "Listen") }
  G.start = function (chart, opts) {
    const song = opts.song;
    song.plan = chart.plan;
    S = {
      chart, song, opts, T0: 0, paused: false, ended: false, lastNow: -9, pausedAt: 0,
      st: chart.notes.map(() => ({ done: false, grade: null, hit: false, holding: false, lost: 0, stop: null, dt: 0 })),
      sel: chart.selahs.map(() => ({ done: false, broken: false })),
      combo: 0, maxCombo: 0, acc: 0, judged: 0, n: { perfect: 0, good: 0, bad: 0, miss: 0 }, early: [], level: 1,
      fx: [], floats: [], flash: 0, lastBeat: -1, brokeAt: -9,
      speed: (110 + 34 * (opts.settings.speed || 5)) * chart.speed,
      offset: (opts.settings.offset || 0) / 1000, widths: [],
    };
    measure();
    Sound.setLevel(1);
    S.T0 = Sound.play(song, 0.35);
    pointers.clear();
    cancelAnimationFrame(G.raf); G.raf = requestAnimationFrame(frame);
  };
  G.stop = function () { if (S) { S.st.forEach((x) => x.stop && x.stop()); S.ended = true; } Sound.stop(); cancelAnimationFrame(G.raf); S = null; };
  G.running = () => !!S && !S.ended;
  G.pause = function () {
    if (!S || S.paused || S.ended) return;
    S.paused = true; S.pausedAt = now();
    S.st.forEach((x) => { if (x.stop) { x.stop(); x.stop = null; } });
    Sound.pause();
  };
  G.resume = function () { if (!S || !S.paused) return; Sound.resume().then(() => { S.paused = false; }); };
  G.isPaused = () => !!S && S.paused;

  function measure() {
    if (!S) return;
    S.widths = S.chart.notes.map((n) => { ctx.font = font(n); return ctx.measureText(n.word).width; });
  }
  const font = (n) => n.type === "drag" ? "600 10px Inter, system-ui, sans-serif" : n.accent ? "800 14px Inter, system-ui, sans-serif" : "800 12.5px Inter, system-ui, sans-serif";
  const noteHalf = (n) => Math.max(16, Math.min(70, S.widths[n.id] / 2 + 6));

  // The song's time now, as heard.
  function now() {
    if (!S) return 0;
    if (S.paused) return S.pausedAt;
    const t = Sound.heard(performance.now()) - S.T0 - S.offset;
    S.lastNow = Math.max(S.lastNow, t);
    return S.lastNow;
  }
  const evTime = (ev) => {
    const ms = ev.timeStamp > 1e12 || !ev.timeStamp ? performance.now() : ev.timeStamp;
    return Sound.heard(ms) - S.T0 - S.offset;
  };

  // ---- The Voice ------------------------------------------------------------------------------------
  // A segment's pose: centre (px), angle, length; with the sway of the higher ranks.
  function pose(fi, si, t) {
    const f = S.chart.frames[fi], s = f.segs[Math.min(si, f.segs.length - 1)];
    let ang = s.ang, cy = s.cy * H;
    const m = S.chart.motion;
    if (m) { ang += Math.sin(t * 0.8 + si * 1.7 + fi) * (m === 1 ? 0.015 : 0.05); cy += Math.sin(t * 0.6 + si) * (m === 1 ? 3 : 9); }
    return { cx: s.cx * W, cy, ang, len: s.len * W };
  }
  // The frame the Voice shows at time t, and how far it has moved from the last (0–1).
  function frameAt(t) {
    const F = S.chart.frames, bt = S.chart.barT;
    let k = 0;
    for (let i = 0; i < F.length; i++) if (t >= F[i].t0 - bt * 0.5) k = i;
    const a = (t - (F[k].t0 - bt * 0.5)) / (bt * 0.35);
    return { k, mix: k === 0 ? 1 : Math.max(0, Math.min(1, a)) };
  }
  const ease = (x) => x * x * (3 - 2 * x);
  function voiceSegs(t) {
    const { k, mix } = frameAt(t), F = S.chart.frames, out = [];
    const n = F[k].segs.length;
    for (let i = 0; i < n; i++) {
      const b = pose(k, i, t);
      if (mix < 1 && k > 0) {
        const a = pose(k - 1, Math.min(i, F[k - 1].segs.length - 1), t), e = ease(mix);
        out.push({ cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e, ang: a.ang + (b.ang - a.ang) * e, len: a.len + (b.len - a.len) * e });
      } else out.push(b);
    }
    return out;
  }
  // Where a note is: on its segment at its x, out along the normal by the time still to go.
  function notePos(n, t, along) {
    const p = pose(n.frame, n.seg, t), ux = Math.cos(p.ang), uy = Math.sin(p.ang), nx = Math.sin(p.ang), ny = -Math.cos(p.ang);
    const bx = p.cx + ux * (n.x - 0.5) * p.len, by = p.cy + uy * (n.x - 0.5) * p.len;
    const d = Math.max(0, (along - t)) * S.speed;
    return { x: bx + nx * d, y: by + ny * d, bx, by, ang: p.ang, ux, uy, nx, ny, d };
  }
  // How far a touch is from a note, along its segment (px), and whether it is on the line's side.
  function offAxis(n, pt, t) {
    const p = pose(n.frame, n.seg, t), ux = Math.cos(p.ang), uy = Math.sin(p.ang);
    const bx = p.cx + ux * (n.x - 0.5) * p.len, by = p.cy + uy * (n.x - 0.5) * p.len;
    return Math.abs((pt.x - bx) * ux + (pt.y - by) * uy);
  }

  // ---- Touch -----------------------------------------------------------------------------------------
  const pointers = new Map();
  function toLocal(ev) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H }; }
  function onDown(ev) {
    ev.preventDefault();
    if (!S || S.paused || S.ended || S.opts.auto) return;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
    const p = toLocal(ev), t = evTime(ev);
    pointers.set(ev.pointerId, { x: p.x, y: p.y, t, lx: p.x, ly: p.y, lt: t, armed: true, flickT: -9 });
    breakSelah(t);
    tapAt(p, t);
  }
  function onMove(ev) {
    if (!S || S.paused || S.ended) return;
    const q = pointers.get(ev.pointerId);
    if (!q) return;
    const p = toLocal(ev), t = evTime(ev);
    const dt = Math.max(0.004, t - q.lt), v = Math.hypot(p.x - q.lx, p.y - q.ly) / dt;
    q.x = p.x; q.y = p.y;
    if (v > 520 && q.armed && t - q.flickT > 0.06) { if (flickAt(p, t)) { q.flickT = t; q.armed = false; } }
    if (v < 260) q.armed = true;
    q.lx = p.x; q.ly = p.y; q.lt = t;
  }
  function onUp(ev) { pointers.delete(ev.pointerId); }

  // A touch comes down: the nearest tap or hold head in time and place. A touch that lands on a
  // drag due now is the finger going down for the drag, and does not strike the word after it.
  function tapAt(p, t) {
    for (const n of S.chart.notes) {
      if (n.t - t > 0.1) break;
      if (n.type === "drag" && !S.st[n.id].done && Math.abs(t - n.t) <= 0.06 && offAxis(n, p, t) <= noteHalf(n) + 10) return;
    }
    let best = null, bdt = 9;
    for (const n of S.chart.notes) {
      if (n.type !== "tap" && n.type !== "hold") continue;
      const st = S.st[n.id];
      if (st.done || st.hit) continue;
      const dt = t - n.t, win = n.type === "tap" ? BAD : GOOD;
      if (dt < -win || dt > win) continue;
      if (offAxis(n, p, t) > noteHalf(n) + 22) continue;
      if (Math.abs(dt) < bdt) { best = n; bdt = Math.abs(dt); }
    }
    if (!best) return;
    const dt = t - best.t, st = S.st[best.id];
    const grade = Math.abs(dt) <= PERFECT ? "perfect" : Math.abs(dt) <= GOOD ? "good" : "bad";
    S.early.push(dt);
    if (best.type === "hold" && grade !== "bad") {
      st.hit = true; st.holding = true; st.grade = grade; st.dt = dt; st.lost = 0;
      st.stop = Sound.holdTone(tone(best, 0));
      burst(best, grade, true);
    } else judge(best, grade);
  }
  function flickAt(p, t) {
    for (const n of S.chart.notes) {
      if (n.type !== "flick") continue;
      const st = S.st[n.id];
      if (st.done) continue;
      const dt = t - n.t;
      if (dt < -GOOD || dt > GOOD) continue;
      if (offAxis(n, p, t) > noteHalf(n) + 30) continue;
      S.early.push(dt);
      judge(n, Math.abs(dt) <= PERFECT ? "perfect" : "good");
      return true;
    }
    return false;
  }
  function touchingNear(n, t, extra) {
    for (const q of pointers.values()) if (offAxis(n, q, t) <= noteHalf(n) + extra) return true;
    return false;
  }
  function breakSelah(t) {
    S.chart.selahs.forEach((s, i) => {
      const st = S.sel[i];
      if (!st.done && t >= s.t0 + STILL_IN && t < s.t1 - STILL_OUT) { st.done = true; st.broken = true; miss(null); S.brokeAt = t; }
    });
  }

  // ---- Judging ----------------------------------------------------------------------------------------
  const WEIGHT = { perfect: 1, good: 0.65, bad: 0, miss: 0 };
  function judge(n, grade) {
    if (n) { const st = S.st[n.id]; if (st.done) return; st.done = true; st.grade = grade; }
    S.n[grade]++; S.judged++; S.acc += WEIGHT[grade];
    if (grade === "perfect" || grade === "good") {
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
      if (S.level < 3 && S.combo >= 12 * (S.level + 1)) { S.level++; Sound.setLevel(S.level); }
      if (n) {
        if (n.type === "flick") Sound.flick(tone(n, 1)); else if (n.type !== "hold") Sound.hit(tone(n, n.line + n.tok), grade === "perfect");
        burst(n, grade);
      }
    } else miss(n);
  }
  function miss(n) {
    if (n) { const st = S.st[n.id]; if (!st.done) { st.done = true; st.grade = "miss"; S.n.miss++; S.judged++; } }
    else { S.n.miss++; S.judged++; }
    S.combo = 0;
    if (S.level > 0) { S.level--; Sound.setLevel(S.level); }
    if (n) S.floats.push({ n, t0: now(), kind: "miss" });
  }
  function tone(n, k) {
    const bar = Math.floor(n.t / S.chart.barT), tones = S.song.tones ? S.song.tones(bar) : [72, 76, 79];
    return tones[Math.abs(k) % tones.length];
  }
  // Every frame: notes that have passed unhit, drags and holds under a finger, Selahs kept.
  function sweep(t) {
    for (const n of S.chart.notes) {
      const st = S.st[n.id];
      if (st.done) continue;
      if (n.t - t > 0.3) break;
      if (S.opts.auto) { autoPlay(n, st, t); continue; }
      if (n.type === "drag") {
        if (t >= n.t - 0.03 && t <= n.t + GOOD && touchingNear(n, t, 26)) judge(n, "perfect");
        else if (t > n.t + GOOD) miss(n);
      } else if (n.type === "hold" && st.holding) {
        if (touchingNear(n, t, 34)) st.lost = 0; else st.lost += 1 / 60;
        if (st.lost > 0.12 && t < n.t2 - 0.15) { st.holding = false; if (st.stop) { st.stop(); st.stop = null; } miss(n); }
        else if (t >= n.t2) { st.holding = false; if (st.stop) { st.stop(); st.stop = null; } judge(n, st.grade); }
      } else if (t > n.t + (n.type === "tap" ? BAD : GOOD)) miss(n);
    }
    S.chart.selahs.forEach((s, i) => {
      const st = S.sel[i];
      if (st.done) return;
      if (!S.opts.auto && t >= s.t0 + STILL_IN && t < s.t1 - STILL_OUT && pointers.size) { st.done = true; st.broken = true; S.brokeAt = t; miss(null); }
      else if (t >= s.t1 - STILL_OUT) { st.done = true; judge(null, "perfect"); }
    });
  }
  // Listen: the chart played perfectly, for the title and for testing.
  function autoPlay(n, st, t) {
    if (n.type === "hold") {
      if (!st.hit && t >= n.t) { st.hit = true; st.holding = true; st.grade = "perfect"; st.stop = Sound.holdTone(tone(n, 0)); burst(n, "perfect", true); }
      if (st.holding && t >= n.t2) { st.holding = false; if (st.stop) { st.stop(); st.stop = null; } judge(n, "perfect"); }
    } else if (t >= n.t) { S.early.push(0); judge(n, "perfect"); }
  }

  // ---- Effects ------------------------------------------------------------------------------------------
  function burst(n, grade, holdStart) {
    const p = notePos(n, now(), now()), col = grade === "perfect" ? C.gold : C.bone, k = grade === "perfect" ? 7 : 4;
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + p.ang + (Math.random() - 0.5) * 2.2, v = 60 + Math.random() * 90;
      S.fx.push({ x: p.bx, y: p.by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 2.5 + Math.random() * 3, life: 0.5, t: 0, col });
    }
    if (!holdStart && n.type !== "drag") S.floats.push({ n, t0: now(), kind: grade });
  }

  // ---- The frame ------------------------------------------------------------------------------------------
  function frame() {
    G.raf = requestAnimationFrame(frame);
    if (!S) return;
    const t = now();
    if (!S.paused && !S.ended) {
      sweep(t);
      if (t >= S.chart.endT) finish();
    }
    draw(t);
  }
  function finish() {
    if (S.ended) return;
    S.ended = true;
    Sound.stop();
    const N = S.chart.count || 1;
    const score = Math.round(900000 * S.acc / N + 100000 * S.maxCombo / N);
    const all = S.n.perfect === N, fc = S.n.miss === 0 && S.n.bad === 0;
    const grade = all ? "AMEN" : score >= 960000 ? "S+" : score >= 920000 ? "S" : score >= 880000 ? "A" : score >= 820000 ? "B" : score >= 700000 ? "C" : "F";
    // The verse played best: the most of its notes hit perfectly.
    let best = null, bestK = -1;
    S.chart.verses.forEach((v, vi) => {
      const mine = S.chart.notes.filter((n) => n.verse === vi);
      if (!mine.length) return;
      const k = mine.filter((n) => S.st[n.id].grade === "perfect").length / mine.length;
      if (k > bestK) { bestK = k; best = v; }
    });
    const result = { score, grade, fc, all, accuracy: S.acc / N, maxCombo: S.maxCombo, n: { ...S.n }, total: N, early: S.early.slice(), bestVerse: best, auto: !!S.opts.auto };
    const done = S.opts.onEnd;
    setTimeout(() => done && done(result), 900);
  }

  // ---- Drawing ----------------------------------------------------------------------------------------------
  const hex = (h, a) => { const n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; };
  function draw(t) {
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
    const ch = S.chart, mood = moodAt(t), beatT = 60 / ch.bpm, beat = t / beatT, ph = beat - Math.floor(beat);
    const pulse = t > 0 && t < ch.endT ? Math.exp(-ph * 5) : 0;
    const rm = S.opts.settings.reducedMotion, nf = S.opts.settings.noFlash;
    const inSelah = ch.selahs.findIndex((s) => t >= s.t0 && t < s.t1);
    const still = inSelah >= 0 ? 1 : 0;
    background(t, mood, pulse * (1 - still * 0.85), rm);
    // The Voice.
    const segs = voiceSegs(t);
    for (const p of segs) line(p, mood, pulse * (1 - still), still);
    // Unjudged words drift down to the line and fade there.
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    for (const g of ch.ghosts) {
      if (g.t - t > 1.6 || t - g.t > 0.45) continue;
      const p = notePos(g, t, g.t), a = (t > g.t ? 1 - (t - g.t) / 0.45 : Math.min(1, (1.6 - (g.t - t)) / 0.4)) * 0.5;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.font = "500 10px Inter, system-ui, sans-serif"; ctx.fillStyle = hex("#ece4d2", a.toFixed(3)); ctx.fillText(g.word, 0, -5);
      ctx.restore();
    }
    // The notes, farthest first.
    for (let i = ch.notes.length - 1; i >= 0; i--) {
      const n = ch.notes[i], st = S.st[n.id];
      if (st.done && !(n.type === "hold" && st.holding)) continue;
      const lead = n.t - t;
      if (lead > 2.2) continue;
      if (n.type !== "hold" && lead < -0.3) continue;
      drawNote(n, st, t, mood);
    }
    // Words struck rise from the line; words missed fall away.
    S.floats = S.floats.filter((f) => t - f.t0 < 0.7);
    for (const f of S.floats) {
      const k = (t - f.t0) / 0.7, p = notePos(f.n, t, t);
      ctx.save(); ctx.translate(p.bx, p.by); ctx.rotate(p.ang);
      ctx.font = font(f.n);
      const col = f.kind === "miss" ? C.red : f.kind === "perfect" ? C.goldHi : f.kind === "good" ? C.bone : C.dim;
      ctx.fillStyle = hex(col, (1 - k) * (f.kind === "miss" ? 0.6 : 0.95));
      ctx.fillText(f.n.word, 0, f.kind === "miss" ? 10 + k * 18 : -12 - k * 22);
      ctx.restore();
    }
    // Sparks.
    ctx.globalCompositeOperation = "lighter";
    S.fx = S.fx.filter((p) => (p.t += 1 / 60) < p.life);
    for (const p of S.fx) {
      const k = p.t / p.life; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 120 / 60;
      ctx.fillStyle = hex(p.col, (1 - k) * 0.9); const s = p.s * (1 - k * 0.5);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = "source-over";
    // Selah.
    if (inSelah >= 0) selahCard(ch.selahs[inSelah], S.sel[inSelah], t, mood);
    // The drop after a kept Selah: a flash of the mood color (none with "No flashing").
    if (!nf) {
      const dropAt = ch.selahs.find((s) => t >= s.t1 && t < s.t1 + 0.25);
      if (dropAt) { ctx.fillStyle = hex(mood, (0.16 * (1 - (t - dropAt.t1) / 0.25)).toFixed(3)); ctx.fillRect(0, 0, W, H); }
    }
    verseText(t);
    titleCard(t);
    hud(t);
  }
  function moodAt(t) {
    const m = S.opts.mood || C.gold;
    if (!S.opts.spectrum || !S.chart.plan.cue("all", Math.floor(t / S.chart.barT))) return m;
    const h = (40 + t * 24) % 360;
    return hsl(h, 80, 66);
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return "#" + to(f(0)) + to(f(8)) + to(f(4));
  }
  // The club-cathedral: a void, a vault of laser ribs from a point overhead, LED columns.
  function background(t, mood, pulse, rm) {
    ctx.fillStyle = C.void; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.72, 10, W / 2, H * 0.72, W * 0.7);
    g.addColorStop(0, hex(mood, (0.10 + pulse * 0.05).toFixed(3))); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ax = W / 2, ay = -60, turn = rm ? 0 : Math.sin(t * 0.13) * 0.18, ribs = 11;
    ctx.lineWidth = 1;
    for (let i = 0; i < ribs; i++) {
      const a = Math.PI / 2 + ((i / (ribs - 1)) - 0.5) * 1.9 + turn;
      const x2 = ax + Math.cos(a) * 900, y2 = ay + Math.sin(a) * 900;
      const lg = ctx.createLinearGradient(ax, ay, x2, y2);
      lg.addColorStop(0, hex(mood, 0)); lg.addColorStop(0.35, hex(mood, (0.10 + pulse * 0.10).toFixed(3))); lg.addColorStop(1, hex(mood, 0));
      ctx.strokeStyle = lg; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // the arches the ribs make, faint
    ctx.strokeStyle = hex(C.gold, 0.05); ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(W / 2, H * 1.05, W * (0.22 + k * 0.14), H * (0.55 + k * 0.17), 0, Math.PI, 2 * Math.PI); ctx.stroke(); }
    // LED columns at the sides, pulsing with the kick and growing with the band.
    const lvl = S.level / 3;
    for (const side of [0, 1]) for (let k = 0; k < 3; k++) {
      const x = side ? W - 14 - k * 9 : 14 + k * 9, h = H * (0.22 + 0.5 * lvl * (1 - k * 0.25)) * (0.75 + pulse * 0.25);
      const lg = ctx.createLinearGradient(0, H, 0, H - h);
      lg.addColorStop(0, hex(k === 0 ? C.gold : mood, 0.32 - k * 0.08)); lg.addColorStop(1, hex(mood, 0));
      ctx.fillStyle = lg; ctx.fillRect(x - 1.5, H - h, 3, h);
    }
  }
  function line(p, mood, pulse, still) {
    const ux = Math.cos(p.ang), uy = Math.sin(p.ang), x1 = p.cx - ux * p.len / 2, y1 = p.cy - uy * p.len / 2, x2 = p.cx + ux * p.len / 2, y2 = p.cy + uy * p.len / 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = hex(C.gold, (0.16 + pulse * 0.12) * (1 - still * 0.7)); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = hex(C.goldHi, (0.95 - still * 0.6).toFixed(3)); ctx.lineWidth = still ? 1 : 2.2 + pulse * 0.8; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = hex(C.goldHi, 0.9 - still * 0.5);
    for (const [x, y] of [[x1, y1], [x2, y2]]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
  }
  // A note, drawn from its point on the Voice, out along the normal (up, in its own frame).
  function drawNote(n, st, t, mood) {
    const p = notePos(n, t, n.t), w = Math.max(28, Math.min(130, S.widths[n.id] + 14));
    const appear = Math.max(0, Math.min(1, (2.2 - (n.t - t)) / 0.35));
    const d = st.holding ? 0 : p.d;
    ctx.save(); ctx.translate(p.bx, p.by); ctx.rotate(p.ang);
    const col = n.type === "flick" ? C.cyan : n.type === "drag" ? C.bone : n.accent ? C.goldHi : C.gold;
    const a = n.type === "drag" ? 0.6 * appear : appear;
    if (n.type === "hold") {
      const tail = Math.max(d, (n.t2 - t) * S.speed);
      ctx.fillStyle = hex(C.gold, (st.holding ? 0.36 : 0.2) * a);
      ctx.fillRect(-w / 2 + 3, -tail, w - 6, tail - d);
    }
    // the bar that meets the line
    ctx.fillStyle = hex(col, a); roundRect(-w / 2, -d - 2.6, w, n.type === "drag" ? 3.2 : 5.2, 2.6); ctx.fill();
    if (n.accent) { ctx.fillStyle = hex(C.goldHi, 0.25 * a); roundRect(-w / 2 - 3, -d - 6, w + 6, 12, 6); ctx.fill(); }
    if (n.type === "flick") {
      ctx.strokeStyle = hex(C.cyan, a); ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(-8, -d - 9); ctx.lineTo(0, -d - 15); ctx.lineTo(8, -d - 9); ctx.stroke();
    }
    ctx.font = font(n); ctx.textAlign = "center";
    ctx.fillStyle = hex(n.type === "drag" ? C.bone : col, (n.type === "drag" ? 0.75 : 1) * a);
    ctx.fillText(n.word, 0, -d - (n.type === "flick" ? 18 : 7));
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function selahCard(s, st, t, mood) {
    const k = (t - s.t0) / (s.t1 - s.t0);
    ctx.textAlign = "center";
    ctx.font = "200 34px Inter, system-ui, sans-serif";
    const word = "S E L A H";
    ctx.fillStyle = hex(st.broken ? C.red : C.bone, (st.broken ? 0.5 : 0.35 + 0.35 * Math.sin(k * Math.PI)).toFixed(3));
    ctx.fillText(word, W / 2, H * 0.44);
    ctx.font = "500 9px Inter, system-ui, sans-serif";
    ctx.fillStyle = hex(C.bone, 0.45);
    ctx.fillText(st.broken ? "THE STILLNESS WAS BROKEN" : "BE STILL", W / 2, H * 0.44 + 18);
    // the stillness kept so far: a hairline growing out from the middle
    if (!st.broken) { ctx.fillStyle = hex(mood, 0.6); const w = 150 * k; ctx.fillRect(W / 2 - w / 2, H * 0.44 + 27, w, 1); }
  }
  // The verse being sung, under the Voice: the words lit as they are struck.
  function verseText(t) {
    const ch = S.chart, bt = ch.barT;
    let vi = -1;
    for (let i = 0; i < ch.verses.length; i++) if (t >= ch.verses[i].t0 - bt * 0.6) vi = i;
    if (vi < 0) return;
    const v = ch.verses[vi], fade = Math.min(1, (t - (v.t0 - bt * 0.6)) / 0.3) * Math.min(1, (ch.endT - bt - t) / 0.6 + 0.0001);
    if (fade <= 0) return;
    let size = 13.5;
    const rows = v.lines.map((l) => l.tokens);
    const maxW = W * 0.84;
    const widthOf = (toks) => { ctx.font = "italic 500 " + size + "px 'Cormorant Garamond', Georgia, serif"; return ctx.measureText(toks.map((x) => x.text).join(" ")).width; };
    while (size > 9.5 && rows.some((r) => widthOf(r) > maxW)) size -= 0.5;
    ctx.font = "italic 500 " + size + "px 'Cormorant Garamond', Georgia, serif";
    ctx.textAlign = "left";
    const lh = size * 1.18, top = H - 8 - lh * (rows.length - 1);
    rows.forEach((toks, r) => {
      const space = ctx.measureText(" ").width, total = widthOf(toks);
      let x = W / 2 - Math.min(total, maxW) / 2;
      const y = top + r * lh;
      ctx.font = "italic 500 " + size + "px 'Cormorant Garamond', Georgia, serif";
      for (const tk of toks) {
        let col = hex(C.bone, 0.45 * fade);
        if (tk.note >= 0) { const g = S.st[tk.note].grade; col = g === "perfect" ? hex(C.goldHi, fade) : g === "good" ? hex(C.gold, 0.85 * fade) : g === "miss" || g === "bad" ? hex(C.red, 0.55 * fade) : hex(C.bone, 0.7 * fade); }
        else if (tk.ghost >= 0 && ch.ghosts[tk.ghost].t <= t) col = hex(C.bone, 0.75 * fade);
        ctx.fillStyle = col; ctx.fillText(tk.text, x, y);
        x += ctx.measureText(tk.text).width + space;
      }
    });
    if (v.heading) { ctx.font = "600 7.5px Inter, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = hex(C.gold, 0.6 * fade); ctx.fillText(v.heading.toUpperCase(), W / 2, top - lh); }
  }
  // Before the first words: the psalm's number, its incipit, its heading.
  function titleCard(t) {
    const ch = S.chart, first = ch.notes.length ? ch.notes[0].t : ch.barT * 2;
    const a = t < first - 1.2 ? 1 : Math.max(0, (first - 0.5 - t) / 0.7);
    if (a <= 0) return;
    ctx.textAlign = "center";
    ctx.fillStyle = hex(C.bone, 0.9 * a); ctx.font = "200 26px Inter, system-ui, sans-serif";
    ctx.fillText("PSALM " + ch.psalm, W / 2, H * 0.36);
    ctx.fillStyle = hex(C.gold, 0.9 * a); ctx.font = "italic 500 16px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText(ch.incipit, W / 2, H * 0.36 + 22);
    if (ch.titleLines.length) {
      ctx.fillStyle = hex(C.bone, 0.55 * a); ctx.font = "italic 500 12px 'Cormorant Garamond', Georgia, serif";
      ch.titleLines.slice(0, 2).forEach((l, i) => ctx.fillText(l.length > 90 ? l.slice(0, 88) + "…" : l, W / 2, H * 0.36 + 42 + i * 14));
    }
  }
  function hud(t) {
    const ch = S.chart, N = ch.count || 1;
    const score = Math.round(900000 * S.acc / N + 100000 * S.maxCombo / N);
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.bone; ctx.font = "300 17px Inter, system-ui, sans-serif";
    ctx.fillText(String(score).padStart(7, "0"), W - 16, 24);
    ctx.font = "600 7.5px Inter, system-ui, sans-serif"; ctx.fillStyle = hex(C.bone, 0.55);
    const acc = S.judged ? (100 * S.acc / S.judged).toFixed(2) : "100.00";
    ctx.fillText(acc + "%  ·  VOICE: " + S.opts.voice.toUpperCase(), W - 16, 36);
    ctx.textAlign = "left"; ctx.fillStyle = hex(C.bone, 0.75);
    ctx.font = "600 8px Inter, system-ui, sans-serif"; ctx.fillText("PSALM " + ch.psalm + "  ·  " + ch.rankName.toUpperCase(), 46, 20);
    ctx.font = "italic 500 11px 'Cormorant Garamond', Georgia, serif"; ctx.fillStyle = hex(C.gold, 0.8); ctx.fillText(ch.incipit, 46, 33);
    if (S.combo >= 3) {
      ctx.textAlign = "center"; ctx.fillStyle = C.bone; ctx.font = "200 24px Inter, system-ui, sans-serif"; ctx.fillText(String(S.combo), W / 2, 30);
      ctx.font = "600 7px Inter, system-ui, sans-serif"; ctx.fillStyle = hex(C.gold, 0.8); ctx.fillText("COMBO", W / 2, 40);
    }
    // progress, a hairline along the top
    ctx.fillStyle = hex(C.gold, 0.5); ctx.fillRect(0, 0, W * Math.max(0, Math.min(1, t / ch.endT)), 1.5);
    if (S.opts.auto) { ctx.textAlign = "center"; ctx.font = "600 7.5px Inter, system-ui, sans-serif"; ctx.fillStyle = hex(C.bone, 0.5); ctx.fillText("LISTENING", W / 2, H * 0.62 - 50 > 50 ? 52 : 52); }
  }
  G.state = () => S;
  // For tests: the clock, and where a note meets the Voice (page pixels).
  G.debug = { now: () => now(), at(n, t) { const p = notePos(n, t, t), r = cv.getBoundingClientRect(); return { x: r.left + p.bx / W * r.width, y: r.top + p.by / H * r.height, nx: p.nx, ny: p.ny }; } };
  return G;
})();
