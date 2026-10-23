# Notes for Claude

## Pocket Sampler: sounds made in code are always kept as recordings

Br. Augustine's standing rule: anything Claude makes for Pocket Sampler in code (a synth,
a drum kit, a modelled instrument, a loop, an effect sound) is rendered once to a WAV
file and played back from it, never built again as it plays. Recordings are far easier
on his iPad (6th generation, iOS 17.7) than live synthesis, which made it struggle.

- Synths and kits: add them to `LIBRARY` in `pocket-sampler/app.js` as before, then run
  `pocket-sampler/tools/bake_sounds.js` (it records them with the app's own engine into
  `pocket-sampler/sounds/<id>.wav` and `banks.json`); the app plays those recordings.
- Loops and songs: render them to WAV (as `tools/render_loops.js` does).
- Never add a sound that is synthesized note by note at play time.

## Pocket Sampler: every sound source goes in the ledger

`pocket-sampler/SOUNDS.md` lists every sound, recording and piece of musical data the app uses,
with its license, the credit it asks for, and whether it could stay if the app were ever sold.
Whenever a new source comes in, add it there (and its credit in the app's Help) in the same
change. Prefer sources that allow commercial use (CC0, CC BY, MIT); say so plainly when one doesn't.

## Never commit or publish API keys

A Freesound key was once pasted in a chat; it must never go in the repo.
