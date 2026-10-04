"use strict";
// SELAH: the chart compiler. A psalm's verses (the Douay's, or a pack's) and its song become a chart:
// the notes, the words that pass unjudged, the Selahs, how the Voice is laid out for each verse,
// and the plan the song follows. The same text, song and rank always make the same chart.
//
// The grammar decides the notes (PLAN.md, "Note language"): content words are Taps; divine names,
// "for ever", mercy and Alleluia are Holds; questions, blows and sudden turns are Flicks; the
// little words (the, and, of) are Drags at the higher ranks and pass unjudged at the lower. Each line
// is spoken in a "call" bar (or two, if long), on the song's grid, in the rhythm of speech, and the
// band answers in the next bar. A couplet splits the Voice in two, a triplet in three. Where the
// Hebrew has Selah, the Voice stills for a bar. A short psalm goes round twice, the second time
// without the answers, harder.
const Compiler = (() => {
  const C = {};

  // ---- The ranks (the ranks of the liturgical day) ----------------------------------------------
  // grid: the finest spacing of judged notes, in sixteenths; gap: the least between two of them.
  C.RANKS = {
    feria: { name: "Feria", level: "1–5", grid: 4, gap: 4, flick: false, drag: false, split: false, motion: 0, speed: 0.85 },
    memoria: { name: "Memoria", level: "4–9", grid: 2, gap: 2, flick: true, drag: false, split: true, motion: 0, speed: 1 },
    festum: { name: "Festum", level: "8–13", grid: 2, gap: 2, flick: true, drag: true, split: true, motion: 1, speed: 1.12 },
    sollemnitas: { name: "Sollemnitas", level: "12–16", grid: 1, gap: 1, flick: true, drag: true, split: true, motion: 2, speed: 1.28 },
  };
  C.RANK_ORDER = ["feria", "memoria", "festum", "sollemnitas"];

  // ---- Where the Hebrew has Selah, in the Douay's verses ------------------------------------------
  // Verse numbers only. Psalm 3: after verses 3, 5 and 9 (the Hebrew's 3:3, 3:5, 3:9). The rest of
  // the Psalter's selahs are added psalm by psalm as their charts are made, each checked by hand.
  C.SELAHS = { 3: [3, 5, 9] };

  // ---- Words --------------------------------------------------------------------------------------
  const GLUE = new Set(("a an and the of to in on at by for from with unto upon into is are be been was were am art " +
    "hath have has had shall will shalt wilt doth dost did do not nor but or that which who whom whose as so " +
    "his her its their my thy thine mine our your me him them us thee ye you he she it they we i thou there " +
    "then than this these those when while also even let may o oh").split(" "));
  const DIVINE = /^(lord|god|almighty|christ|jehovah|yahweh|adonai)$/;
  const LONG = /^(ever|evermore|mercy|alleluia|hallelujah|glory|amen)$/;
  const ASK = /^(why|how|who|where|what|wherefore)$/;
  const BLOW = /^(break|broken|brake|struck|strike|smite|smote|dash|dashed|scatter|scattered|perish|destroy|destroyed|confound|confounded|rebuke|rebuked|shatter|shattered|crush|crushed|arise|rise|shake|shaken|consume|consumed|cut|strikes|smash|smashed)$/;
  // What the text names that the band can answer (Psalm 150's instruments; "arise" in Psalm 3).
  const CUES = { brass: /^(trumpets?|horns?|shofar)$/, harp: /^(psaltery|harps?|lyres?|lutes?)$/, timbrel: /^(timbrels?|tambourines?|drums?)$/,
    choir: /^(choirs?|dance|dancing)$/, strings: /^strings?$/, organ: /^(organs?|pipes?|flutes?)$/, cymbals: /^cymbals?$/, all: /^(spirit|breath|breathes)$/, arise: /^arise$/ };

  const bare = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, "").replace(/'s$/, "");
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }
  C.syllables = syllables;
  // A seeded random, so the same psalm always lays out the same way.
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // A line's words, sorted into notes for this rank.
  function sortWords(text, rank) {
    const toks = text.split(/\s+/).filter(Boolean);
    const asks = /\?/.test(text);
    const out = toks.map((tok, i) => {
      const b = bare(tok), prev = i ? bare(toks[i - 1]) : "";
      let kind = "tap";
      if (!b) kind = "none";
      else if (DIVINE.test(b) || (b === "high" && prev === "most")) kind = "divine";
      else if (LONG.test(b)) kind = "long";
      else if (BLOW.test(b)) kind = "flick";
      else if (asks && ASK.test(b)) kind = "flick";
      else if (GLUE.has(b)) kind = "glue";
      return { tok, word: tok.replace(/^[^A-Za-z’']+|[^A-Za-z’']+$/g, ""), b, kind, syl: syllables(tok) || 1 };
    });
    // A question with no question word: the last content word before the mark is thrown.
    if (asks && !out.some((w) => w.kind === "flick" && ASK.test(w.b))) {
      const q = out.findIndex((w) => /\?/.test(w.tok));
      for (let i = q; i >= 0; i--) if (out[i].kind === "tap") { out[i].kind = "flick"; break; }
    }
    for (const w of out) {
      if (w.kind === "flick" && !rank.flick) w.kind = "tap";
      if (w.kind === "glue") w.kind = rank.drag ? "drag" : "ghost";
    }
    return out;
  }

  // Lay one line on the grid: positions in sixteenths from the start of its call, the line taking
  // as many bars as it needs. Returns { bars, items: [{w, pos, len}] }.
  function placeLine(words, rank) {
    const total = words.reduce((a, w) => a + w.syl, 0) || 1;
    for (let bars = total <= 11 ? 1 : total <= 22 ? 2 : 3; ; bars++) {
      const span = 16 * bars, items = [];
      let at = 0, prev = -99, ok = true;
      for (const w of words) {
        const raw = (at / total) * span * 0.86;
        at += w.syl;
        if (w.kind === "none") continue;
        if (w.kind === "ghost") { items.push({ w, pos: Math.round(raw) }); continue; }
        const g = w.kind === "drag" ? Math.max(1, rank.grid / 2) : rank.grid;
        let pos = w.kind === "divine" ? Math.round(raw / 4) * 4 : Math.round(raw / g) * g;
        const need = w.kind === "drag" || items.length && items[items.length - 1].w.kind === "drag" ? Math.max(1, rank.gap / 2) : rank.gap;
        if (pos < prev + need) pos = prev + need;
        if (w.kind === "divine" && pos % 4) pos = Math.ceil(pos / 4) * 4;
        if (pos > span - 2) { ok = false; break; }
        items.push({ w, pos }); prev = pos;
      }
      if (ok || bars >= 4) {
        // Holds last until the next note (a beat for a name, two for "for ever"), at least an eighth.
        const judged = items.filter((x) => x.w.kind !== "ghost");
        judged.forEach((x, i) => {
          if (x.w.kind !== "divine" && x.w.kind !== "long") return;
          const next = i + 1 < judged.length ? judged[i + 1].pos : span;
          const want = x.w.kind === "long" ? 8 : 4;
          x.len = Math.min(want, next - x.pos - Math.max(1, rank.gap / 2));
          if (x.len < 2) x.len = 0;
        });
        return { bars, items };
      }
    }
  }

  // ---- The chart ----------------------------------------------------------------------------------
  // psalm: { n, verses: [{ v, lines, title?, heading?, douay?, pause? }] }; song: from SONGS.
  C.compile = function (psalm, song, rankId, opts) {
    opts = opts || {};
    const rank = C.RANKS[rankId] || C.RANKS.memoria;
    const sd = 60 / song.bpm / 4, barT = sd * 16;
    const R = rng(psalm.n * 7919 + C.RANK_ORDER.indexOf(rankId) * 31);
    const titleLines = psalm.verses.filter((x) => x.title).map((x) => x.lines.join(" "));
    const verses = psalm.verses.filter((x) => !x.title);
    // Selahs: the pack's own marks if it has any, else the Hebrew's, by the Douay verse.
    const marked = verses.filter((x) => x.pause);
    const selahAfter = new Set(marked.length ? marked.map((x) => x.v) : (C.SELAHS[psalm.n] || []).map((d) => { const x = verses.find((y) => (y.douay || y.v) === d); return x ? x.v : -1; }));

    const notes = [], ghosts = [], selahs = [], frames = [], vrows = [];
    const callBars = new Set(), selahBars = new Set(), cueBar = {};
    const intro = 2;
    let bar = intro;
    // The Voice for a verse: one segment, or one for each half of a couplet, or each third.
    function layout(nSeg, vi) {
      const segs = [], y0 = 0.7, m = rank.motion;
      const tilt = m ? (R() - 0.5) * (m === 1 ? 0.12 : 0.32) : 0;
      if (nSeg === 1 || !rank.split) { segs.push({ cx: 0.5, cy: y0 + (m ? (R() - 0.5) * 0.06 * m : 0), ang: tilt, len: 0.84 }); return segs; }
      const gap = 0.04, w = (0.88 - gap * (nSeg - 1)) / nSeg;
      for (let k = 0; k < nSeg; k++) {
        const dy = m ? (k % 2 ? 1 : -1) * (m === 1 ? 0.035 : 0.07) * (vi % 2 ? -1 : 1) : 0;
        segs.push({ cx: 0.06 + w / 2 + k * (w + gap), cy: y0 + dy, ang: m ? tilt * (k % 2 ? -1 : 1) : 0, len: w });
      }
      return segs;
    }
    function pass(second) {
      verses.forEach((verse, vi) => {
        const lines = verse.lines.slice();
        const nSeg = Math.min(3, lines.length >= 4 ? 2 : lines.length);
        const segOf = (j) => (lines.length >= 4 ? (j < Math.ceil(lines.length / 2) ? 0 : 1) : Math.min(j, nSeg - 1));
        const frame = { t0: bar * barT, segs: layout(rank.split ? nSeg : 1, vi + (second ? 1 : 0)), verse: vrows.length };
        const row = { v: verse.v, heading: verse.heading || null, lines: [], t0: bar * barT, second };
        lines.forEach((text, j) => {
          const words = sortWords(text, rank), placed = placeLine(words, rank);
          const seg = rank.split ? segOf(j) : 0, segFrac = rank.split ? 1 : 1;
          // x along the segment: where the word falls in its line, by letters.
          const totalChars = words.reduce((a, w) => a + w.tok.length + 1, 0);
          let c = 0; const xOf = new Map();
          words.forEach((w) => { xOf.set(w, 0.08 + 0.84 * ((c + w.tok.length / 2) / totalChars)); c += w.tok.length + 1; });
          // In one undivided Voice, the second half of a couplet keeps to the right, the first to the left.
          const half = (!rank.split && lines.length >= 2) ? (lines.length >= 4 ? (j < Math.ceil(lines.length / 2) ? 0 : 1) : (j % 2)) : -1;
          const xMap = (x) => half < 0 ? x : half === 0 ? 0.04 + x * 0.5 : 0.46 + x * 0.5;
          const lrow = { tokens: words.map((w) => ({ text: w.tok, kind: w.kind, note: -1, ghost: -1 })) };
          for (const it of placed.items) {
            const t = (bar * 16 + it.pos) * sd, wi = words.indexOf(it.w), x = xMap(xOf.get(it.w));
            if (it.w.kind === "ghost") { lrow.tokens[wi].ghost = ghosts.length; ghosts.push({ t, word: it.w.word, x, seg, frame: frames.length }); continue; }
            const type = it.w.kind === "divine" || it.w.kind === "long" ? (it.len ? "hold" : "tap") : it.w.kind;
            const nt = { id: notes.length, type, t, x, seg, frame: frames.length, word: it.w.word, accent: it.w.kind === "divine", verse: vrows.length, line: j, tok: wi };
            if (type === "hold") nt.t2 = (bar * 16 + it.pos + it.len) * sd;
            lrow.tokens[wi].note = nt.id;
            notes.push(nt);
            if (!second) for (const k in CUES) if (CUES[k].test(it.w.b) && cueBar[k] === undefined) cueBar[k] = bar + Math.floor(it.pos / 16);
          }
          // A cue word that passes unjudged still counts.
          if (!second) for (const w of words) for (const k in CUES) if (CUES[k].test(w.b) && cueBar[k] === undefined) cueBar[k] = bar + placed.bars - 1;
          for (let k = 0; k < placed.bars; k++) callBars.add(bar + k);
          bar += placed.bars;
          if (!second) bar += 1;          // the band answers
          row.lines.push(lrow);
        });
        if (selahAfter.has(verse.v)) {
          selahBars.add(bar);
          selahs.push({ t0: bar * barT, t1: (bar + 1) * barT, verse: vrows.length });
          bar += 1;
        }
        row.t1 = bar * barT; frame.t1 = bar * barT;
        frames.push(frame); vrows.push(row);
      });
    }
    pass(false);
    let pass2 = Infinity;
    if ((bar - intro) * barT < (opts.minSeconds || 75)) { pass2 = bar; pass(true); }
    const outro = bar, end = bar + 2;
    const plan = {
      intro, outro, end, pass2,
      call: (b) => callBars.has(b), selah: (b) => selahBars.has(b), drop: (b) => selahBars.has(b - 1),
      cue: (name, b) => (cueBar[name] !== undefined && b > cueBar[name]) || b >= pass2,
    };
    return {
      psalm: psalm.n, rank: rankId, rankName: rank.name, speed: rank.speed, motion: rank.motion, bpm: song.bpm, sd, barT,
      notes, ghosts, selahs, frames, verses: vrows, plan, titleLines, incipit: psalm.incipit || "",
      endT: end * barT, count: notes.length + selahs.length,
    };
  };
  return C;
})();
if (typeof module !== "undefined" && module.exports) module.exports = Compiler;
