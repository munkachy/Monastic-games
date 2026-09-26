// Convert the chant scores in benedictine-bricks/music/gabc/ (GABC notation,
// from GregoBase) into note data for the game (chants.js) and into MIDI files
// (music/*.mid) that open in any music program.
//
// Run with: node tools/gabc2js.js

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "benedictine-bricks");
const SOURCES = [
  { key: "vigils", file: "te-deum.gabc", hour: "Vigils", gregobase: 2305, maxNotes: 90 },
  { key: "prime", file: "jam-lucis.gabc", hour: "Prime", gregobase: 12589, maxNotes: 110 },
  { key: "sext", file: "rector-potens.gabc", hour: "Sext", gregobase: 12355, maxNotes: 110 },
  { key: "vespers", file: "ave-maris-stella.gabc", hour: "Vespers", gregobase: 4594, maxNotes: 200 },
  { key: "compline", file: "te-lucis.gabc", hour: "Compline", gregobase: 1843, maxNotes: 80 },
  { key: "salve", file: "salve-regina.gabc", hour: "Compline", gregobase: 2435, maxNotes: 400 },
];

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];

function parse(text) {
  const [head, body] = text.split(/^%%\s*$/m);
  const name = (head.match(/^name:\s*(.*?);/m) || [])[1] || "";
  const mode = (head.match(/^mode:\s*(.*?);/m) || [])[1] || "";
  const notes = [];   // [midi (0 = rest), duration in eighths]
  const words = [];   // [note index, syllable]
  let clef = { letter: "c", line: 4 };
  let flats = new Set();
  const re = /([^()]*)\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(body))) {
    const syllable = m[1].replace(/<[^>]*>/g, "").replace(/[{}*]/g, "").replace(/^\s*\d+\.\s*/, "").trim();
    let group = m[2].replace(/\[[^\]]*\]/g, "").trim();
    const clefMatch = group.match(/^([cf])b?([1-4])$/);
    if (clefMatch) { clef = { letter: clefMatch[1], line: +clefMatch[2] }; continue; }
    if (syllable) words.push([notes.length, syllable]);
    const clefPos = 1 + 2 * clef.line;
    const base = clef.letter === "c" ? { midi: 60, degree: 0 } : { midi: 48, degree: 3 };
    for (let i = 0; i < group.length; i++) {
      const ch = group[i];
      if (!/[a-mA-M]/.test(ch)) continue;
      const pos = ch.toLowerCase().charCodeAt(0) - 97;
      const next = group[i + 1];
      if (next === "x") { flats.add(pos); i++; continue; }
      if (next === "y") { flats.delete(pos); i++; continue; }
      const degree = base.degree + (pos - clefPos);
      const octave = Math.floor(degree / 7);
      let midi = base.midi + octave * 12 + C_MAJOR[((degree % 7) + 7) % 7];
      if (flats.has(pos)) midi -= 1;
      let dur = 1;
      let j = i + 1;
      while (j < group.length && /[._'wvVso~<>r]/.test(group[j])) {
        if (group[j] === ".") dur += 1;
        if (group[j] === "_") dur += 0.5;
        j++;
      }
      notes.push([midi, dur]);
      i = j - 1;
    }
    let rest = 0;
    if (group.includes("::")) rest = 2;
    else if (group.includes(":")) rest = 1.5;
    else if (group.includes(";")) rest = 1;
    else if (group.includes(",")) rest = 0.5;
    if (rest) { notes.push([0, rest]); flats = new Set(); }
  }
  return { name, mode, notes, words };
}

// Cut at the first long rest after maxNotes, so a chant ends at a phrase.
function trim(chant, maxNotes) {
  let end = chant.notes.length;
  let count = 0;
  for (let i = 0; i < chant.notes.length; i++) {
    if (chant.notes[i][0]) count++;
    if (count >= maxNotes && chant.notes[i][0] === 0 && chant.notes[i][1] >= 1) { end = i + 1; break; }
  }
  chant.notes = chant.notes.slice(0, end);
  chant.words = chant.words.filter(([i]) => i < end);
  // Keep every chant in a comfortable range, near middle C.
  const pitches = chant.notes.filter(([p]) => p).map(([p]) => p).sort((a, b) => a - b);
  const middle = pitches[Math.floor(pitches.length / 2)];
  const shift = Math.round((64 - middle) / 12) * 12;
  chant.notes = chant.notes.map(([p, d]) => [p ? p + shift : 0, d]);
  return chant;
}

// A standard MIDI file, format 0: one track, choir voice.
function midiFile(chant, bpm) {
  const ppq = 480;
  const eighth = ppq / 2;
  const bytes = [];
  const vlq = (n) => {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  };
  const tempo = Math.round(60000000 / bpm);
  bytes.push(0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255);
  bytes.push(0, 0xc0, 52); // program: choir aahs
  let wait = 0;
  for (const [p, d] of chant.notes) {
    const ticks = Math.round(d * eighth);
    if (!p) { wait += ticks; continue; }
    bytes.push(...vlq(wait), 0x90, p, 90);
    bytes.push(...vlq(ticks), 0x80, p, 0);
    wait = 0;
  }
  bytes.push(...vlq(wait), 0xff, 0x2f, 0);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255];
  const len = bytes.length;
  const track = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255];
  return Buffer.from([...header, ...track, ...bytes]);
}

const out = {};
for (const src of SOURCES) {
  const chant = trim(parse(fs.readFileSync(path.join(DIR, "music", "gabc", src.file), "utf8")), src.maxNotes);
  out[src.key] = {
    name: chant.name.replace(/\s*\(.*\)$/, ""),
    hour: src.hour,
    mode: chant.mode,
    source: "GregoBase " + src.gregobase,
    notes: chant.notes,
    words: chant.words,
  };
  fs.writeFileSync(path.join(DIR, "music", src.file.replace(".gabc", ".mid")), midiFile(chant, 100));
  console.log(src.key, chant.name, chant.notes.filter(([p]) => p).length, "notes");
}

fs.writeFileSync(
  path.join(DIR, "chants.js"),
  "// Chant melodies for Benedictine Bricks, generated by tools/gabc2js.js from the\n" +
    "// GABC scores in music/gabc/ (transcribed on GregoBase from the Liber Usualis,\n" +
    "// the Liber Hymnarius and the Antiphonale Monasticum). Do not edit by hand.\n" +
    "// Each note is [MIDI pitch (0 = rest), length in eighth notes].\n\n" +
    "const CHANTS = " + JSON.stringify(out) + ";\n"
);
