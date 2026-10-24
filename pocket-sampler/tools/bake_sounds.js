// Usage: NODE_PATH=$(npm root -g) node bake_sounds.js <sounds folder> [ids] [app url]
// Everything the app makes in code is kept as a recording: playing a WAV costs the phone
// far less than building the sound again for every note. This records, with the app's own
// engine (so they sound just as they did):
//   - each synth (LIBRARY entries with `synth`): a note every 6 half steps, from an
//     octave and a half below its root to two and a half octaves above, packed like the sampled
//     instruments (one WAV, zones in banks.json). Each note is as it sounds tapped (One
//     shot); held on Gate or Loop it plays a held take of its own (ha, hb), recorded after
//     it, which rings on a seamless loop (la, lb) once the note has settled. The wobble is
//     recorded at 120 BPM, its loop a whole number of wobbles.
//   - each kit made in code (LIBRARY entries with `kit`): its hits, as a bank like the
//     recorded kits.
// The app must be served from the repo root (npx http-server -p 8765). Writes <id>.wav and
// the entries in banks.json. Uses the preinstalled Chromium.
const { chromium } = require('playwright');
const fs = require('fs');
const [dir, only, url = 'http://localhost:8765/pocket-sampler/'] = process.argv.slice(2);
const RATE = 32000, WOBBLE = [2, 1, 0.5, 1 / 3, 0.25];

const f32 = b64 => { const b = Buffer.from(b64, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
function wav(path, chans, rate) {          // mono 16-bit
  const n = chans.length, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVEfmt ', 8); d.writeUInt32LE(16, 16);
  d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22); d.writeUInt32LE(rate, 24); d.writeUInt32LE(rate * 2, 28);
  d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34); d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(chans[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(path, d);
}
// A seamless loop from a to b (samples): the end fades into what comes just before a, so
// going from b back to a carries straight on.
function crossfade(x, a, b) {
  const X = Math.min(Math.round(0.08 * RATE), Math.floor((b - a) / 3), a);
  for (let i = 0; i < X; i++) {
    const t = (i + 1) / (X + 1), fi = Math.sin(t * Math.PI / 2), fo = Math.cos(t * Math.PI / 2);
    x[b - X + i] = x[b - X + i] * fo + x[a - X + i] * fi;
  }
}
const nearZero = (x, i) => { let best = i; for (let j = i - 200; j <= i + 200; j++) if (j > 0 && j < x.length && Math.abs(x[j]) < Math.abs(x[best])) best = j; return best; };

(async () => {
  const banks = JSON.parse(fs.readFileSync(`${dir}/banks.json`));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('Ready'), null, { timeout: 120000 });
  const lib = await p.evaluate(() => Object.fromEntries(pocketDebug.ids().map(id => [id, pocketDebug.lib(id)])));
  const want = id => !only || only.split(',').includes(id);
  for (const [id, F] of Object.entries(lib)) {
    if (!want(id)) continue;
    if (F.synth) {
      const sp = F.synth, root = sp.root, L = 0.05 + F.len * 2, a = sp.attack || 0.003, gap = Math.round(0.02 * RATE);
      const parts = [], zones = [];
      let at = 0, top = 0;
      for (let m = root - 18; m <= root + 30; m += 6) {
        const one = f32(await p.evaluate(([id, m, s, r]) => pocketDebug.bakeNote(id, m, false, s, r), [id, m, L + 0.12, RATE]));
        const z = [m, at, at + one.length];
        parts.push(one); at += one.length + gap;
        // held: a take long enough to settle (past the attack and any swell), looped near its end
        const held = Math.max(1.6, a + 1.4), h = f32(await p.evaluate(([id, m, s, r]) => pocketDebug.bakeNote(id, m, true, s, r), [id, m, held, RATE]));
        let la = Math.round((held - 1.05) * RATE), lb = Math.round((held - 0.1) * RATE);
        if (sp.type === 'wobble') { const per = 60 / 120 * WOBBLE[sp.rate ?? 2] * RATE, k = Math.max(1, Math.floor((lb - la) / per)); la = Math.round(lb - k * per); }
        else { la = nearZero(h, la); lb = nearZero(h, lb); }
        crossfade(h, la, lb);
        z.push(at + la, at + lb, at, at + h.length);
        parts.push(h); at += h.length + gap;
        zones.push(z);
      }
      for (const x of parts) for (const v of x) top = Math.max(top, Math.abs(v));
      const level = top > 0.98 ? top / 0.98 : 1;          // kept under full scale; played back louder by as much
      const all = new Float32Array(at); let o = 0;
      for (const x of parts) { for (let i = 0; i < x.length; i++) all[o + i] = x[i] / level; o += x.length + gap; }
      wav(`${dir}/${id}.wav`, all, RATE);
      banks[id] = { name: F.name, rate: RATE, synth: true, ...(level > 1 && { level: +level.toFixed(4) }), zones };
      console.log(id.padEnd(10), zones.length, 'notes', (at / RATE).toFixed(1) + ' s', 'peak', top.toFixed(2));
    } else if (F.kit) {
      const hits = await p.evaluate(k => pocketDebug.bakeKit(k), F.kit), rate = hits[0].rate, gap = Math.round(0.02 * rate);
      const slices = [], from = []; let at = 0;
      const xs = hits.map(h => f32(h.b64));
      for (const [k, x] of xs.entries()) { slices.push([at, at + x.length]); from.push(hits[k].name); at += x.length + gap; }
      const all = new Float32Array(at); let o = 0;
      for (const x of xs) { all.set(x, o); o += x.length + gap; }
      wav(`${dir}/${id}.wav`, all, rate);
      banks[id] = { name: F.name, rate, slices, from };
      console.log(id.padEnd(10), xs.length, 'hits', (at / rate).toFixed(1) + ' s');
    }
  }
  fs.writeFileSync(`${dir}/banks.json`, JSON.stringify(banks));
  await b.close();
})();
