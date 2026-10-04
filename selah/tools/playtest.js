#!/usr/bin/env node
"use strict";
// SELAH: could a person play it? Compiles every psalm at every rank and checks each chart against
// the two thumbs (hands.js): no more than two touches at once, no thumb asked to tap faster than it
// can or to cross the line faster than it can move, nothing faster than a person can keep time.
// It also checks each rank against its own rules (compiler.js, Compiler.RANKS), as Rock Band's
// charts are kept to theirs, and reports how dense each chart is.
//
//   node selah/tools/playtest.js            every psalm, every rank
//   node selah/tools/playtest.js 150        one psalm
//   node selah/tools/playtest.js -v         and every tight spot
//
// Exits 1 if any chart asks for what the thumbs cannot do, or breaks its rank's rules.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const load = (f, name) => new Function(fs.readFileSync(path.join(root, f), "utf8") + "\nreturn " + name + ";")();
const SONGS = load("songs.js", "SONGS"), DOUAY = load("douay.js", "DOUAY");
const Hands = require(path.join(root, "hands.js")), Compiler = require(path.join(root, "compiler.js"));

const args = process.argv.slice(2), verbose = args.includes("-v"), only = args.filter((a) => /^\d+$/.test(a)).map(Number);
const PSALMS = [[1, "ps1"], [3, "ps3"], [150, "ps150"]].filter(([n]) => !only.length || only.includes(n));
const ms = (s) => Math.round(s * 1000) + " ms";
const pad = (s, n) => String(s).padEnd(n);
let bad = 0;

console.log("Two thumbs: at most " + Hands.LIMITS.touches + " at once; one thumb in one place at most " + (1 / Hands.LIMITS.repeat).toFixed(0) +
  " a second; a hop of one bit " + ms(Hands.need(Hands.LIMITS.w)) + ", across the whole line " + ms(Hands.need(0.86)) + "; nothing closer than " + ms(Hands.LIMITS.stream) + ".\n");
console.log(pad("psalm", 6) + pad("rank", 13) + pad("notes", 7) + pad("a sec", 7) + pad("peak", 7) + pad("closest", 9) + pad("to spare", 10) + "verdict");
for (const [n, songId] of PSALMS) {
  const psalm = DOUAY.psalms[n - 1], song = SONGS[songId];
  for (const r of Compiler.RANK_ORDER) {
    const c = Compiler.compile(psalm, song, r), h = Hands.check(c.notes), rule = Compiler.RANKS[r];
    const broken = Compiler.audit(c);
    const ok = h.ok && !broken.length;
    if (!ok) bad++;
    console.log(pad(n, 6) + pad(c.rankName, 13) + pad(c.notes.length, 7) + pad(h.nps.toFixed(1), 7) + pad(h.peak.toFixed(1), 7) + pad(ms(h.fastest), 9) + pad(ms(h.slack), 10) +
      (ok ? "a person can play it" : (h.problems.length ? h.problems.length + " spots no person could play" : "") + (broken.length ? (h.problems.length ? "; " : "") + broken.length + " breaks of the rank's rules" : "")) +
      (rule && h.nps > rule.nps ? "  (denser than the rank's " + rule.nps + " a second)" : ""));
    if (verbose || !ok) {
      const show = h.problems.slice(0, verbose ? 40 : 6);
      for (const p of show) console.log("        " + p.t.toFixed(2) + " s, bar " + p.notes[0].bar + ": " + p.why + " (" + p.notes.map((x) => x.lane + (x.type !== "tap" ? " " + x.type : "")).join(" + ") + ", " + ms(p.slack) + ")");
      if (h.problems.length > show.length) console.log("        … and " + (h.problems.length - show.length) + " more");
      for (const b of broken.slice(0, 6)) console.log("        " + b);
    }
  }
}
console.log(bad ? "\n" + bad + " charts a person could not play." : "\nEvery chart can be played with two thumbs.");
process.exit(bad ? 1 : 0);
