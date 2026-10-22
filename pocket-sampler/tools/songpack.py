# Usage: python3 songpack.py <work folder> <sounds folder> [song id]
# Builds a song pack from a song's stems on ccMixter (sounds/songs/<id>/*.wav
# and sounds/songs/<id>.json): each stem cut into loops on the bar lines, the
# stems' balance kept (one gain for them all), and the patterns and chain
# that play the song. Needs ffmpeg and numpy.
#
# A pack's JSON: { id, name, by, credit, license, page, bpm, root, scale,
#   sounds: [{ slot, name, file, rate, keyOf, loops: [{ name, s, e, bars }] }],
#   patterns: [[[sound, loop, bar], ...] x 16]  (one bar each: which bar of which loop),
#   chain: [pattern, ...] }
import json, os, subprocess, sys, urllib.request
import numpy as np

WORK, OUT = sys.argv[1], sys.argv[2]
RATE = 24000

SONGS = {
  'goodday': {
    'name': 'Good Day', 'by': 'AlexBeroza', 'license': 'CC BY 3.0',
    'credit': '"Good Day" by AlexBeroza (with a vocal by DonnieOzone), ccMixter, CC BY 3.0',
    'page': 'https://ccmixter.org/files/AlexBeroza/36122',
    'base': 'https://ccmixter.org/content/AlexBeroza/AlexBeroza_-_Good_Day',
    # measured from the stems: 73 BPM (the parts change every 4 and 8 bars at exactly this
    # tempo), bar 1 starting 0.060 s in (the drums' strongest point in the bar), D-flat major
    'bpm': 73.0, 't0': 0.060, 'root': 1, 'scale': 'major',
    # stem: (file suffix, follows the key?, loops as (name, first bar))
    'stems': [
      ('Drums', '_3', False, [('Intro', 1), ('Verse', 5), ('Hook', 13), ('Turn', 33)]),
      ('Bass', '_1', True, [('Intro', 1), ('Verse', 5), ('Hook', 13)]),
      ('Piano', '_5', True, [('Verse', 5), ('Hook', 13)]),
      ('Piano 2', '_6', True, [('Intro', 1), ('Hook', 13)]),
      ('Pad', '_4', True, [('Hook', 13)]),
      ('Strings', '_7', True, [('Verse', 5), ('Hook', 13)]),
      ('Synth', '_8', True, [('Lead 1', 5), ('Lead 2', 9)]),
      ('Vocal', 'vocal', True, [('Line 1', 5), ('Line 2', 9), ('Line 3', 13), ('Line 4', 17)]),
    ],
    # one-bar patterns: for each bar of the section, the loops playing (stem, loop name)
    'sections': [
      ('Intro', [('Drums', 'Intro'), ('Bass', 'Intro'), ('Piano 2', 'Intro'), ('Strings', 'Verse')]),
      ('Verse 1', [('Drums', 'Verse'), ('Bass', 'Verse'), ('Piano', 'Verse'), ('Strings', 'Verse'), ('Synth', 'Lead 1'), ('Vocal', 'Line 1')]),
      ('Verse 2', [('Drums', 'Verse'), ('Bass', 'Verse'), ('Piano', 'Verse'), ('Strings', 'Verse'), ('Synth', 'Lead 2'), ('Vocal', 'Line 2')]),
      ('Hook', [('Drums', 'Hook'), ('Bass', 'Hook'), ('Piano', 'Hook'), ('Piano 2', 'Hook'), ('Pad', 'Hook'), ('Strings', 'Hook')]),
    ],
    # sections in order (each 4 bars): the song's own shape, 60 bars
    'song': ['Intro', 'Verse 1', 'Verse 2', 'Hook', 'Hook', 'Verse 1', 'Verse 2', 'Hook', 'Hook',
             'Verse 1', 'Verse 2', 'Hook', 'Hook', 'Verse 1', 'Intro'],
  },
}

def fetch(song, suffix):
    path = f'{WORK}/{song["base"].rsplit("/", 1)[1]}{suffix}.mp3'
    if not os.path.exists(path):
        req = urllib.request.Request(song['base'] + suffix + '.mp3', headers={'Referer': song['page'], 'User-Agent': 'Mozilla/5.0'})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=300).read())
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def build(sid):
    song = SONGS[sid]; os.makedirs(f'{OUT}/songs/{sid}', exist_ok=True); os.makedirs(WORK, exist_ok=True)
    bar = 240 / song['bpm']
    audio = {}
    for name, suffix, _, _ in song['stems']:
        if suffix == 'vocal': audio[name] = fetch(song, '') - fetch(song, '_2')   # the full mix less the instrumental
        else: audio[name] = fetch(song, suffix)
    gain = 0.9 / float(np.max(np.abs(fetch(song, '_2'))))   # one gain for all: the stems keep their balance
    fade = np.sin(np.linspace(0, np.pi / 2, 48)) ** 2
    sounds = []
    for slot, (name, suffix, follows, loops) in enumerate(song['stems']):
        x, data, out = audio[name] * gain, [], []
        for lname, first in loops:
            a = int(round((song['t0'] + (first - 1) * bar) * RATE)); b = int(round((song['t0'] + (first + 3) * bar) * RATE))
            y = x[a:b].copy(); y[:48] *= fade; y[-48:] *= fade[::-1]
            s = len(data); data.extend(y.tolist())
            out.append({'name': lname, 's': round(s / RATE, 6), 'e': round(len(data) / RATE, 6), 'bars': 4})
        fname = name.lower().replace(' ', '') + '.wav'
        pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
        import wave
        w = wave.open(f'{OUT}/songs/{sid}/{fname}', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
        sounds.append({'slot': slot, 'name': name, 'file': f'songs/{sid}/{fname}', 'rate': RATE, 'keyOf': song['root'] if follows else None, 'loops': out})
        print(f'{name:8} {len(out)} loops, {len(data) / RATE:5.1f} s, {os.path.getsize(f"{OUT}/songs/{sid}/{fname}") / 1e6:.2f} MB')
    idx = {(s['name'], l['name']): (s['slot'], k) for s in sounds for k, l in enumerate(s['loops'])}
    patterns, first_pat = [], {}
    for sname, parts in song['sections']:
        first_pat[sname] = len(patterns)
        for b in range(4): patterns.append([[*idx[p], b] for p in parts])
    chain = [first_pat[s] + b for s in song['song'] for b in range(4)]
    pack = {k: song[k] for k in ('name', 'by', 'credit', 'license', 'page', 'bpm', 'root', 'scale')}
    pack.update(id=sid, sounds=sounds, patterns=patterns, chain=chain,
                sections=[[s, first_pat[s]] for s, _ in song['sections']])
    json.dump(pack, open(f'{OUT}/songs/{sid}.json', 'w'), separators=(',', ':'))
    print(f'{len(patterns)} patterns, chain of {len(chain)} bars ({len(chain) * bar / 60:.1f} min)')

for sid in (sys.argv[3:] or SONGS): build(sid)
