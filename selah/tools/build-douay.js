"use strict";
// SELAH: build the Douay-Rheims (Challoner, public domain) for the game, in the Vulgate numbering.
// The wording is Psalter Runner's (psalter-runner/index.html), checked verse by verse against
// drbo.org and eBible.org. The verse numbers and the psalms' headings are Lumina's
// (github.com/munkachy/lumina, bible-data.js), which counts the headings as the Douay does, so that
// a Grail file made by Lumina (its "douay" numbers) lines up with these verses one for one.
// Lumina's own wording is not used: it has typing slips and stray editor's notes.
//
// Writes selah/douay.js (the built-in text) and selah/packs/douay.selah-pack.v1.json (the same,
// in the pack format, to show the file's shape).
// Usage: node selah/tools/build-douay.js path/to/lumina/bible-data.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const lumina = process.argv[2];
if (!lumina) { console.error("usage: node selah/tools/build-douay.js path/to/lumina/bible-data.js"); process.exit(2); }

const src = fs.readFileSync(path.join(ROOT, "psalter-runner", "index.html"), "utf8");
const PSALTER = eval(src.slice(src.indexOf("const PSALTER = ") + 16, src.indexOf("\nconst PSALMS")).replace(/;\s*$/, ""));
global.window = {};
require(path.resolve(lumina));
const L = window.LUMINA_DATA.books.find((b) => b.id === "psalms").ch;

// Psalter Runner is in the Hebrew order: gather it into the Vulgate's, marking where a second
// Hebrew psalm joined into one Vulgate psalm begins.
const V = [];
for (let i = 0; i < 150; i++) V.push({ inc: [], verses: [], joinAt: -1 });
PSALTER.forEach(([inc, vs, vg], i) => {
  const heb = i + 1;
  if (heb === 116) { V[113].inc.push(inc); V[113].verses.push(...vs.slice(0, 9)); V[114].inc.push("Credidi, propter"); V[114].verses.push(...vs.slice(9)); return; }
  if (heb === 147) { V[145].inc.push("Laudate Dominum, quoniam bonus"); V[145].verses.push(...vs.slice(0, 11)); V[146].inc.push(inc); V[146].verses.push(...vs.slice(11)); return; }
  const P = V[parseInt(vg, 10) - 1];
  if (P.verses.length) P.joinAt = P.verses.length;
  P.inc.push(inc); P.verses.push(...vs);
});

const words = (t) => t.toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter(Boolean);
const tidy = (t) => t.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s*\[[^\]]*$/, "").replace(/\s+/g, " ").trim();
// Psalm 118's stanza letters, one every eight verses (the Douay's spellings, as Lumina prints them,
// which leaves out the last; so they are set here, not read from the text).
const LETTERS = ["Aleph", "Beth", "Gimel", "Daleth", "He", "Vau", "Zain", "Heth", "Teth", "Jod", "Caph",
  "Lamed", "Mem", "Nun", "Samech", "Ain", "Phe", "Sade", "Coph", "Res", "Sin", "Tau"];
const problems = [];

const psalms = V.map((P, i) => {
  const n = i + 1, lv = L[i].v, k = lv.length - P.verses.length;
  if (k < 0 || k > 3) throw new Error("Psalm " + n + ": cannot line up the two texts");
  const verses = [];
  // The headings, as their own verses, where the Douay counts them.
  for (let j = 0; j < k; j++) verses.push({ v: j + 1, lines: [tidy(lv[j])], title: true });
  P.verses.forEach((text, j) => {
    const v = k + j + 1, lt = lv[k + j], o = { v, lines: text.split("\n").map((x) => x.trim()).filter(Boolean) };
    // A heading run into the verse ("Unto the end, a psalm for David. To thee, O Lord...") or a
    // stanza letter: keep it as the verse's heading, apart from the words.
    if (n === 118) { if ((v - 1) % 8 === 0) o.heading = LETTERS[(v - 1) / 8]; }
    else if (j === 0) {
      const first = words(text).slice(0, 3).join(" "), lw = words(lt);
      const at = lw.join(" ").indexOf(first);
      if (at > 0) {
        // the heading is the words of Lumina's verse before the first words of ours
        const before = lw.join(" ").slice(0, at).trim().split(" ").length;
        const raw = lt.split(/\s+/).slice(0, before).join(" ");
        if (before >= 2) o.heading = tidy(raw);
      } else if (at < 0) problems.push(n + ":" + v);     // the first verse should begin as ours does
    }
    if (j === P.joinAt) o.sectionStart = true;
    verses.push(o);
  });
  return { n, incipit: P.inc.join(" · "), verses };
});

const pack = {
  selahPack: 1, id: "douay", displayName: "Douay", name: "Douay-Rheims (Challoner)",
  numbering: "vulgate", titlesCounted: true, license: "public domain", language: "en", psalms,
};
fs.writeFileSync(path.join(__dirname, "..", "douay.js"),
  "\"use strict\";\n// SELAH: the Douay-Rheims Psalter (Challoner, public domain), in the Vulgate numbering, in the\n" +
  "// same shape as a pack file. Made by tools/build-douay.js; do not edit by hand.\n" +
  "const DOUAY = " + JSON.stringify(pack) + ";\n");
fs.writeFileSync(path.join(__dirname, "..", "packs", "douay.selah-pack.v1.json"), JSON.stringify(pack, null, 1) + "\n");
const nv = psalms.reduce((a, p) => a + p.verses.length, 0), nh = psalms.reduce((a, p) => a + p.verses.filter((x) => x.title).length, 0);
console.log("douay.js: 150 psalms, " + nv + " verses (" + nh + " headings)" + (problems.length ? "; first words not found in Lumina at " + problems.join(", ") : ""));
