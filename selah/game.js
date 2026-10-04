"use strict";
// SELAH: playing a chart. The Voice (the judgment line), the words falling to it, the touch, the
// judging, the score, and the club-cathedral drawn around them. Every note is a tap.
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
  const C = { void: "#05040a", gold: "#e8c46a", goldHi: "#ffe39a", bone: "#ece4d2", cyan: "#6fe0f0", red: "#e0606a", dim: "rgba(236,228,210,0.42)",
    kick: "#f0a24e", tom: "#7fd8c4" };
  // The color of each drum's notes.
  const LANE_COL = { kick: C.kick, snare: C.gold, hat: C.bone, tom1: C.tom, tom2: C.tom, tom3: C.tom, crash: C.cyan };

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
    if (S) { sprites.clear(); measure(); }
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
      st: chart.notes.map(() => ({ done: false, grade: null })),
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
  G.stop = function () { if (S) S.ended = true; Sound.stop(); cancelAnimationFrame(G.raf); S = null; };
  G.running = () => !!S && !S.ended;
  G.pause = function () {
    if (!S || S.paused || S.ended) return;
    S.paused = true; S.pausedAt = now();
    Sound.pause();
  };
  G.resume = function () { if (!S || !S.paused) return; Sound.resume().then(() => { S.paused = false; }); };
  G.isPaused = () => !!S && S.paused;

  function measure() {
    if (!S) return;
    sprites.clear();
    S.looks = S.chart.notes.map(look);
  }

  // ---- Glowing words ------------------------------------------------------------------------------------
  // Every drum but the kick is its word, in capitals, glowing in the drum's color; a stroke with no
  // word is a short glowing line. Each is drawn once, off screen, glow and all, and then stamped where
  // it falls, so a phone can carry hundreds.
  const sprites = new Map();
  const CORE = { "#e8c46a": "#fff5da", "#ffe39a": "#fffbef", "#7fd8c4": "#ecfffa", "#6fe0f0": "#effdff", "#f0a24e": "#fff1de", "#ece4d2": "#ffffff", "#e0606a": "#ffe3e5" };
  function glow(text, col, size) {
    const key = text + "|" + col + "|" + size;
    let sp = sprites.get(key);
    if (sp) return sp;
    const k = DPR * scale, c = document.createElement("canvas"), g = c.getContext("2d");
    const font = "700 " + size + "px Inter, system-ui, sans-serif", track = size * 0.1;
    g.font = font;
    const mark = text === "—";
    let w = 0;
    if (mark) w = size * 2.2; else { for (const chr of text) w += g.measureText(chr).width + track; w -= track; }
    const pad = Math.ceil(size * 0.6);
    c.width = Math.max(2, Math.ceil((w + pad * 2) * k)); c.height = Math.ceil((size + pad * 2) * k);
    g.scale(k, k);
    const cx = pad + w / 2, cy = pad + size / 2;
    const paint = () => {
      if (mark) { const h = Math.max(2.5, size * 0.24); rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill(); return; }
      g.font = font; g.textBaseline = "middle"; g.textAlign = "left";
      let x = pad;
      for (const chr of text) { g.fillText(chr, x, cy + size * 0.05); x += g.measureText(chr).width + track; }
    };
    // the glow (shadow blur is in the canvas's own pixels, so it is scaled by hand), then the bright core
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = size * 0.75 * k; paint(); paint();
    g.shadowBlur = size * 0.18 * k; g.fillStyle = CORE[col] || "#ffffff"; paint();
    sp = { c, w: c.width / k, h: c.height / k, tw: w };
    sprites.set(key, sp);
    return sp;
  }
  // A word as large as it can be, up to a width that keeps it among its neighbours.
  function fitGlow(text, col, size) {
    let sp = glow(text, col, size);
    if (sp.tw > 210 && size > 12) sp = glow(text, col, Math.max(12, Math.floor(size * 210 / sp.tw)));
    return sp;
  }
  // How a note looks: its word, or (a stroke with no word) a glowing line; the hat's line is shorter.
  function look(n) {
    if (isKick(n)) return n.word ? fitGlow(n.word.toUpperCase(), C.kick, 15) : null;
    if (!n.word) return glow("—", LANE_COL[n.lane], n.lane === "hat" ? 11 : 15);
    return fitGlow(n.word.toUpperCase(), n.latin ? C.gold : n.accent ? C.goldHi : LANE_COL[n.lane], n.accent ? 22 : 19);
  }
  function stamp(sp, x, y, a, s) {
    if (!sp) return;
    s = s || 1; ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(sp.c, x - sp.w * s / 2, y - sp.h * s / 2, sp.w * s, sp.h * s);
    ctx.globalAlpha = 1;
  }
  const noteHalf = (n) => (isKick(n) ? 0 : 30);

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

  // ---- The Voice: one straight line, and the drum kit along it ------------------------------------------
  // Hi-hat at the left, snare, toms, the crash at the right; the kick is the whole line.
  const LINE_Y = 0.74, LINE_LEN = 0.86;
  const line0 = () => ({ cx: W / 2, cy: H * LINE_Y, len: W * LINE_LEN, ang: 0 });
  const isKick = (n) => n.lane === "kick";
  // Where a note is: at its place on the line, above it by the time still to go.
  function notePos(n, t, along) {
    const p = line0(), bx = p.cx + (n.x - 0.5) * p.len, by = p.cy, d = Math.max(0, along - t) * S.speed;
    return { x: bx, y: by - d, bx, by, ang: 0, nx: 0, ny: -1, d };
  }
  // How far a touch is from a note, along the line (px). Anywhere on the line is on the kick.
  function offAxis(n, pt) {
    const p = line0();
    if (isKick(n)) return Math.max(0, Math.abs(pt.x - p.cx) - p.len / 2);
    return Math.abs(pt.x - (p.cx + (n.x - 0.5) * p.len));
  }

  // ---- Touch -----------------------------------------------------------------------------------------
  const pointers = new Map();
  function toLocal(ev) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H }; }
  function onDown(ev) {
    ev.preventDefault();
    if (!S || S.paused || S.ended || S.opts.auto) return;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
    const p = toLocal(ev), t = evTime(ev);
    pointers.set(ev.pointerId, { x: p.x, y: p.y });
    breakSelah(t);
    tapAt(p, t);
  }
  function onMove(ev) {
    const q = pointers.get(ev.pointerId);
    if (q) { const p = toLocal(ev); q.x = p.x; q.y = p.y; }
  }
  function onUp(ev) { pointers.delete(ev.pointerId); }

  // A touch comes down on a place. Of the notes there it could strike (and the kick, which is
  // everywhere), the earliest within a Perfect of the touch, as in most rhythm games, so that a touch
  // a little late for one note never takes the next and leaves the first behind; failing that, the
  // nearest in time. Two at once: the drum whose place it is before the kick, so two thumbs can
  // strike a kick and a snare together.
  function tapAt(p, t) {
    let best = null, bs = 9, near = false;
    for (const n of S.chart.notes) {
      if (n.t - t > BAD) break;
      if (S.st[n.id].done) continue;
      const dt = t - n.t;
      if (dt < -BAD || dt > BAD) continue;
      const off = offAxis(n, p);
      if (off > noteHalf(n) + 22) continue;
      const tie = (isKick(n) ? 0.002 : 0) + off * 0.00001, inPerfect = Math.abs(dt) <= PERFECT;
      if (inPerfect && !near) { near = true; bs = 9; }
      if (near && !inPerfect) continue;
      const score = (near ? n.t - t : Math.abs(dt)) + tie;
      if (score < bs) { best = n; bs = score; }
    }
    if (!best) return;
    const dt = t - best.t;
    S.early.push(dt);
    judge(best, Math.abs(dt) <= PERFECT ? "perfect" : Math.abs(dt) <= GOOD ? "good" : "bad");
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
      if (n) { Sound.tick(grade === "perfect", n.lane); burst(n, grade); }
    } else miss(n);
  }
  function miss(n) {
    if (n) { const st = S.st[n.id]; if (!st.done) { st.done = true; st.grade = "miss"; S.n.miss++; S.judged++; } }
    else { S.n.miss++; S.judged++; }
    S.combo = 0;
    if (S.level > 0) { S.level--; Sound.setLevel(S.level); }
    if (n) { Sound.knock(); if (n.word) S.floats.push({ n, t0: now(), kind: "miss" }); }
  }
  // Every frame: notes that have passed unhit, Selahs kept.
  function sweep(t) {
    for (const n of S.chart.notes) {
      if (S.st[n.id].done) continue;
      if (n.t - t > 0.3) break;
      if (S.opts.auto) { if (t >= n.t) { S.early.push(0); judge(n, "perfect"); } continue; }
      if (t > n.t + BAD) miss(n);
    }
    S.chart.selahs.forEach((s, i) => {
      const st = S.sel[i];
      if (st.done) return;
      if (!S.opts.auto && t >= s.t0 + STILL_IN && t < s.t1 - STILL_OUT && pointers.size) { st.done = true; st.broken = true; S.brokeAt = t; miss(null); }
      else if (t >= s.t1 - STILL_OUT) { st.done = true; judge(null, "perfect"); }
    });
  }
  // ---- Effects ------------------------------------------------------------------------------------------
  function burst(n, grade) {
    const p = notePos(n, now(), now()), col = grade === "perfect" ? (isKick(n) ? C.kick : C.gold) : C.bone;
    if (isKick(n)) { S.kickFlash = { t0: now(), col }; }
    const k = n.lane === "hat" ? 3 : grade === "perfect" ? 7 : 4, L = line0();
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 60 + Math.random() * 90;
      const x = isKick(n) ? L.cx + (Math.random() - 0.5) * L.len : p.bx;
      S.fx.push({ x, y: p.by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 2.5 + Math.random() * 3, life: 0.5, t: 0, col });
    }
    S.floats.push({ n, t0: now(), kind: grade });
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
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const hex = (h, a) => { const n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; };
  function draw(t) {
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
    const ch = S.chart, mood = moodAt(t), beatT = 60 / ch.bpm, beat = t / beatT, ph = beat - Math.floor(beat);
    const pulse = t > 0 && t < ch.endT ? Math.exp(-ph * 5) : 0;
    const rm = S.opts.settings.reducedMotion, nf = S.opts.settings.noFlash;
    const inSelah = ch.selahs.findIndex((s) => t >= s.t0 && t < s.t1);
    const still = inSelah >= 0 ? 1 : 0;
    background(t, mood, pulse * (1 - still * 0.85), rm);
    // The Voice, and the kit marked along it.
    line(line0(), mood, pulse * (1 - still), still);
    lanes(still);
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
      if (st.done) continue;
      const lead = n.t - t;
      if (lead > 2.2 || lead < -0.3) continue;
      drawNote(n, st, t, mood);
    }
    // A kick struck: the whole line flares.
    if (S.kickFlash && t - S.kickFlash.t0 < 0.18) {
      const L = line0(), k = (t - S.kickFlash.t0) / 0.18;
      ctx.fillStyle = hex(S.kickFlash.col, (0.35 * (1 - k)).toFixed(3)); ctx.fillRect(L.cx - L.len / 2, L.cy - 4 - 6 * (1 - k), L.len, 8 + 12 * (1 - k));
    }
    // Words struck rise from the line and swell as they fade; words missed fall away, red.
    S.floats = S.floats.filter((f) => t - f.t0 < 0.6);
    for (const f of S.floats) {
      const k = (t - f.t0) / 0.6, p = notePos(f.n, t, t), x = clampX(f.n, p.bx), y = isKick(f.n) ? p.by - 11 : p.by;
      if (f.kind === "miss") { if (f.n.word) stamp(fitGlow(f.n.word.toUpperCase(), C.red, 17), x, y + 6 + k * 20, (1 - k) * 0.55); }
      else stamp(S.looks[f.n.id], x, y - 4 - k * 26, (1 - k) * (f.kind === "perfect" ? 1 : 0.7), 1 + k * 0.3);
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
  // The places of the kit, marked under the line: faint ticks and their names.
  function lanes(still) {
    const L = line0(), names = { hat: "HAT", snare: "SNARE", tom2: "TOMS", crash: "CRASH" };
    ctx.textAlign = "center"; ctx.font = "600 6.5px Inter, system-ui, sans-serif";
    for (const k of ["hat", "snare", "tom1", "tom2", "tom3", "crash"]) {
      const x = L.cx + (Compiler.LANES[k] - 0.5) * L.len;
      ctx.fillStyle = hex(LANE_COL[k], 0.5 * (1 - still * 0.6)); ctx.fillRect(x - 0.75, L.cy - 6, 1.5, 12);
      if (names[k]) { ctx.fillStyle = hex(C.bone, 0.32 * (1 - still)); ctx.fillText(names[k], x, L.cy + 18); }
    }
    ctx.fillStyle = hex(C.kick, 0.32 * (1 - still)); ctx.fillText("KICK · ANYWHERE ON THE LINE", L.cx + 0.13 * L.len, L.cy + 28);
  }
  // A word's place across the screen: over its note, kept from running off the edge.
  function clampX(n, x) {
    const w = (S.looks[n.id] ? S.looks[n.id].tw : 0) / 2 + 8;
    return Math.max(w, Math.min(W - w, x));
  }
  // A note. The kick: a bar across the whole line, its word riding above it. Every other drum: its
  // word, glowing, whose middle meets the line on the stroke (or a short line, a stroke with no word).
  function drawNote(n, st, t, mood) {
    const p = notePos(n, t, n.t), L = line0();
    const appear = Math.max(0, Math.min(1, (2.2 - (n.t - t)) / 0.35));
    const col = LANE_COL[n.lane] || C.gold, sp = S.looks[n.id], y = p.by - p.d;
    if (isKick(n)) {
      ctx.fillStyle = hex(col, 0.16 * appear); ctx.fillRect(L.cx - L.len / 2, y - 6, L.len, 12);
      ctx.fillStyle = hex(col, 0.85 * appear); roundRect(L.cx - L.len / 2, y - 2.5, L.len, 5, 2.5); ctx.fill();
      stamp(sp, clampX(n, p.bx), y - 11, appear);
      return;
    }
    stamp(sp, n.word ? clampX(n, p.bx) : p.bx, y, appear);
  }
  const roundRect = (x, y, w, h, r) => rr(ctx, x, y, w, h, r);
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
    // the verse whose strokes are reaching the line now (it changes an eighth before the next begins)
    const lead = ch.sd * 2;
    for (let i = 0; i < ch.verses.length; i++) if (t >= ch.verses[i].t0 - lead) vi = i;
    if (vi < 0) return;
    const v = ch.verses[vi], fade = Math.min(1, (t - (v.t0 - lead)) / 0.2) * Math.min(1, (ch.endT - bt - t) / 0.6 + 0.0001);
    if (fade <= 0) return;
    let size = v.latin ? 15 : 13.5;
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
        // the stroke this word rides (in the Latin, which comes round again, the latest one)
        let id = tk.note;
        if (tk.notes && tk.notes.length) { id = -1; for (const k of tk.notes) if (ch.notes[k].t <= t + 0.4) id = k; }
        if (id >= 0) { const g = S.st[id].grade; col = g === "perfect" ? hex(C.goldHi, fade) : g === "good" ? hex(C.gold, 0.85 * fade) : g === "miss" || g === "bad" ? hex(C.red, 0.55 * fade) : hex(C.bone, 0.7 * fade); }
        ctx.fillStyle = col; ctx.fillText(tk.text, x, y);
        x += ctx.measureText(tk.text).width + space;
      }
    });
    if (v.heading) { ctx.font = "600 7.5px Inter, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = hex(C.gold, 0.6 * fade); ctx.fillText(v.heading.toUpperCase(), W / 2, top - lh); }
  }
  // Through the intro: the psalm's number, its incipit, its heading (behind the falling notes).
  function titleCard(t) {
    const ch = S.chart, intro = ch.plan.bars.find((B) => B.sec !== "intro"), end = intro ? intro.t0 : ch.barT * 2;
    const a = t < end * 0.55 ? 1 : Math.max(0, (end - t) / (end * 0.45));
    if (a <= 0) return;
    ctx.textAlign = "center";
    ctx.fillStyle = hex(C.bone, 0.85 * a); ctx.font = "200 26px Inter, system-ui, sans-serif";
    ctx.fillText("PSALM " + ch.psalm, W / 2, H * 0.3);
    ctx.fillStyle = hex(C.gold, 0.85 * a); ctx.font = "italic 500 16px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText(ch.incipit, W / 2, H * 0.3 + 22);
    if (ch.titleLines.length) {
      ctx.fillStyle = hex(C.bone, 0.5 * a); ctx.font = "italic 500 12px 'Cormorant Garamond', Georgia, serif";
      ch.titleLines.slice(0, 2).forEach((l, i) => ctx.fillText(l.length > 90 ? l.slice(0, 88) + "…" : l, W / 2, H * 0.3 + 42 + i * 14));
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
  G.debug = {
    now: () => now(),
    at(n, t) { const p = notePos(n, t, t), r = cv.getBoundingClientRect(); return { x: r.left + p.bx / W * r.width, y: r.top + p.by / H * r.height }; },
    // a point on the line, 0 at its left end and 1 at its right (page pixels)
    line(x) { const L = line0(), r = cv.getBoundingClientRect(); return { x: r.left + (L.cx + (x - 0.5) * L.len) / W * r.width, y: r.top + L.cy / H * r.height }; },
  };
  return G;
})();
