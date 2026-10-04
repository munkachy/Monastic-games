"use strict";
// SELAH: the two thumbs. Could a person play this chart? A model of someone holding a phone sideways
// and playing with both thumbs, as most people play rhythm games on a phone, and a search for the
// best way to share a chart's strokes between the thumbs. The compiler uses it to keep out of every
// chart what no thumb could reach in time; tools/playtest.js uses it to check every chart.
//
// The limits, from what is known of how fast people tap, point and keep time:
//   Two touches at once at most: two thumbs.
//   One thumb taps in one place no faster than 6 times a second. (The fastest finger tapping measured
//     in ordinary adults is about 6 to 7 a second; thumbs on glass are slower.)
//   One thumb going from one place to another takes a + b·log2(d/w + 1) seconds: Fitts's law, with d
//     the distance and w the width of the place struck, both as parts of the line. a and b are set so
//     that a short hop (one bit) takes about 0.18 s, as in Fitts's own tapping between two plates.
//   Strokes follow one another, both thumbs together, no faster than 10 a second. (Faster than one in
//     100 to 120 ms, people can no longer keep time with a beat: Repp's synchronization threshold.)
//   The thumbs do not cross: the left one stays to the left of the right one.
// The kick is struck anywhere on the line, so it is struck where a thumb already is.
const Hands = (() => {
  const H = {};
  const L = H.LIMITS = { touches: 2, repeat: 1 / 6, stream: 0.1, a: 0.08, b: 0.1, w: 0.15, together: 0.025 };
  const BEAM = 48;
  // The time one thumb needs between two strokes, dx apart along the line.
  const need = H.need = (dx) => { dx = Math.abs(dx); return dx < 1e-6 ? L.repeat : Math.max(L.repeat, L.a + L.b * Math.log2(dx / L.w + 1)); };
  const isKick = (n) => n.lane === "kick";
  // The strokes in moments: the strokes struck at once.
  H.moments = function (notes) {
    const ms = [];
    for (const n of notes.slice().sort((a, b) => a.t - b.t)) {
      const m = ms[ms.length - 1];
      if (m && n.t - m.t < L.together) m.notes.push(n); else ms.push({ t: n.t, notes: [n] });
    }
    return ms;
  };
  // Every way to strike one moment from a state of the thumbs: [{ s: next state, slack }].
  function moves(st, m) {
    const out = [], ns = m.notes, t = m.t;
    // a thumb strikes a note: where it lands, and the time it has to spare
    const strike = (th, n) => { const x = isKick(n) ? th.x : n.x; return { th: { x, t }, slack: t - th.t - need(x - th.x) }; };
    // (each state remembers the one before it and who struck what, so the fingering can be read back)
    const push = (Lh, Rh, slack, who, did) => { if (Lh.x <= Rh.x + 1e-6) out.push({ s: { L: Lh, R: Rh, min: Math.min(st.min, slack), who, back: st, did }, slack }); };
    if (ns.length === 1) {
      const a = strike(st.L, ns[0]), b = strike(st.R, ns[0]);
      push(a.th, st.R, a.slack, "L", [[ns[0], "L", a.th.x]]); push(st.L, b.th, b.slack, "R", [[ns[0], "R", b.th.x]]);
    } else if (ns.length === 2) {
      for (const [p, q] of [[ns[0], ns[1]], [ns[1], ns[0]]]) {
        const a = strike(st.L, p), b = strike(st.R, q);
        push(a.th, b.th, Math.min(a.slack, b.slack), "LR", [[p, "L", a.th.x], [q, "R", b.th.x]]);
      }
    }
    return out;
  }
  const start = () => ({ L: { x: 0.25, t: -9 }, R: { x: 0.7, t: -9 }, min: 9, who: "" });
  const key = (s) => s.L.x.toFixed(3) + "|" + s.R.x.toFixed(3) + "|" + s.who;
  // Keep the best states: the least tight so far, then the most rested.
  function prune(kids) {
    kids.sort((p, q) => q.s.min - p.s.min || (p.s.L.t + p.s.R.t) - (q.s.L.t + q.s.R.t));
    const seen = new Set(), out = [];
    for (const k of kids) { const id = key(k.s); if (seen.has(id)) continue; seen.add(id); out.push(k.s); if (out.length >= BEAM) break; }
    return out;
  }

  // Check a chart. Returns { ok, slack (the least time to spare anywhere, s), problems: [{ t, why, notes, slack }],
  // nps (strokes a second on average), peak (the most in any 2 s), fastest (the shortest time between moments),
  // fingers: for each note, the thumb that strikes it and where ({ thumb: "L" or "R", x }), in the best way found }.
  H.check = function (notes) {
    const ms = H.moments(notes), problems = [];
    let beam = [start()], prev = null, fastest = 9;
    for (const m of ms) {
      if (prev) {
        const gap = m.t - prev.t;
        fastest = Math.min(fastest, gap);
        if (gap < L.stream - 1e-6) problems.push({ t: m.t, why: "faster than a person can keep time", notes: m.notes, slack: gap - L.stream });
      }
      prev = m;
      if (m.notes.length > L.touches) { problems.push({ t: m.t, why: m.notes.length + " touches at once", notes: m.notes, slack: -1 }); m.notes = m.notes.slice(0, L.touches); }
      const kids = [];
      for (const s of beam) kids.push(...moves(s, m));
      if (!kids.length) { problems.push({ t: m.t, why: "the thumbs would cross", notes: m.notes, slack: -1 }); continue; }
      const best = Math.max(...kids.map((k) => k.slack));
      if (best < -1e-6) problems.push({ t: m.t, why: "no thumb can get there in time", notes: m.notes, slack: best });
      beam = prune(kids);
    }
    const ts = ms.map((m) => m.t), dur = ts.length ? ts[ts.length - 1] - ts[0] : 0;
    let peak = 0;
    for (let i = 0, j = 0, k = 0; i < ms.length; i++) {
      while (j < ms.length && ms[j].t - ms[i].t < 2) { k += ms[j].notes.length; j++; }
      peak = Math.max(peak, k / 2); k -= ms[i].notes.length;
    }
    const fingers = new Map();
    for (let s = beam[0]; s && s.did; s = s.back) for (const [n, thumb, x] of s.did) fingers.set(n, { thumb, x });
    return { ok: !problems.length, slack: beam.length ? beam[0].min : -1, problems, nps: dur ? notes.length / dur : 0, peak, fastest, fingers };
  };

  // Take out of a chart, moment by moment, what the thumbs cannot reach: of the strokes in a moment that
  // cannot all be struck, the lightest (weight(n), the larger the more it matters) goes first. spare: the
  // time (s) each thumb must have to spare at every stroke, so that the lower ranks are never tight.
  // Returns the strokes kept.
  H.reduce = function (notes, weight, spare) {
    spare = spare || 0;
    const ms = H.moments(notes), kept = [];
    let beam = [start()], prevT = -9;
    for (const m of ms) {
      if (m.t - prevT < L.stream - 1e-6) continue;
      // all of it if it can be struck, else the weightiest stroke that can
      const ns = m.notes.slice().sort((p, q) => weight(q) - weight(p)).slice(0, L.touches);
      for (const tryNs of [ns, ...ns.map((n) => [n])]) {
        const kids = [];
        for (const s of beam) for (const k of moves(s, { t: m.t, notes: tryNs })) if (k.slack >= spare - 1e-6) kids.push(k);
        if (kids.length) { beam = prune(kids); kept.push(...tryNs); prevT = m.t; break; }
      }
    }
    return kept;
  };
  return H;
})();
if (typeof module !== "undefined" && module.exports) module.exports = Hands;
