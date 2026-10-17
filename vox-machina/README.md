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
- **Sing:** tap *Sing*, type a key (`Bm`, `F#`, `Eb`, `D dorian`, `E phrygian`)
  and pick a style, and the verse is sung on exact notes, one per syllable.
  The tune is shown on screen, note by note; *Melody ▶* gives another tune in
  the same style. Tempo is in BPM, so clips sit on the grid in Remixlive.
  - Styles: **Monastic psalm tone** (rise to a reciting note, mid-verse
    cadence, a fall to the tonic), **Monastic recto tono** (all on one note,
    as the Office is said in choir), **Hymn**, **Kraftwerk**, **Lament**,
    **Trance arpeggio**, and for the dance floor **Techno**, **Electro**,
    **Dubstep** (half-time) and **Acid**, which use syncopated rhythms with
    rests between words.
  - Harmony: organum (parallel fifths), octave, thirds, choir chords, or a
    tonic-and-fifth drone. *Ensemble* adds detuned copies of each voice.
  - How it works: eSpeak speaks each word on a flat pitch, stretched to its
    notes; a synthesizer plays the tune; a 22-band **vocoder** puts the shape
    of the words onto the synth (`melody.js`, `sing.js`). Still no recorded
    voice anywhere.
- **Tempo & rhythm effects:** Tempo (BPM) drives the singing, and two
  tempo-locked effects: **Wobble** (a resonant filter swept in time: the
  dubstep "wub") and **Gate** (the volume chopped in time: the trance stutter).
  Sung clips start exactly on the beat.
- **Batch:** one line per clip, `filename | verse text`. One tap renders them
  all with the current settings and downloads a ZIP.
- **Presets:** 18 built in. Speaking: Kraftwerk, Cold Cathedral, Crypt,
  Abbey Ruins, Satellite Psalm, 8-bit Monk, Dalek Lector, Whispered Vigil.
  Singing: Gregorian Machine, Night Office, Seraphim, Vocoder Hymn, Robot
  Arpeggio, Basilica Dub, Dubstep Doom, Warehouse Vespers, Electro Lector,
  Acid Compline. A preset keeps your current key and Speak/Sing choice
  unless it is a singing preset. *Save as…* stores your own in the browser
  (localStorage).

Preview plays the exact WAV file you would download (through an `<audio>`
element, which iPhone Safari handles more reliably than Web Audio playback).
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
| `melody.js` | Keys, scales, syllables, and the melody styles |
| `sing.js` | Fits words to notes, the synthesizer, and the vocoder |
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
