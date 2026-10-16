# Vox Machina

Type a Bible verse, hear it spoken by a robot, shape the sound, and download it
as a 44.1 kHz, 16-bit mono WAV, ready to load into Remixlive or a game.

**Open it at [munkachy.github.io/Monastic-games/vox-machina](https://munkachy.github.io/Monastic-games/vox-machina/)**

*Synthetic voice. No human voice recordings used.* Every sound comes from
eSpeak NG, which builds speech from rules and formant tables. The tool does
not use MBROLA, Festival/Flite, neural TTS, cloud TTS or the browser's
built-in `speechSynthesis`.

## What it does

- **Verse box** with Preview, Download WAV, and (on iPhone) Share, which sends
  the file straight to Files or another app.
- **Voice:** eSpeak NG variant (male, female, Robosoft, UniRobot, whisper,
  croak, Demonic and others), accent (American, British, Scottish, Caribbean,
  Latin), pitch, pitch range (0 = monotone), speed, and word gap.
- **Effects,** in this order: synthetic choir (chorus) → ring modulator →
  bitcrusher (bit depth and sample-rate reduction) → delay and reverb.
- **Robot amount** scales every effect at once. At 0% you hear plain eSpeak;
  at 100% each effect is where its own slider puts it.
- **Batch:** one line per clip, `filename | verse text`. One tap renders them
  all with the current settings and downloads a ZIP.
- **Presets:** Kraftwerk, Cold Cathedral, 8-bit Monk, Dalek Lector and
  Whispered Vigil are built in. *Save as…* stores your own in the browser
  (localStorage).

Preview and export use the same rendered buffer from an `OfflineAudioContext`,
so the file sounds exactly like the preview.

## Using it

It has to be served over http(s); opening `index.html` from disk will not load
the WebAssembly. Open the GitHub Pages link once while online and the service
worker keeps every file on the device, so after that it works offline. The
first load downloads an 18 MB voice engine. On iPhone, turn off the silent
switch to hear previews (downloads are not affected).

To run it locally: `python3 -m http.server` in this folder, then open
<http://localhost:8000/>.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page and its styles |
| `app.js` | Controls, presets, preview, download, batch |
| `engine.js` | eSpeak NG wrapper, the effects chain, and the WAV writer |
| `sw.js` | Offline cache. Change `VERSION` after editing any file |
| `lib/` | Bundled third-party code and its licenses |

To add a slider, add one line to `SLIDERS` in `app.js` and use the value in
`engine.js`. To add a built-in preset, add it to `BUILTIN` in `app.js`.

## Open-source components

| Component | Used for | License | Source |
| --- | --- | --- | --- |
| eSpeak NG | The voice: rule-based formant speech synthesis | GPL v3 or later | <https://github.com/espeak-ng/espeak-ng> |
| espeak-ng.js (npm `espeak-ng` 1.0.2, by Ian Armour) | eSpeak NG compiled to WebAssembly with Emscripten, voice data embedded (`lib/espeak-ng.js`, `lib/espeak-ng.wasm`) | GPL v3 or later | <https://github.com/ianmarmour/espeak-ng.js> · <https://www.npmjs.com/package/espeak-ng> |
| JSZip 3.10.2 | Building the batch ZIP (`lib/jszip.min.js`) | MIT or GPL v3 (dual; used here under MIT) | <https://github.com/Stuk/jszip> |

The full GPL v3 text is in [`lib/ESPEAK-NG-LICENSE.txt`](lib/ESPEAK-NG-LICENSE.txt)
and the JSZip license in [`lib/JSZIP-LICENSE.md`](lib/JSZIP-LICENSE.md).
Because eSpeak NG is GPL v3, this folder as a whole is distributed under the
GPL v3 as well; the corresponding source for the WebAssembly build is the
eSpeak NG repository above, built with the steps in the espeak-ng.js README.

### Why this build

I chose the npm `espeak-ng` build because it is eSpeak **NG** itself, with its
full set of voice variants. The other option, meSpeak, is built on the older
eSpeak 1.x and has fewer variants. One limit of this build: it was compiled
without the Klatt synthesizer, so the `klatt` variants fall back to eSpeak's
standard formant synthesizer. That is still rule-based formant synthesis, but
they sound much like the default voice.

The WAV files you make are your own audio output; the GPL covers the program,
not the sounds it produces.
