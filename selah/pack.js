"use strict";
// SELAH: the voice packs. A pack is a psalter the player brings from their own device
// (selah-pack.v1.json; the whole format is in PLAN.md, "The pack file"). This checks a pack
// before the game will use it, and turns its psalm numbers into the Douay's (the Vulgate's).
// It never prints or sends the text: a pack may be under copyright, and it stays on the device.
//
// In the page:  const r = SelahPack.validate(obj);  if (r.ok) ...
// From a shell: node selah/pack.js my.selah-pack.v1.json   (checks it; shows counts, never text)
const SelahPack = (() => {
  const P = {};
  const MAX_ERRORS = 50, MAX_LINE = 400, MAX_LINES = 12;
  P.MAX_BYTES = 4 * 1024 * 1024;
  const isInt = (x) => Number.isInteger(x);
  const isBool = (x) => typeof x === "boolean";
  const KNOWN_TOP = ["selahPack", "id", "displayName", "name", "numbering", "titlesCounted", "license", "language", "psalms"];
  const KNOWN_PSALM = ["n", "incipit", "verses"];
  const KNOWN_VERSE = ["v", "lines", "title", "pause", "stanzaEnd", "douay", "heading", "sectionStart"];
  const str = (x, max) => typeof x === "string" && x.trim() !== "" && x.length <= max;

  // Check a parsed pack. Returns { ok, errors, warnings, summary }. Errors stop the import;
  // warnings do not (a psalm with a problem is played from the Douay instead).
  P.validate = function (pack, opts) {
    opts = opts || {};
    const errors = [], warnings = [];
    const err = (path, msg) => { if (errors.length < MAX_ERRORS) errors.push(path + ": " + msg); };
    const warn = (path, msg) => { if (warnings.length < MAX_ERRORS) warnings.push(path + ": " + msg); };
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) return { ok: false, errors: ["the file is not a pack (expected a JSON object)"], warnings, summary: null };

    if (pack.selahPack !== 1) err("selahPack", "must be 1 (this is version 1 of the format)");
    if (typeof pack.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(pack.id)) err("id", "lower-case letters, digits and hyphens, at most 32");
    else if (pack.id === "douay" && !opts.builtIn) err("id", "\"douay\" is the built-in text; give the pack another id");
    if (typeof pack.displayName !== "string" || !pack.displayName.trim() || pack.displayName.length > 24) err("displayName", "1 to 24 characters (shown as \"Voice: ...\")");
    if (pack.numbering !== "hebrew" && pack.numbering !== "vulgate") err("numbering", "\"hebrew\" or \"vulgate\"");
    if (pack.titlesCounted !== undefined && !isBool(pack.titlesCounted)) err("titlesCounted", "true or false");
    if (typeof pack.license !== "string" || !pack.license.trim() || pack.license.length > 80) err("license", "a short note, 1 to 80 characters");
    if (pack.language !== undefined && (typeof pack.language !== "string" || pack.language.length > 16)) err("language", "a language tag such as \"en\"");
    if (pack.name !== undefined && !str(pack.name, 80)) err("name", "the full name, 1 to 80 characters");
    for (const k of Object.keys(pack)) if (!KNOWN_TOP.includes(k)) warn(k, "not part of version 1; ignored");

    const seen = new Set();
    let verses = 0;
    if (!Array.isArray(pack.psalms) || !pack.psalms.length) err("psalms", "a list of at least one psalm");
    else if (pack.psalms.length > 150) err("psalms", "at most 150 psalms");
    else pack.psalms.forEach((ps, i) => {
      const at = "psalms[" + i + "]";
      if (!ps || typeof ps !== "object") return err(at, "not a psalm object");
      if (!isInt(ps.n) || ps.n < 1 || ps.n > 150) return err(at + ".n", "a psalm number from 1 to 150");
      if (seen.has(ps.n)) err(at + ".n", "psalm " + ps.n + " appears twice");
      seen.add(ps.n);
      if (ps.incipit !== undefined && !str(ps.incipit, 120)) err(at + ".incipit", "1 to 120 characters");
      for (const k of Object.keys(ps)) if (!KNOWN_PSALM.includes(k)) warn(at + "." + k, "not part of version 1; ignored");
      if (!Array.isArray(ps.verses) || !ps.verses.length) return err(at + ".verses", "a list of at least one verse");
      const nums = new Set();
      let sung = 0;
      ps.verses.forEach((vs, j) => {
        const vat = at + ".verses[" + j + "]";
        if (!vs || typeof vs !== "object") return err(vat, "not a verse object");
        // Verses are listed in the order the psalter prints them, which may move a verse
        // (the Grail does, in two psalms), so numbers need not rise; each is used once.
        if (!isInt(vs.v) || vs.v < 1) err(vat + ".v", "a verse number from 1 up");
        else if (nums.has(vs.v)) err(vat + ".v", "verse " + vs.v + " appears twice");
        else nums.add(vs.v);
        if (!Array.isArray(vs.lines) || !vs.lines.length || vs.lines.length > MAX_LINES) err(vat + ".lines", "1 to " + MAX_LINES + " lines (a couplet is 2, a triplet 3)");
        else vs.lines.forEach((ln, k) => {
          if (typeof ln !== "string" || !ln.trim()) err(vat + ".lines[" + k + "]", "an empty line");
          else if (ln.length > MAX_LINE) err(vat + ".lines[" + k + "]", "longer than " + MAX_LINE + " characters");
          else if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(ln)) err(vat + ".lines[" + k + "]", "contains control characters");
        });
        for (const f of ["title", "pause", "stanzaEnd", "sectionStart"]) if (vs[f] !== undefined && !isBool(vs[f])) err(vat + "." + f, "true or false");
        if (vs.douay !== undefined && (!isInt(vs.douay) || vs.douay < 1)) err(vat + ".douay", "the Douay verse number, from 1 up");
        if (vs.heading !== undefined && !str(vs.heading, 80)) err(vat + ".heading", "1 to 80 characters");
        for (const k of Object.keys(vs)) if (!KNOWN_VERSE.includes(k)) warn(vat + "." + k, "not part of version 1; ignored");
        if (!vs.title) sung++;
        verses++;
      });
      // Psalm 118 (Hebrew 119) is the Book of Letters: 22 letters of 8 verses each.
      const great = pack.numbering === "hebrew" ? 119 : 118;
      if (ps.n === great && sung !== 176) warn(at, "Psalm " + great + " has " + sung + " verses, not 176; the Book of Letters will use the Douay");
    });

    const missing = [];
    for (let n = 1; n <= 150; n++) if (!seen.has(n)) missing.push(n);
    if (missing.length && missing.length < 150) warn("psalms", missing.length + " psalm(s) not in the pack (" + ranges(missing) + "); those are played from the Douay");
    const summary = { id: pack.id, displayName: pack.displayName, numbering: pack.numbering, psalms: seen.size, verses, missing: ranges(missing) };
    return { ok: errors.length === 0, errors, warnings, summary };
  };

  // "3, 7-9, 12": numbers as short ranges.
  function ranges(ns) {
    const out = [];
    for (let i = 0; i < ns.length; i++) {
      let j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
      out.push(i === j ? String(ns[i]) : ns[i] + "-" + ns[j]); i = j;
    }
    return out.join(", ");
  }

  // Where a verse of a pack falls in the Douay (Vulgate) numbering, which the game keeps.
  // From the Hebrew: 9 and 10 are one psalm (9); 114 and 115 are one (113); 116 is two
  // (114 and 115, split after verse 9); 147 is two (146 and 147, split after verse 11);
  // 11-113 and 117-146 are one lower; 1-8 and 148-150 are the same. Returns { n, part }:
  // `part` is 0, or 1 for the second Hebrew psalm joined into one Vulgate psalm (its verses
  // follow the first's), so the game can keep their order.
  P.toVulgate = function (numbering, n, v) {
    if (numbering === "vulgate") return { n, part: 0 };
    if (n <= 8 || n >= 148) return { n, part: 0 };
    if (n === 9) return { n: 9, part: 0 };
    if (n === 10) return { n: 9, part: 1 };
    if (n <= 113) return { n: n - 1, part: 0 };
    if (n === 114) return { n: 113, part: 0 };
    if (n === 115) return { n: 113, part: 1 };
    if (n === 116) return { n: v <= 9 ? 114 : 115, part: 0 };
    if (n <= 146) return { n: n - 1, part: 0 };
    return { n: v <= 11 ? 146 : 147, part: 0 };      // 147
  };

  return P;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SelahPack;
  if (require.main === module) {
    const fs = require("fs"), file = process.argv[2];
    if (!file) { console.log("usage: node selah/pack.js <pack.json>"); process.exit(2); }
    if (fs.statSync(file).size > SelahPack.MAX_BYTES) { console.log("too large: a pack is at most 4 MB"); process.exit(1); }
    let obj;
    try { obj = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log("not valid JSON: " + e.message); process.exit(1); }
    const r = SelahPack.validate(obj, { builtIn: process.argv.includes("--built-in") });
    for (const e of r.errors) console.log("error   " + e);
    for (const w of r.warnings) console.log("warning " + w);
    if (r.summary) console.log((r.ok ? "OK" : "NOT OK") + ": \"" + r.summary.displayName + "\" (" + r.summary.id + "), " + r.summary.psalms + " psalms, " + r.summary.verses + " verses, " + r.summary.numbering + " numbering" + (r.summary.missing ? "; missing " + r.summary.missing : ""));
    process.exit(r.ok ? 0 : 1);
  }
}
