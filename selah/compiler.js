"use strict";
// SELAH: the chart compiler. A psalm's verses (the Douay's, or a pack's) and its song become a chart.
//
// The notes are the drums. The song is a form (songs.js): an intro, verse sections, a build, a drop,
// a breakdown, a second drop, an outro, each bar with its drum part written out and every stroke
// marked with the lowest rank that plays it. The compiler lays the psalm over the form (two bars to a
// line, the verses shared among the verse sections, a Selah after the verses where the Hebrew has
// one), keeps the strokes the chosen rank plays, and places them on the Voice as on a drum kit seen
// from the throne: hi-hat at the left, snare, toms, the crash at the right, and the kick a bar across
// the whole line. The words ride the strokes: a word to a stroke where there are strokes enough,
// else phrases (fewer and longer at the lower ranks). In the instrumental sections the
// words are the psalm's Latin. The same text, song and rank always make the same chart.
const Compiler = (() => {
  const C = {};

  // ---- The ranks: what of the drum part each one plays (as in Rock Band) -----------------------------
  // chord: how many strokes may fall at once (two hands from Festum up).
  C.RANKS = {
    feria: { name: "Feria", lvl: 0, chord: 1, speed: 0.9, what: "Kick and snare" },
    memoria: { name: "Memoria", lvl: 1, chord: 1, speed: 1, what: "And the fills" },
    festum: { name: "Festum", lvl: 2, chord: 2, speed: 1.1, what: "Hats, toms, cymbals" },
    sollemnitas: { name: "Sollemnitas", lvl: 3, chord: 2, speed: 1.22, what: "Every stroke" },
  };
  C.RANK_ORDER = ["feria", "memoria", "festum", "sollemnitas"];

  // ---- Where the Hebrew has Selah, in the Douay's verses ---------------------------------------------
  // Verse numbers only. Psalm 3: after verses 3, 5 and 9 (the Hebrew's 3:3, 3:5, 3:9). The rest of the
  // Psalter's selahs are added psalm by psalm as their charts are made, each checked by hand.
  C.SELAHS = { 3: [3, 5, 9] };

  // ---- The kit along the Voice (0 is its left end, 1 its right) ---------------------------------------
  C.LANES = { hat: 0.07, snare: 0.25, kick: 0.5, tom1: 0.47, tom2: 0.62, tom3: 0.77, crash: 0.93 };
  const LANE_OF = { kick: "kick", snare: "snare", clap: "snare", rim: "snare", hat: "hat", ohat: "hat", tom1: "tom1", tom2: "tom2", tom3: "tom3", crash: "crash", ride: "crash" };
  const PRIORITY = { hold: 7, crash: 6, snare: 5, tom1: 4, tom2: 4, tom3: 4, kick: 3, hat: 1 };
  // Is a stroke charted at this rank? (0–3: from that rank up; f: Feria only; g: Sollemnitas; x: never)
  const charted = (c, lvl) => c >= "0" && c <= "3" ? +c <= lvl : c === "f" ? lvl === 0 : c === "g" ? lvl >= 3 : false;

  // ---- Words --------------------------------------------------------------------------------------------
  const GLUE = new Set(("a an and the of to in on at by for from with unto upon into is are be been was were am art " +
    "hath have has had shall will shalt wilt doth dost did do not nor but or that which who whom whose as so " +
    "his her its their my thy thine mine our your me him them us thee ye you he she it they we i thou there " +
    "then than this these those when while also even let may o oh").split(" "));
  const DIVINE = /^(lord|god|almighty|christ|jehovah|yahweh|adonai)$/;
  const CUES = { brass: /^(trumpets?|horns?|shofar)$/, harp: /^(psaltery|harps?|lyres?|lutes?)$/, timbrel: /^(timbrels?|tambourines?|drums?)$/,
    choir: /^(choirs?|dance|dancing)$/, strings: /^strings?$/, organ: /^(organs?|pipes?|flutes?)$/, cymbals: /^cymbals?$/, all: /^(spirit|breath|breathes)$/, arise: /^arise$/ };
  const bare = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, "").replace(/'s$/, "");
  // A line cut into phrases: each little word goes with the word after it (at the end, the one before).
  function phrases(text) {
    const toks = text.split(/\s+/).filter(Boolean), out = [];
    let cur = [];
    toks.forEach((tok, i) => {
      cur.push(i);
      const b = bare(tok);
      if (!(GLUE.has(b) || !b) || i === toks.length - 1) { out.push(cur); cur = []; }
    });
    if (cur.length) { if (out.length) out[out.length - 1].push(...cur); else out.push(cur); }
    return { toks, units: out };
  }
  // Join the shortest neighbours until there are no more phrases than strokes.
  function fit(units, toks, m) {
    units = units.map((u) => u.slice());
    const len = (u) => u.reduce((a, i) => a + toks[i].length + 1, 0);
    while (units.length > m && units.length > 1) {
      let best = 0, bl = Infinity;
      for (let i = 0; i + 1 < units.length; i++) { const l = len(units[i]) + len(units[i + 1]); if (l < bl) { bl = l; best = i; } }
      units.splice(best, 2, units[best].concat(units[best + 1]));
    }
    return units;
  }

  // ---- The form ------------------------------------------------------------------------------------------
  // The verses shared among the song's verse sections, in order, about as many lines to each.
  function share(verses, k) {
    const total = verses.reduce((a, v) => a + v.lines.length, 0), groups = [];
    let g = [], acc = 0;
    verses.forEach((v, i) => {
      g.push(v); acc += v.lines.length;
      const left = verses.length - i - 1, need = k - groups.length - 1;
      if (groups.length < k - 1 && (acc >= total * (groups.length + 1) / k || left === need) && left >= need) { groups.push(g); g = []; }
    });
    groups.push(g);
    while (groups.length < k) groups.push([]);
    return groups;
  }

  C.compile = function (psalm, song, rankId) {
    const rank = C.RANKS[rankId] || C.RANKS.memoria, lvl = rank.lvl;
    const sd = 60 / song.bpm / 4, swing = song.swing || 0;
    const titleLines = psalm.verses.filter((x) => x.title).map((x) => x.lines.join(" "));
    const verses = psalm.verses.filter((x) => !x.title);
    // Selahs: the pack's own marks if it has any, else the Hebrew's, by the Douay verse.
    const marked = verses.filter((x) => x.pause);
    const selahAfter = new Set(marked.length ? marked.map((x) => x.v) : (C.SELAHS[psalm.n] || []).map((d) => { const x = verses.find((y) => (y.douay || y.v) === d); return x ? x.v : -1; }));

    // The bars.
    const bars = [], lines = [];
    const textSecs = song.form.filter((f) => f[1]).length, groups = share(verses, textSecs);
    for (const [name, k] of song.form) {
      const sec = song.sec[name], lenOf = (i) => typeof sec.len === "function" ? sec.len(i) : sec.len || 16;
      if (k) {
        const vs = groups[k - 1];
        if (!vs.length) continue;
        const n = vs.reduce((a, v) => a + v.lines.length, 0) * sec.perLine;
        let i = 0, li0 = lines.length;
        vs.forEach((v, vi) => {
          v.lines.forEach((text, j) => {
            const li = lines.length, nth = li - li0, last = vi === vs.length - 1 && j === v.lines.length - 1;
            lines.push({ text, verse: v, j, bars: [] });
            for (let q = 0; q < sec.perLine; q++) {
              const end = q === sec.perLine - 1;
              bars.push({ sec: name, i, n, len: lenOf(i), line: li, lineBar: q, lineEnd: end, fill: end && (nth % 2 === 1 || last), crash: q === 0 && nth % 2 === 0 });
              lines[li].bars.push(bars.length - 1); i++;
            }
          });
          if (selahAfter.has(v.v)) {
            const sb = song.bpm >= 120 ? 2 : 1;
            for (let q = 0; q < sb; q++) bars.push({ sec: "selah", i: q, n: sb, len: lenOf(0), selahOf: v.v });
          }
        });
      } else {
        for (let i = 0; i < sec.bars; i++) bars.push({ sec: name, i, n: sec.bars, len: lenOf(i), latin: !!sec.latin, fill: sec.bars >= 4 && (i % 4 === 3 || i === sec.bars - 1), crash: i % 4 === 0 && name !== "intro" });
      }
    }
    // The bar after a Selah comes in with a crash.
    bars.forEach((B, b) => { if (b && bars[b - 1].sec === "selah" && B.sec !== "selah") B.crash = true; });
    let t = 0;
    bars.forEach((B, b) => { B.b = b; B.t0 = t; B.fillK = b >> 2; t += B.len * sd; });
    const total = t;
    const tAt = (B, s) => B.t0 + s * sd + (s % 2 ? swing * sd : 0);

    // The notes: the strokes this rank plays.
    let notes = [];
    for (const B of bars) {
      const pats = song.pats(B);
      for (const piece in pats) {
        if (piece === "roll") continue;
        const p = pats[piece], lane = LANE_OF[piece];
        if (!p || !lane) continue;
        if (p.length !== B.len) throw new Error(song.title + ": bar " + B.b + " (" + B.sec + ") " + piece + " has " + p.length + " steps, not " + B.len);
        for (let s = 0; s < p.length; s++) {
          if (!charted(p[s], lvl)) continue;
          const type = lane === "hat" || piece === "ride" ? "drag" : lane === "crash" ? (lvl >= 2 ? "flick" : "tap") : "tap";
          notes.push({ type, lane, piece, t: tAt(B, s), bar: B.b, step: s, x: C.LANES[lane] });
        }
      }
      const r = pats.roll;
      if (r && charted(String(r[3]), lvl)) notes.push({ type: "hold", lane: "snare", piece: r[0], t: tAt(B, r[1]), t2: tAt(B, r[2]), bar: B.b, step: r[1], x: C.LANES.snare });
    }
    // At once: no more strokes than the rank has hands for, and one to a place.
    notes.sort((a, b) => a.t - b.t || (PRIORITY[b.type === "hold" ? "hold" : b.lane] - PRIORITY[a.type === "hold" ? "hold" : a.lane]));
    const kept = [];
    for (let i = 0; i < notes.length;) {
      let j = i; while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 1e-6) j++;
      const group = notes.slice(i, j), lanes = new Set();
      let hands = 0;
      for (const n of group) {
        if (lanes.has(n.lane)) continue;
        if (n.type === "drag") { if (rank.chord > 1) { kept.push(n); lanes.add(n.lane); } continue; }
        if (hands >= rank.chord) continue;
        kept.push(n); lanes.add(n.lane); hands++;
      }
      i = j;
    }
    notes = kept;
    // Nothing struck while a roll is held but the kick and the cymbals.
    const holds = notes.filter((n) => n.type === "hold");
    notes = notes.filter((n) => n.type === "hold" || !holds.some((h) => n.t > h.t + 1e-6 && n.t < h.t2 - 1e-6 && (n.lane === "snare" || rank.chord === 1)));
    notes.forEach((n, i) => { n.id = i; n.word = ""; });

    // The words: each line's phrases onto its strokes, spread across its two bars.
    const rows = [], cueBar = {};
    let vrow = null;
    lines.forEach((L, li) => {
      if (!vrow || vrow.verse !== L.verse) { vrow = { verse: L.verse, v: L.verse.v, heading: L.verse.heading || null, lines: [], t0: bars[L.bars[0]].t0 }; rows.push(vrow); }
      const slots = notes.filter((n) => n.type !== "drag" && L.bars.includes(n.bar));
      const { toks, units: phr } = phrases(L.text);
      // a word to a stroke where there are strokes enough; else phrases, joined to fit
      const units = toks.length <= slots.length ? toks.map((_, i) => [i]) : phr;
      const lrow = { tokens: toks.map((tx) => ({ text: tx, note: -1 })) };
      if (slots.length) {
        const fitted = fit(units, toks, slots.length), k = fitted.length, m = slots.length;
        fitted.forEach((u, q) => {
          const n = slots[k === 1 ? 0 : Math.round(q * (m - 1) / (k - 1))];
          n.word = u.map((i) => toks[i]).join(" ").replace(/^[^A-Za-z’']+|[,;:.]+$/g, "");
          n.verse = rows.length - 1; n.line = li;
          if (u.some((i) => DIVINE.test(bare(toks[i])))) n.accent = true;
          for (const i of u) { lrow.tokens[i].note = n.id; for (const c in CUES) if (CUES[c].test(bare(toks[i])) && cueBar[c] === undefined) cueBar[c] = n.bar; }
        });
      }
      for (const tk of lrow.tokens) for (const c in CUES) if (tk.note < 0 && CUES[c].test(bare(tk.text)) && cueBar[c] === undefined) cueBar[c] = L.bars[L.bars.length - 1];
      vrow.lines.push(lrow);
      vrow.t1 = bars[L.bars[L.bars.length - 1]].t0 + bars[L.bars[L.bars.length - 1]].len * sd;
    });
    // The Latin, in the instrumental sections: a word to each stroke but the kick and the hats,
    // from the beginning again at each section.
    const latin = (song.latin || psalm.incipit || "").split(/\s+/).filter(Boolean);
    let lrow = null, prevSec = null, li = 0;
    for (const B of bars) {
      if (!B.latin) { prevSec = null; continue; }
      if (B.sec !== prevSec) {
        prevSec = B.sec; li = 0;
        lrow = { latin: true, v: 0, heading: null, t0: B.t0, lines: [{ tokens: latin.map((tx) => ({ text: tx, note: -1, notes: [] })) }] };
        rows.push(lrow);
      }
      lrow.t1 = B.t0 + B.len * sd;
      for (const n of notes) if (n.bar === B.b && n.type !== "drag" && n.lane !== "kick" && latin.length) {
        const w = li++ % latin.length;
        n.word = latin[w].replace(/[,;:.?]+$/, ""); n.latin = true; n.verse = rows.indexOf(lrow);
        lrow.lines[0].tokens[w].notes.push(n.id);
      }
    }
    rows.sort((a, b) => a.t0 - b.t0);
    notes.forEach((n) => { if (n.verse !== undefined) n.verse = -1; });
    rows.forEach((r, ri) => r.lines.forEach((l) => l.tokens.forEach((tk) => { if (tk.note >= 0) notes[tk.note].verse = ri; for (const id of tk.notes || []) notes[id].verse = ri; })));
    // The Selahs: the stillness of each, from its first bar to its last.
    const selahs = [];
    bars.forEach((B) => {
      if (B.sec !== "selah") return;
      const t0 = B.t0, t1 = B.t0 + B.len * sd;
      if (B.i === 0) selahs.push({ t0, t1, verse: rows.findIndex((r) => !r.latin && r.v === B.selahOf && r.t0 <= t0) });
      else selahs[selahs.length - 1].t1 = t1;
    });

    const plan = { bars, end: bars.length, cue: (name, b) => cueBar[name] !== undefined && b > cueBar[name] };
    return {
      psalm: psalm.n, rank: rankId, rankName: rank.name, speed: rank.speed, bpm: song.bpm, sd, barT: 16 * sd,
      notes, ghosts: [], selahs, verses: rows, plan, titleLines, incipit: psalm.incipit || "",
      endT: total + 1.2, count: notes.length + selahs.length,
    };
  };
  return C;
})();
if (typeof module !== "undefined" && module.exports) module.exports = Compiler;
