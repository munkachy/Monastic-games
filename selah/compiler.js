"use strict";
// SELAH: the chart compiler. A psalm's verses (the Douay's, or a pack's) and its song become a chart.
//
// The notes are the drums. The song is a form (songs.js): an intro, verse sections, a build, a drop,
// a breakdown, a second drop, an outro, each bar with its drum part written out and every stroke
// marked with the lowest rank that plays it. The compiler lays the psalm over the form (two bars to a
// line, the verses shared among the verse sections, a Selah after the verses where the Hebrew has
// one), keeps the strokes the chosen rank plays, and places them on the Voice as on a drum kit seen
// from the throne: hi-hat at the left, snare, toms, the crash at the right, and the kick a bar across
// the whole line. The words ride the strokes of the snare, the toms and the cymbals (never the kick
// or the hat), in phrases: each little word with the word after it, and phrases joined where there
// are fewer strokes (at the lower ranks); a box shows a short phrase whole, or a long one's key
// word. The instrumental sections (the intros, the drops) carry no words: their strokes are empty
// boxes. The same text, song and rank always make the same chart.
const Compiler = (() => {
  const C = {};
  const Thumbs = typeof Hands !== "undefined" ? Hands : require("./hands.js");

  // ---- The ranks: what of the drum part each one plays (as in Rock Band) -----------------------------
  // Every note is a tap. Each rank is kept to rules like the ones Rock Band's charts are kept to
  // (Easy: kick and snare on the beat; Medium: nothing closer than an eighth, one at a time), and then
  // every chart is played through by the two thumbs of hands.js, which take out anything a person could
  // not reach in time. As the author asked after playing, the ranks climb gently: Festum is a notch
  // above Memoria (the toms and fills, still one at a time, a few strokes more), and Sollemnitas a
  // notch above Festum (the kick with a hand, a few strokes more again); nothing like Rock Band's Hard.
  //   chord: how many strokes at once. keeperAlone: the cymbal that keeps time (the hat, the ride) is
  //     struck only alone. kickChord: two at once only if one of them is the kick, and only on the
  //     first beat of a bar (as a drummer lands a crash with the kick).
  //   gap: the closest two moments may be, in sixteenths, and never closer than secs.
  //   over: a rank one or two notches above another: in every bar, at most `by` strokes more than that
  //     rank plays there (the weightiest of what it may add; the lightest go first).
  //   spare: the time each thumb must have to spare at every stroke (the lower ranks are never tight).
  //   nps: about how many strokes a second the rank should ask for, at most, on average (playtest.js
  //     warns past it).
  C.RANKS = {
    feria: { name: "Feria", lvl: 0, chord: 1, gap: 4, secs: 0.3, spare: 0.15, nps: 2.5, speed: 0.9, what: "Kick and snare" },
    memoria: { name: "Memoria", lvl: 1, chord: 1, gap: 2, secs: 0.2, spare: 0.08, nps: 3.5, speed: 1, what: "And the fills" },
    festum: { name: "Festum", lvl: 2, chord: 1, gap: 2, secs: 0.17, over: { rank: "memoria", by: 1 }, spare: 0.06, nps: 3, speed: 1.04, what: "And the toms" },
    sollemnitas: { name: "Sollemnitas", lvl: 3, chord: 2, kickChord: true, keeperAlone: true, gap: 2, secs: 0.16, over: { rank: "memoria", by: 2 }, spare: 0.05, nps: 3.5, speed: 1.08, what: "Kick with a hand" },
  };
  C.RANK_ORDER = ["feria", "memoria", "festum", "sollemnitas"];

  // ---- Where the Hebrew has Selah, in the Douay's verses ---------------------------------------------
  // Verse numbers only. Psalm 3: after verses 3, 5 and 9 (the Hebrew's 3:3, 3:5, 3:9). Psalm 4: after
  // verses 3 and 5 (the Hebrew's 4:3, 4:5). The Hebrew of Psalms 1, 2, 90 (91), 116 (117), 133 (134) and
  // 150 has none. The rest of the Psalter's selahs are added psalm by psalm as their charts are made,
  // each checked by hand.
  C.SELAHS = { 3: [3, 5, 9], 4: [3, 5] };

  // ---- The kit along the Voice (0 is its left end, 1 its right) ---------------------------------------
  C.LANES = { hat: 0.07, snare: 0.25, kick: 0.5, tom1: 0.47, tom2: 0.62, tom3: 0.77, crash: 0.93 };
  const LANE_OF = { kick: "kick", snare: "snare", clap: "snare", rim: "snare", hat: "hat", ohat: "hat", tom1: "tom1", tom2: "tom2", tom3: "tom3", crash: "crash", ride: "crash" };
  const PIECE = { crash: 6, snare: 5, tom1: 4, tom2: 4, tom3: 4, kick: 3, hat: 1 };
  // Is a stroke charted at this rank? (0–3: from that rank up; f: Feria only; g: Sollemnitas; x: never)
  const charted = (c, lvl) => c >= "0" && c <= "3" ? +c <= lvl : c === "f" ? lvl === 0 : c === "g" ? lvl >= 3 : false;
  const entry = (c) => c >= "0" && c <= "3" ? +c : c === "g" ? 3 : 0;
  // How much a stroke matters, when some must go: the lower the rank it enters at, the stronger the
  // beat it falls on (the downbeat most), and the drum (a crash, a snare, a tom, a kick, the hat last).
  function weight(n) {
    const len = n.len || 16, beat = len % 6 === 0 ? 6 : 4;
    const metric = n.step === 0 ? 3 : n.step % beat === 0 ? 2 : n.step % 2 === 0 ? 1 : 0;
    return (3 - n.lvl) * 10 + metric * 3 + PIECE[n.lane];
  }

  // ---- Words --------------------------------------------------------------------------------------------
  const GLUE = new Set(("a an and the of to in on at by for from with unto upon into is are be been was were am art " +
    "hath have has had shall will shalt wilt doth dost did do not nor but or that which who whom whose as so " +
    "his her its their my thy thine mine our your me him them us thee ye you he she it they we i thou there " +
    "then than this these those when while also even let may o oh").split(" "));
  const DIVINE = /^(lord|god|almighty|christ|jehovah|yahweh|adonai)$/;
  const CUES = { brass: /^(trumpets?|horns?|shofar)$/, harp: /^(psaltery|harps?|lyres?|lutes?)$/, timbrel: /^(timbrels?|tambourines?|drums?)$/,
    choir: /^(choirs?|dance|dancing)$/, strings: /^strings?$/, organ: /^(organs?|pipes?|flutes?)$/, cymbals: /^cymbals?$/, all: /^(spirit|breath|breathes)$/, arise: /^arise$/,
    begotten: /^begotten$/, angels: /^angels$/ };
  const bare = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, "").replace(/'s$/, "");
  // A line (its words) cut into phrases: each little word goes with the word after it (at the end, the
  // one before); a phrase too long for a box is cut again, before an "in", an "of", a "who" where it
  // can be, else near its middle. Returns the phrases as lists of the words' indexes.
  const LONG = 18, BREAK = new Set("in of to for from with unto upon into on at by and but or nor that which who whom".split(" "));
  function phrases(toks) {
    const out = [];
    const len = (u) => u.reduce((a, i) => a + toks[i].length + 1, -1);
    const cut = (u) => {
      if (u.length < 2 || len(u) <= LONG) return [u];
      let best = -1, score = Infinity;
      for (let k = 1; k < u.length; k++) {
        const a = u.slice(0, k), b = u.slice(k), lone = (x) => x.every((i) => GLUE.has(bare(toks[i])));
        const sc = Math.abs(len(a) - len(b)) + (BREAK.has(bare(toks[u[k]])) ? 0 : 12) + (lone(a) || lone(b) ? 8 : 0);
        if (sc < score) { score = sc; best = k; }
      }
      return [...cut(u.slice(0, best)), ...cut(u.slice(best))];
    };
    let cur = [];
    toks.forEach((tok, i) => {
      cur.push(i);
      const b = bare(tok);
      if (!(GLUE.has(b) || !b) || i === toks.length - 1) { out.push(cur); cur = []; }
    });
    if (cur.length) { if (out.length) out[out.length - 1].push(...cur); else out.push(cur); }
    return out.flatMap(cut);
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

  // What a stroke's box shows of its phrase: the phrase itself, whole. Only where a line has more
  // phrases than its longest allowed span has strokes, and phrases had to be joined, does a long one
  // show its key word: a divine name if it has one, else its longest word. The whole phrase lights in
  // the verse under the line when the stroke is struck.
  const trim = (w) => w.replace(/^[^A-Za-z’']+|[^A-Za-z’']+$/g, "");
  function boxWord(ws) {
    const whole = trim(ws.join(" "));
    if (whole.length <= 22) return whole;
    const words = ws.map(trim).filter(Boolean);
    const divine = words.find((w) => DIVINE.test(bare(w)));
    if (divine) return divine;
    const content = words.filter((w) => !GLUE.has(bare(w)));
    return (content.length ? content : words).reduce((a, w) => (w.length >= a.length ? w : a), "");
  }

  // ---- Lectio: words said again ----------------------------------------------------------------------------
  // A song may say parts of its psalm again, as a chorus does, or as lectio divina dwells on a phrase
  // (song.lectio, by the Douay's verse numbers):
  //   { v, echo: "words", times }     the words, found in verse v, are sung again after their line, as
  //                                   lines of their own, `times` in all. In a pack whose wording
  //                                   differs, the verse's line `line` (else its last) is sung again whole.
  //   { v, stutter: "words", times }  the words are said `times` over where they stand.
  // And the shortest psalms are sung whole in every verse section (song.whole). The verse under the
  // line shows a word said again in gold, so the psalm's own text is always plain to see.
  const norm = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z']+/g, "");
  // Where a run of words falls among a line's words: [from, to) or null.
  function findRun(toks, words) {
    const want = words.split(/\s+/).map(norm).filter(Boolean), have = toks.map(norm);
    for (let i = 0; i + want.length <= have.length; i++) if (want.every((w, k) => have[i + k] === w)) return [i, i + want.length];
    return null;
  }
  const split = (text) => text.split(/\s+/).filter(Boolean);
  // The lines a verse is sung in, its lectio and all: [{ toks, rep (each word: said again?), verse, j, echo }].
  function sung(v, lectio) {
    const out = [], dv = v.douay || v.v, mine = lectio.filter((L) => L.v === dv);
    v.lines.forEach((text, j) => {
      const own = split(text);
      let toks = own, rep = own.map(() => false);
      for (const L of mine) {
        if (!L.stutter) continue;
        const r = findRun(toks, L.stutter);
        if (!r) continue;
        // the run said again; its stop (a comma, a full stop) goes after the last saying of it
        const run = toks.slice(r[0], r[1]), end = run[run.length - 1], bareRun = [...run.slice(0, -1), end.replace(/[,;:.!?]+$/, "")], more = [];
        for (let k = 1; k < (L.times || 2); k++) more.push(...(k === (L.times || 2) - 1 ? run : bareRun));
        toks = [...toks.slice(0, r[0]), ...bareRun, ...more, ...toks.slice(r[1])];
        rep = [...rep.slice(0, r[1]), ...more.map(() => true), ...rep.slice(r[1])];
      }
      out.push({ toks, rep, verse: v, j, echo: 0 });
      for (const L of mine) {
        if (!L.echo) continue;
        const found = v.lines.some((x) => findRun(split(x), L.echo)), r = findRun(own, L.echo);
        const words = r ? own.slice(r[0], r[1]) : !found && j === (L.line === undefined ? v.lines.length - 1 : L.line) ? own : null;
        if (!words) continue;
        const said = words.map((w, i) => (i === words.length - 1 ? w.replace(/[,;:.]+$/, "") : w));
        for (let k = 1; k < (L.times || 2); k++) out.push({ toks: said, rep: said.map(() => true), verse: v, j, echo: k });
      }
    });
    return out;
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

  // ---- Keeping a chart to its rank ------------------------------------------------------------------------
  // The strokes in moments (struck at once); at each, no more than the rank has hands for, one to a
  // drum, the weightiest; then no two moments closer than the rank allows (of two too close, the
  // lighter goes); then the two thumbs play it through and leave out what they cannot reach.
  const keeper = (n) => n.lane === "hat" || n.piece === "ride";
  const onBeat = (n) => n.step === 0;
  const minGap = (rank, sd) => Math.max(rank.gap * sd * 0.9, rank.secs);
  C.reduce = function (notes, rank, sd) {
    const ms = Thumbs.moments(notes);
    const heavy = (m) => Math.max(...m.notes.map(weight));
    for (const m of ms) {
      const lanes = new Set();
      m.notes = m.notes.sort((a, b) => weight(b) - weight(a)).filter((n) => !lanes.has(n.lane) && lanes.add(n.lane));
      if (rank.keeperAlone && m.notes.length > 1) m.notes = m.notes.filter((n) => !keeper(n));
      // two at once only with the kick, on the first beat: the kick and the weightiest hand, else the weightiest alone
      if (rank.kickChord && m.notes.length > 1) { const k = m.notes.find((n) => n.lane === "kick"), h = m.notes.find((n) => n.lane !== "kick"); m.notes = k && h && onBeat(k) ? [h, k] : [m.notes[0]]; }
      m.notes = m.notes.slice(0, rank.chord);
    }
    const kept = [], gap = minGap(rank, sd);
    for (const m of ms) {
      while (kept.length && m.t - kept[kept.length - 1].t < gap && heavy(m) > heavy(kept[kept.length - 1])) kept.pop();
      if (!kept.length || m.t - kept[kept.length - 1].t >= gap) kept.push(m);
    }
    let out = kept.flatMap((m) => m.notes);
    // a notch above another rank: in each bar, no more than `by` strokes more than it plays there
    // (the same bars, the same strokes to choose from); the lightest go first, the later of two alike
    if (rank.over) {
      const base = C.RANKS[rank.over.rank], baseCount = new Map(), byBar = new Map(), drop = new Set();
      for (const n of C.reduce(notes.filter((x) => x.lvl <= base.lvl), base, sd)) baseCount.set(n.bar, (baseCount.get(n.bar) || 0) + 1);
      for (const n of out) { if (!byBar.has(n.bar)) byBar.set(n.bar, []); byBar.get(n.bar).push(n); }
      for (const [b, ns] of byBar) {
        const most = Math.max(1, (baseCount.get(b) || 0) + rank.over.by);
        if (ns.length > most) ns.slice().sort((a, b2) => weight(a) - weight(b2) || b2.t - a.t).slice(0, ns.length - most).forEach((n) => drop.add(n));
      }
      out = out.filter((n) => !drop.has(n));
    }
    return Thumbs.reduce(out, weight, rank.spare).sort((a, b) => a.t - b.t || weight(b) - weight(a));
  };
  // A chart's breaks of its rank's rules (for playtest.js): an empty list if it keeps them all.
  C.audit = function (chart) {
    const rank = C.RANKS[chart.rank], gap = minGap(rank, chart.sd), out = [];
    let prev = null;
    for (const m of Thumbs.moments(chart.notes)) {
      if (m.notes.some((n) => n.type !== "tap")) out.push(m.t.toFixed(2) + " s: a stroke that is not a tap");
      if (m.notes.length > rank.chord) out.push(m.t.toFixed(2) + " s: " + m.notes.length + " at once at " + rank.name);
      if (rank.keeperAlone && m.notes.length > 1 && m.notes.some(keeper)) out.push(m.t.toFixed(2) + " s: the " + m.notes.find(keeper).piece + " with another stroke at " + rank.name);
      if (rank.kickChord && m.notes.length > 1 && !m.notes.some((n) => n.lane === "kick" && onBeat(n))) out.push(m.t.toFixed(2) + " s: two at once off the first beat, or without the kick, at " + rank.name);
      if (prev && m.t - prev.t < gap - 1e-6) out.push(m.t.toFixed(2) + " s: two moments " + Math.round((m.t - prev.t) * 1000) + " ms apart at " + rank.name);
      prev = m;
    }
    return out;
  };

  // ---- A chart -----------------------------------------------------------------------------------------------
  // Every phrase of the psalm rides a stroke of its own. A line is sung over two bars; where a rank has
  // too few strokes there for the line's phrases, the line is given two bars more, and again, until
  // they all fit (the band plays on in its groove), up to eight bars to a line. So the easier ranks
  // run longer: the slower the rank, the longer the words stay.
  const MAX_LINE_BARS = 8;
  C.compile = function (psalm, song, rankId) {
    const extra = new Map();
    let chart = null;
    for (let pass = 0; pass < 6; pass++) {
      chart = build(psalm, song, rankId, extra);
      if (!chart.short.length) break;
      for (const [li, add] of chart.short) extra.set(li, (extra.get(li) || 0) + add);
    }
    delete chart.short;
    return chart;
  };
  function build(psalm, song, rankId, extra) {
    const rank = C.RANKS[rankId] || C.RANKS.memoria, lvl = rank.lvl;
    const sd = 60 / song.bpm / 4, swing = song.swing || 0;
    const titleLines = psalm.verses.filter((x) => x.title).map((x) => x.lines.join(" "));
    const verses = psalm.verses.filter((x) => !x.title);
    // Selahs: the pack's own marks if it has any, else the Hebrew's, by the Douay verse.
    const marked = verses.filter((x) => x.pause);
    const selahAfter = new Set(marked.length ? marked.map((x) => x.v) : (C.SELAHS[psalm.n] || []).map((d) => { const x = verses.find((y) => (y.douay || y.v) === d); return x ? x.v : -1; }));

    // The bars. Each sung line takes its bars (lineBar: 0 or 1, the first or second of each pair;
    // lineQ: which bar of the line; echo: which saying-again of words, if it is one; text: the line's
    // words, plain, so a song can answer them).
    const bars = [], lines = [], lectio = song.lectio || [];
    const textSecs = song.form.filter((f) => f[1]).length, groups = share(verses, textSecs);
    for (const [name, k] of song.form) {
      const sec = song.sec[name], lenOf = (i) => typeof sec.len === "function" ? sec.len(i) : sec.len || 16;
      if (k) {
        const vs = song.whole ? verses : groups[k - 1];
        if (!vs.length) continue;
        const mine = [];
        let i = 0, nth = 0;
        vs.forEach((v, vi) => {
          const ls = sung(v, lectio);
          ls.forEach((L, j) => {
            const li = lines.length, last = vi === vs.length - 1 && j === ls.length - 1, per = sec.perLine + (extra.get(li) || 0);
            const text = L.toks.map(norm).join(" ");
            L.bars = []; lines.push(L);
            for (let q = 0; q < per; q++) {
              const end = q === per - 1;
              const B = { sec: name, i, len: lenOf(i), line: li, lineBar: q % 2, lineQ: q, lineEnd: end, echo: L.echo, text, fill: end && (nth % 2 === 1 || last), crash: q === 0 && nth % 2 === 0 };
              bars.push(B); mine.push(B); L.bars.push(bars.length - 1); i++;
            }
            nth++;
          });
          if (selahAfter.has(v.v)) {
            const sb = song.bpm >= 120 ? 2 : 1;
            for (let q = 0; q < sb; q++) bars.push({ sec: "selah", i: q, n: sb, len: lenOf(0), selahOf: v.v });
          }
        });
        for (const B of mine) B.n = i;
      } else {
        for (let i = 0; i < sec.bars; i++) bars.push({ sec: name, i, n: sec.bars, len: lenOf(i), fill: sec.bars >= 4 && (i % 4 === 3 || i === sec.bars - 1), crash: i % 4 === 0 && name !== "intro" });
      }
    }
    // The bar after a Selah comes in with a crash.
    bars.forEach((B, b) => { if (b && bars[b - 1].sec === "selah" && B.sec !== "selah") B.crash = true; });
    let t = 0;
    bars.forEach((B, b) => { B.b = b; B.t0 = t; B.fillK = b >> 2; t += B.len * sd; });
    const total = t;
    const tAt = (B, s) => B.t0 + s * sd + (s % 2 ? swing * sd : 0);

    // The notes: the strokes this rank plays, each a tap.
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
          notes.push({ type: "tap", lane, piece, c: p[s], t: tAt(B, s), bar: B.b, step: s, len: B.len, lvl: entry(p[s]), x: C.LANES[lane] });
        }
      }
      // A roll: the band plays it in thirty-seconds; the chart, in strokes on the snare that quicken,
      // quarters from the rank it enters at, eighths from Festum, sixteenths in its second half at
      // Sollemnitas.
      const r = pats.roll;
      if (r) for (let s = r[1]; s < r[2]; s++) {
        const k = s - r[1], half = s >= (r[1] + r[2]) >> 1;
        const at = k % 4 === 0 ? +r[3] : k % 2 === 0 ? Math.max(2, +r[3]) : half ? 3 : 9;
        if (at <= lvl) notes.push({ type: "tap", lane: "snare", piece: r[0], c: String(Math.min(3, at)), t: tAt(B, s), bar: B.b, step: s, len: B.len, lvl: at, x: C.LANES.snare, roll: true });
      }
    }
    notes = C.reduce(notes, rank, sd);
    notes.forEach((n, i) => { n.id = i; n.word = ""; });

    // The words: each line's phrases onto its strokes (but the kick's and the hat's), spread across its
    // bars. A line with too few strokes for its phrases asks for more bars (short).
    const rows = [], cueBar = {}, short = [];
    let vrow = null;
    lines.forEach((L, li) => {
      // a row for each verse, and one of its own for each saying-again of words
      if (!vrow || vrow.verse !== L.verse || L.echo || vrow.echo) { vrow = { verse: L.verse, v: L.verse.v, echo: !!L.echo, heading: L.echo ? null : L.verse.heading || null, lines: [], t0: bars[L.bars[0]].t0 }; rows.push(vrow); }
      const slots = notes.filter((n) => n.lane !== "hat" && n.lane !== "kick" && L.bars.includes(n.bar));
      const toks = L.toks, units = phrases(toks);
      if (slots.length < units.length && L.bars.length < MAX_LINE_BARS) {
        const perBar = slots.length / L.bars.length, need = perBar > 0 ? Math.ceil(units.length / perBar) : L.bars.length + 2;
        short.push([li, Math.min(MAX_LINE_BARS - L.bars.length, Math.max(2, 2 * Math.ceil((need - L.bars.length) / 2)))]);
      }
      const lrow = { tokens: toks.map((tx, i) => ({ text: tx, note: -1, rep: L.rep[i] })) };
      if (slots.length) {
        const fitted = fit(units, toks, slots.length), k = fitted.length, m = slots.length;
        fitted.forEach((u, q) => {
          const n = slots[k === 1 ? 0 : Math.round(q * (m - 1) / (k - 1))];
          n.word = boxWord(u.map((i) => toks[i]));
          n.verse = rows.length - 1; n.line = li;
          if (u.some((i) => DIVINE.test(bare(toks[i])))) n.accent = true;
          for (const i of u) { lrow.tokens[i].note = n.id; for (const c in CUES) if (CUES[c].test(bare(toks[i])) && cueBar[c] === undefined) cueBar[c] = n.bar; }
        });
      }
      for (const tk of lrow.tokens) for (const c in CUES) if (tk.note < 0 && CUES[c].test(bare(tk.text)) && cueBar[c] === undefined) cueBar[c] = L.bars[L.bars.length - 1];
      vrow.lines.push(lrow);
      vrow.t1 = bars[L.bars[L.bars.length - 1]].t0 + bars[L.bars[L.bars.length - 1]].len * sd;
    });
    notes.forEach((n) => { if (n.verse !== undefined) n.verse = -1; });
    rows.forEach((r, ri) => r.lines.forEach((l) => l.tokens.forEach((tk) => { if (tk.note >= 0) notes[tk.note].verse = ri; })));
    // The Selahs: the stillness of each, from its first bar to its last.
    const selahs = [];
    bars.forEach((B) => {
      if (B.sec !== "selah") return;
      const t0 = B.t0, t1 = B.t0 + B.len * sd;
      if (B.i === 0) selahs.push({ t0, t1, verse: rows.findIndex((r) => r.v === B.selahOf && r.t0 <= t0) });
      else selahs[selahs.length - 1].t1 = t1;
    });

    const plan = { bars, end: bars.length, cue: (name, b) => cueBar[name] !== undefined && b > cueBar[name] };
    return {
      psalm: psalm.n, rank: rankId, rankName: rank.name, speed: rank.speed, bpm: song.bpm, sd, barT: 16 * sd,
      notes, ghosts: [], selahs, verses: rows, plan, titleLines, songTitle: song.title || "",
      endT: total + 1.2, count: notes.length + selahs.length, short,
    };
  }
  return C;
})();
if (typeof module !== "undefined" && module.exports) module.exports = Compiler;
