// node codemap.js: rewrites the index in CODEMAP.md (between its two marker lines) from the scripts
// themselves: for each file in index.html's order, its sections ("// ---- " lines) and the
// top-level functions and objects in each, with line numbers. The text above the markers is kept.
const fs = require('fs'), path = require('path');
const G = path.join(__dirname, '..'), MAP = path.join(G, 'CODEMAP.md');
const html = fs.readFileSync(path.join(G, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]).filter(f => !f.startsWith('lib/'));
const START = '<!-- index: made by tools/codemap.js -->', END = '<!-- end of index -->';
const out = [START, ''];
for (const f of files) {
  const lines = fs.readFileSync(path.join(G, f), 'utf8').split('\n');
  out.push(`### ${f} (${lines.length} lines)`, '');
  let sec = null, names = [];
  const flush = () => { if (sec || names.length) out.push(`- ${sec ? sec : '(top)'}${names.length ? ': ' + names.join(', ') : ''}`); names = []; };
  // Top-level names: in a file wrapped in one closure (house.js, room.js, ...), one level in.
  const wrapped = lines.some(l => /^const \w+ = \(\(\) => \{/.test(l));
  const ind = wrapped ? '  ' : '';
  lines.forEach((l, i) => {
    const s = l.match(/^\s*\/\/ ---- (.*?) -*$/);
    if (s) { flush(); sec = `**${s[1]}** (${i + 1})`; return; }
    const m = l.match(new RegExp(`^${ind}(?:async )?function\\s+([\\w$]+)`)) || l.match(new RegExp(`^${ind}const ([\\w$]+) = (?:\\{|\\(\\(\\) =>|\\[|\\([^)]*\\) =>|[\\w$]+ =>)`));
    if (m) names.push(`${m[1]} ${i + 1}`);
  });
  flush(); out.push('');
}
out.push(END);
const old = fs.existsSync(MAP) ? fs.readFileSync(MAP, 'utf8') : '';
const head = old.includes(START) ? old.slice(0, old.indexOf(START)) : old + '\n';
fs.writeFileSync(MAP, head + out.join('\n') + '\n');
console.log('CODEMAP.md: index for', files.length, 'files');
