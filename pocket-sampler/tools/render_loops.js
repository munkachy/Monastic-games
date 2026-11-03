// Usage: NODE_PATH=$(npm root -g) node render_loops.js <renders.json> <out folder> [app url]
// Renders the loops loopset.py (or vigils.py) writes, each with the app's own export (renderLoop:
// the pattern chain as one seamless loop, the tail folded back into the start), as
// raw float32 mono at the app's rate: <out>/<id>.f32, its rate in <out>/<id>.sr. A line to say
// ({ id, say: { text, voice } }) is said by the app's robot voice instead. The app must be served (e.g.
// npx http-server -p 8765 from the repo root). Uses the preinstalled Chromium.
const { chromium } = require('playwright');
const fs = require('fs');
const [renders, out, url = 'http://localhost:8765/pocket-sampler/'] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('Ready'), null, { timeout: 120000 });
  for (const { id, song, say } of JSON.parse(fs.readFileSync(renders))) {
    const r = song ? await p.evaluate(s => pocketDebug.renderSong(s), song) : await p.evaluate(x => pocketDebug.say(x.text, x.voice), say);
    const buf = Buffer.from(r.b64, 'base64');
    fs.writeFileSync(`${out}/${id}.f32`, buf); fs.writeFileSync(`${out}/${id}.sr`, String(r.sr));
    const x = new Float32Array(buf.buffer, buf.byteOffset, r.n); let top = 0; for (const v of x) top = Math.max(top, Math.abs(v));
    console.log(id.padEnd(4), `${(r.n / r.sr).toFixed(3)} s`, 'peak', top.toFixed(3));
  }
  await b.close();
})();
