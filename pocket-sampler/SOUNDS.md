# Pocket Sampler: where every sound comes from

A ledger of every sound, recording and piece of musical data in the app, with its license,
the credit it asks for, and whether it could stay if the app were ever sold. Kept so that
question has an answer ready (Br. Augustine has no plans to sell it). Every new source is
added here when it comes in (see CLAUDE.md). The credits shown to users are in the app's
Help (Menu › Help, at the end).

Selling: **Yes** = the license allows commercial use (with the credit asked for).
**No** = it forbids commercial use, or gives no license at all. **Check** = not settled.

## Recorded instruments and kits

| What | Source | License | Credit | Selling |
|---|---|---|---|---|
| Pianos, organs, harpsichord, mallets, harp, bells, tenor sax, xylophone, tambourines, shakers, siren whistles, ocean drum | Versilian Community Sample Library (VCSL), github.com/sgossner/VCSL | CC0 | none needed (given anyway) | Yes |
| Upright and electric bass (Meatbass, Growlybass); Gogodze, Lo-fi, Big Rusty and Brush kits; Gretsch, Hofner and Epiphone guitars | Karoryfer Samples, github.com/sfzinstruments | CC0 | none needed | Yes |
| Acoustic Kit and Percussion | Karoryfer Samples' Virtuosity Drums, played by Austin McMahon | CC0 | none needed | Yes |
| Trumpet, trombone | VSCO 2 Community Edition, github.com/sgossner/VSCO-2-CE | CC0 | none needed | Yes |
| Violin, viola, cello, double bass, choirs | Sonatina Symphonic Orchestra, github.com/peastman/sso | CC Sampling Plus 1.0 | credit the source | **Check**: Sampling Plus allows commercial use of sounds sampled into new work, but not selling the samples themselves as they are; a sound library inside a sold app may count as the latter |
| Celeste | Sonatina Symphonic Orchestra | CC0 | none needed | Yes |
| Rhodes | jRhodes3d by Jeff Learman | CC BY-NC 4.0 | Jeff Learman | **No**: non-commercial only |
| TR-808 (sampled) | recorded from the machine by Michael Fischer; packaged as @fluid-music/tr-808 (npm) | the package says ISC; Michael Fischer's own terms not found | Michael Fischer | **Check** |
| Old records: Record hiss (1922), Record crackle (1914), Cylinder pops (1900), Record hiss 2 (1925), Cylinder crackle (1914), Wax cylinder, 1888 (Gladstone's greeting to Edison), Run-out groove (1919) | the quiet grooves before and after the music on Thomas Edison's own discs and cylinders (Thomas Edison National Historical Park, at the Internet Archive: EDIS-SRP-0165-12, 0191-06, 0204-17, 0198-06, 0191-08, 0190-12, 0192-13), cut and looped by tools/records.py | public domain (published before 1926; marked public domain) | Thomas Edison National Historical Park (given, not required) | Yes |
| Video-game sounds (8-bit Hits, Blips, Lasers, Glitch, Coins, Robots) | Juhani Junkala, "Essential Retro Video Game Sound Effects Collection"; Deva, "8-bit Sound Effect Pack" (OpenGameArt) | CC0 | none needed | Yes |
| Breakbeats (the Amen and others), electro and Drumtraks hits, synth stabs, bass hits, pads, funk horns, robot voices, vocal chops, nature, arcade, machine sounds, noise and risers, sirens | TidalCycles' Dirt-Samples, github.com/tidalcycles/Dirt-Samples | **none given**; gathered from many people (freesound.org and others), licenses vary and are not recorded | TidalCycles | **No** as things stand: it would need each sound traced, or replaced. The Amen break is a 1969 commercial recording ("Amen, Brother", The Winstons), sampled everywhere but still under copyright |

## Musical data (performances, not sounds)

| What | Source | License | Credit | Selling |
|---|---|---|---|---|
| Human Grooves, Beats played by drummers | Groove MIDI Dataset (Gillick, Roberts, Engel, Eck, Bamman; Magenta 2019) | CC BY 4.0 | the authors | Yes |
| Basslines played by bassists | FiloBass (Xavier Riley and Simon Dixon, Queen Mary University of London, ISMIR 2023) | MIT | the authors, and the MIT notice | Yes |

## Reverbs (recordings of real spaces)

| What | Source | License | Credit | Selling |
|---|---|---|---|---|
| Lady Chapel, St Albans Cathedral | OpenAIR, University of York | CC BY 4.0 | OpenAIR, University of York | Yes |
| Lady Chapel, Ely Cathedral | L. Alvarez-Morales, M. Lopez, A. Alvarez-Corbacho, P. Bustamante; Zenodo 5150020 | CC BY 4.0 in its record, CC BY-NC-SA 4.0 in its description | the authors | **No** until settled: kept to the stricter, non-commercial |
| St. Nicholas Chapel, Aachen Cathedral | M. Zerwas and S. Kayku; Zenodo 22207913 | CC BY 4.0 (LICENSE.txt) | the authors | Yes |
| A church in Cremona (ChurchIR) | R. Giampiccolo, S. Parrinelli, F. Antonacci; Zenodo 14901751 | CC BY 4.0 | the authors | Yes |
| A stairwell, a meeting room | T. McKenzie, S. Schlecht, V. Pulkki, Aalto University; Zenodo 4506379 | CC BY 4.0 | the authors | Yes |

## Made for the app

| What | How | Selling |
|---|---|---|
| Vigils' instruments: Vigil Strings, Night Swarm, Chant, Cloister Bass, Howl, Lauds Pluck, Compline Bell, Night Glass | made with Mutable Instruments Plaits' engines (string machine, swarm, formant voice, analog VCF, phase distortion, string, modal, wave terrain; MIT) by tools/plaitsinst.py, kept as recordings | Yes (with Plaits' MIT notice) |
| The synths; the 808, 909, CR-78, 606 and Minimal kits; rolled sounds; nylon, acoustic and 12-string guitars, steel drum, rain, risers, sirens, respirator | made in code (audio.js, tools/synthinst.py, tools/bake_sounds.js) and kept as recordings | Yes (the app's own) |
| The Electro Boom Bap kit (16 hits) and its kick, snare and tops loops | made in Claude's drum lab (tools/drumlab.py) with Mutable Instruments Plaits' drum engines, by Emilie Gillet (github.com/pichenettes/eurorack, with stmlib; MIT License, so the notice is kept with the code that uses it: tools/plaits_hit.cc builds against a checkout, nothing of Plaits is in this repo), shaped in the lab; the shaker from Perry Cook's PhISEM model, written in the lab | Yes (the app's own; Plaits' MIT license allows commercial use, with its notice) |
| The Vigils kit (16 hits) and its kick, snare and tops loops | made in the drum lab with Plaits' drum engines, as the Electro Boom Bap kit | Yes (the app's own, with Plaits' MIT notice) |
| The Vigils loops (bass, chords, lead, sub) | written for the app (tools/vigils.py), played by the app on its own sounds (tools/render_loops.js): the synths (strings and pad among them), the pipe organ, glockenspiel and vibraphone (VCSL), the women's choir and violin (Sonatina), celeste (Sonatina, CC0), the glitch ticks (Juhani Junkala, CC0), the rain and risers (made in code) | as the sounds they are played on: all Yes but the women's choir and violin loops, which carry Sonatina's **Check** |
| The Vigils words | the Rule of St Benedict (6th century; public domain), in Claude's own English from the Latin, spoken by eSpeak NG | the words: Yes. The voice engine: as eSpeak NG (GPL-3), below |
| Drum loops; the Electro Boom Bap loops | written for the app, played by the app on the sounds above (tools/loopset.py, tools/render_loops.js; the sub loops of both sets given their overtones afterwards by tools/subbass.py, no outside material) | as the sounds they are played on: the parts on Dirt-Samples sounds, the Rhodes or Sonatina carry those sounds' limits |
| Hype words, the robot voice, Robot pads, raps | spoken by eSpeak NG through Vox Machina | the sounds: Yes. The engine: eSpeak NG is GPL-3, so a sold app that includes it must give its users the source code under the GPL, or use another voice |

## Made by Br. Augustine in the app

Sounds he designs (Menu › Design), records (● Rec, ⏺ Loop rec) or makes into loops are his own, kept
on his devices; what he sends to the library comes in with his notes (tools/inbox.py files it below).
A recording he makes of someone else's music or sounds carries that source's license, which he
gives when he sends it. A hit designed with Room on has the Aalto meeting room's recording (CC BY
4.0, above) baked into it: credit as that reverb.

## The private library (scrambled)

Things kept for Br. Augustine's own use only (sounds licensed for personal use, sounds from his own
films and shows) live in `sounds/private/`, scrambled with a key made from his passphrase, which is
never in the repository. Each item's notes, with its source and license, are inside it, scrambled;
the app shows them once the passphrase is in. None of it is part of the app's own sounds, and none of
it could stay if the app were ever sold.

## If it were ever sold

What would have to change: the Rhodes (non-commercial), the Ely reverb (until its license is settled), and the Dirt-Samples packs (no license; the Amen break is copyrighted) would come out or be replaced; the TR-808 and the Sonatina strings and choirs would need their terms confirmed; and the voice engine's GPL would have to be met. Everything else (most of the app) can stay with its credits.
