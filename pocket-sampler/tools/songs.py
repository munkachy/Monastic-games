# Usage: python3 songs.py <sounds folder>
# Songs written for Pocket Sampler: which built-in sound goes on which key,
# and the notes, bar by bar, as one-bar patterns chained in order. Writes
# sounds/songs/<id>.json, which the app loads from Packs > Songs. No audio of
# its own: every sound is one the app already has.
#
# A song's JSON: { id, name, by, about, bpm, swing, root, scale,
#   sounds: [{ slot, factory, vol, trig }],
#   patterns: [[[step, slot, key, { d, oc, vol, pitch }], ...] per bar],
#   chain: [pattern, ...] }
#   d: how many steps a held (Gate/Loop) note lasts; oc: octave; vol, pitch: for that note only.
import json, sys

OUT = sys.argv[1]

def electroboombap():
    # Electro boom bap in F minor at 92, swung. Eight bars: A (1-4) is the boom bap -
    # dusty kit, 808 bass on the chord roots, Rhodes, vinyl, the robot hyping it;
    # B (5-8) brings in the electro: 808 clap and cowbell, Juno stabs, and the men's
    # choir holding the roots. Bar 8 fills with 808 toms, a zap, and "Selah".
    BASS, RHODES, STAB, CHOIR, KIT, TR, ELEC, HYPE, VINYL = 0, 1, 2, 6, 8, 9, 10, 11, 13
    sounds = [{'slot': BASS, 'factory': 'bass808', 'vol': 0.85}, {'slot': RHODES, 'factory': 'rhodes', 'vol': 0.7},
              {'slot': STAB, 'factory': 'stabs', 'vol': 0.45}, {'slot': CHOIR, 'factory': 'choirmen', 'vol': 0.4, 'trig': 'gate'},
              {'slot': KIT, 'factory': 'boombap', 'vol': 0.9}, {'slot': TR, 'factory': 'tr808', 'vol': 0.75},
              {'slot': ELEC, 'factory': 'electro', 'vol': 0.55}, {'slot': HYPE, 'factory': 'hype', 'vol': 0.8},
              {'slot': VINYL, 'factory': 'ambience', 'vol': 0.3, 'trig': 'loop'}]
    # keys are steps of F minor from F: 0 F, 1 G, 2 Ab, 3 Bb, 4 C, 5 Db, 6 Eb, 7 F, 8 G ...
    chords = {'Fm7': [0, 2, 4, 6], 'Dbmaj7/F': [0, 2, 4, 5], 'Bbm7/F': [0, 2, 3, 5], 'Cm7': [3, 4, 6, 8]}
    roots = {'Fm7': (0, 0), 'Dbmaj7/F': (5, -1), 'Bbm7/F': (3, 0), 'Cm7': (4, -1)}      # bass key, octave
    stab_pitch = {'Fm7': 5, 'Dbmaj7/F': 5, 'Bbm7/F': -2, 'Cm7': 0}                     # the Juno chord is C-G-Bb
    choir = {'Bbm7/F': [3, 7], 'Cm7': [4, 8]}
    progression = ['Fm7', 'Fm7', 'Dbmaj7/F', 'Dbmaj7/F', 'Bbm7/F', 'Bbm7/F', 'Cm7', 'Cm7']
    kicks = [[0, 7, 10], [0, 7, 10, 13], [0, 7, 10], [0, 3, 10], [0, 7, 10], [0, 7, 10, 13], [0, 7, 10], [0, 3, 10]]
    bars = []
    for b, ch in enumerate(progression):
        n, second, B = [], b % 2 == 1, b >= 4
        add = lambda step, slot, key, **x: n.append([step, slot, key, x] if x else [step, slot, key])
        # drums: boom bap kit
        for st in kicks[b]: add(st, KIT, 0)
        for st in (4, 12): add(st, KIT, 3)
        for st in ((7, 15) if second else (15,)): add(st, KIT, 6)                       # ghost snares
        for st in range(0, 16, 2):
            if b in (3, 7) and st == 14: add(st, KIT, 8)                             # open hat into the next bar
            elif not (b == 7 and st >= 12): add(st, KIT, 7, vol=0.8 if st % 4 else 1.0)
        if second: add(11, KIT, 9, vol=0.6)                                            # a 16th pickup
        if b == 0: add(0, KIT, 15, vol=0.7)                                            # crash in
        # 808: a boom under bar 1 and 5; in B, clap on the backbeat and the electro cowbell
        if b in (0, 4): add(0, TR, 1, vol=0.8)
        if B:
            add(12, TR, 5)
            for st in ((3, 6, 11, 14) if not second else (3, 6, 11)): add(st, TR, 10, vol=0.7)
        if b == 7:                                                                     # tom fill
            for st, k in ((12, 12), (13, 12), (14, 13), (15, 13)): add(st, TR, k)
        # bass: the chord's root, boom bap bounce
        rk, oc = roots[ch]
        for st in ((0, 7, 10) if not second else (0, 3, 10, 14)): add(st, BASS, rk, **({'oc': oc} if oc else {}))
        # Rhodes: the chord on the one, a softer hit on the and-of-three
        for st, v in (((0, 1.0), (10, 0.6)) if not second else ((2, 0.7), (10, 0.6))):
            for k in chords[ch]: add(st, RHODES, k, vol=v)
        # B: Juno stabs, tuned to the chord; the choir holds the roots
        if B:
            for st in ((6, 14) if not second else (3, 10)): add(st, STAB, 4, pitch=stab_pitch[ch])
            if not second:
                for k in choir[ch]: add(0, CHOIR, k, d=32)
        # vinyl under it all; the robot
        add(0, VINYL, 1, d=16)
        hype = {0: (0, 3), 1: (14, 0), 3: (12, 6), 5: (14, 1), 7: (8, 14)}
        if b in hype: add(hype[b][0], HYPE, hype[b][1])
        if b == 3: add(15, ELEC, 10)
        if b == 7: add(4, ELEC, 11, vol=0.7)
        bars.append(n)
    return {'id': 'electroboombap', 'name': 'Electro Boom Bap', 'by': 'Claude', 'about': '8 bars · 92 BPM · F minor',
            'bpm': 92, 'swing': 58, 'root': 5, 'scale': 'minor', 'sounds': sounds, 'patterns': bars, 'chain': list(range(8)),
            'sections': [['A', 0], ['B', 4]]}

for song in (electroboombap(),):
    json.dump(song, open(f'{OUT}/songs/{song["id"]}.json', 'w'), separators=(',', ':'))
    print(song['id'], len(song['patterns']), 'bars,', sum(len(p) for p in song['patterns']), 'notes')
