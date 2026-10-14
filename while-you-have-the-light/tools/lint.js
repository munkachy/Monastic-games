// node lint.js: checks the game's scripts (in index.html's order) for names used but defined
// nowhere, names defined but never used inside a file, and top-level names no file uses.
// The scripts share one global scope, so each file's top-level names count as globals for the rest.
const fs = require('fs'), path = require('path');
const { Linter } = require('eslint'), need = (m) => require(require.resolve(m, { paths: [path.dirname(require.resolve('eslint'))] }));
const espree = need('espree');
const G = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(G, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]).filter(f => !f.startsWith('lib/') && !(process.env.WITHOUT || '').split(',').includes(f));
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(G, f), 'utf8')]));
const opts = { ecmaVersion: 2022, sourceType: 'script' };
// Top-level names of each file.
const tops = {};
for (const f of files) {
  tops[f] = [];
  for (const n of espree.parse(src[f], opts).body) {
    if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') tops[f].push(n.id.name);
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') tops[f].push(d.id.name);
  }
}
const globals = { planck: 'readonly' };
for (const f of files) for (const n of tops[f]) globals[n] = 'writable';
Object.assign(globals, Object.fromEntries(require('./browser-globals.json').map(k => [k, 'readonly'])), { ...need('../conf/globals.js').es2022 });
const linter = new Linter();
let n = 0;
for (const f of files) {
  const msgs = linter.verify(src[f], {
    languageOptions: { ...opts, globals },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }] },
  });
  for (const m of msgs) { console.log(`${f}:${m.line}: ${m.message}`); n++; }
}
// Top-level names that appear nowhere but their own definition.
const all = files.map(f => src[f]).join('\n') + ['tools/smoke.js', 'tools/smoke2.js', 'art.html'].map(f => fs.readFileSync(path.join(G, f), 'utf8')).join('\n');
for (const f of files) for (const name of tops[f]) {
  const uses = (all.match(new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')) || []).length;
  if (uses <= 1) { console.log(`${f}: top-level ${name} is never used`); n++; }
}
console.log(n ? `${n} problems` : 'clean');
