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

His GitHub token lives on his devices; the app may also keep it on the `pocket-sets` branch as
`keys/token.enc`, scrambled (AES-GCM) with his private-library passphrase, so a new device needs only the
passphrase. Never try to open it, copy it elsewhere, or ask for the passphrase or the token.

## Pocket Sampler: what Br. Augustine sends to the library

The app's ☁ Send to the library (Menu › Sounds › My Sounds) puts a pack file and his notes on it
(what it is, who made it, where from, its license) in `inbox/<item>/` on the `library-inbox`
branch; Menu › Sounds › ☁ Shared shows it on every device at once. When he says he sent something
(or at the start of Pocket Sampler work), file the inbox:
`git fetch origin library-inbox`, check it out in a worktree, run
`python3 -I pocket-sampler/tools/inbox.py <worktree> pocket-sampler/sounds pocket-sampler/SOUNDS.md`,
read the notes it filed (and tell him anything unclear, such as a license marked Check), commit the
new `sounds/shared` files and SOUNDS.md lines, deploy them with the rest, and remove the filed
folders from the inbox branch. His GitHub token lives only in his browser; never ask for it.

## Pocket Sampler: the private library (scrambled)

A send ticked 🔒 Private arrives as `inbox/<date>-private-<id>/` holding only `private.json` (its date)
and `notes.enc` / `pack.enc`, scrambled with AES-GCM under a key made from his passphrase on his own
devices. `tools/inbox.py` files them unread into `pocket-sampler/sounds/private/` (only ids and dates in
its index; nothing per item in SOUNDS.md), and they deploy like the rest. Never ask for the passphrase,
never try to open or guess it, and never put anything from the private library in the repo unscrambled
(or describe it in commits, the ledger or the README). It is for his own use only: what is in it may be
licensed for personal use or not licensed for sharing at all, so it must never be unscrambled anywhere
public. Sources found for it still go by the rule above: lawful ones only (personal-use licences such as
the BBC's RemArc are fine); never copies from places with no right to share them.
