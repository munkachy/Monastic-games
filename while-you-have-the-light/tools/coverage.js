// node coverage.js a.json [b.json ...]: from the coverage the test tools record (run them with
// COVER=a.json), the game's named functions that no test ever ran, by file. e.g.
//   COVER=/tmp/c1.json node smoke2.js; COVER=/tmp/c2.json node replay.js URL; node coverage.js /tmp/c1.json /tmp/c2.json
const fs = require('fs');
const ran = new Map(), all = new Map(), src = {};
for (const f of process.argv.slice(2)) for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const file = e.url.split('/').pop().split('?')[0];
  if (!/\.js$/.test(file) || file.startsWith('planck')) continue;
  src[file] = e.source;
  for (const fn of e.functions) {
    if (!fn.functionName) continue;
    const key = file + ':' + fn.ranges[0].startOffset;
    all.set(key, { file, name: fn.functionName, at: fn.ranges[0].startOffset });
    if (fn.ranges[0].count > 0) ran.set(key, true);
  }
}
const by = {};
let n = 0, m = 0;
for (const [k, f] of all) { m++; if (ran.has(k)) continue; n++; (by[f.file] = by[f.file] || []).push(f); }
for (const file of Object.keys(by).sort()) {
  const line = (at) => src[file].slice(0, at).split('\n').length;
  console.log(`${file}: ${by[file].length} never ran`);
  console.log('  ' + by[file].sort((a, b) => a.at - b.at).map(f => `${f.name} ${line(f.at)}`).join(', '));
}
console.log(`${m - n} of ${m} named functions ran (${Math.round(100 * (m - n) / m)}%)`);
