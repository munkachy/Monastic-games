# Usage: python3 gmsound.py <sounds folder> [ids]
# More instruments for the pads, from the Musyng Kite General MIDI soundfont as rendered note by note
# for MIDI.js (https://github.com/gleitz/midi-js-soundfonts, MusyngKite; the soundfont is released under
# Creative Commons Attribution Share-Alike 3.0). One recording every 4 semitones, cut to a few seconds
# (held sounds get a seamless loop, as in instruments.py), packed into one MP3 per instrument
# (sounds/<id>.mp3: a tenth of a WAV's size) with each zone's note and start/end in banks.json. The
# notes are named by MIDI.js (C4 = 60). An MP3 may start a little late on some browsers, so each bank
# keeps `lead`, the sample where its first note starts; the app measures where it lands once decoded and
# shifts the zones to match. Writes GM (the list for app.js) to stdout at the end. Needs ffmpeg, numpy.
import sys, os, json, subprocess, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np

OUT = sys.argv[1]
RATE, STEP, GAP = 32000, 4, 0.1
URL = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/{}-mp3/{}.mp3'
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

# id: (General MIDI name, name, folder, lowest, highest, seconds, held loop, the pads' lowest note)
K, G, B, S, W, Y, R = 'Keys and organs', 'Guitars', 'Bass', 'Strings and choirs', 'Brass and winds', 'Synths', 'World'
GM = {
  'gmbright': ('bright_acoustic_piano', 'Bright Piano', K, 36, 96, 2.4, False, 48),
  'gmegrand': ('electric_grand_piano', 'Electric Grand', K, 36, 96, 2.4, False, 48),
  'gmhonky': ('honkytonk_piano', 'Honky-tonk Piano', K, 36, 96, 2.2, False, 48),
  'gmep2': ('electric_piano_2', 'DX E-Piano', K, 36, 96, 2.2, False, 48),
  'gmclav': ('clavinet', 'Clavinet', K, 36, 88, 1.6, False, 48),
  'gmmusicbox': ('music_box', 'Music Box', K, 60, 96, 2.0, False, 72),
  'gmdulcimer': ('dulcimer', 'Dulcimer', K, 48, 88, 2.0, False, 60),
  'gmdrawbar': ('drawbar_organ', 'Drawbar Organ', K, 36, 88, 2.0, True, 48),
  'gmpercorgan': ('percussive_organ', 'Percussive Organ', K, 36, 88, 2.0, True, 48),
  'gmrockorgan': ('rock_organ', 'Rock Organ', K, 36, 88, 2.0, True, 48),
  'gmreedorgan': ('reed_organ', 'Reed Organ', K, 36, 88, 2.0, True, 48),
  'gmaccordion': ('accordion', 'Accordion', K, 48, 88, 2.0, True, 48),
  'gmtango': ('tango_accordion', 'Bandoneon', K, 48, 88, 2.0, True, 48),
  'gmharmonica': ('harmonica', 'Harmonica', K, 56, 88, 2.0, True, 60),
  'gmjazzgtr': ('electric_guitar_jazz', 'Jazz Guitar', G, 40, 84, 2.4, False, 48),
  'gmcleangtr': ('electric_guitar_clean', 'Clean Guitar', G, 40, 84, 2.4, False, 48),
  'gmmutedgtr': ('electric_guitar_muted', 'Muted Guitar', G, 40, 84, 1.0, False, 48),
  'gmodgtr': ('overdriven_guitar', 'Overdriven Guitar', G, 40, 84, 2.2, True, 48),
  'gmdistgtr': ('distortion_guitar', 'Distortion Guitar', G, 40, 84, 2.2, True, 48),
  'gmharmonics': ('guitar_harmonics', 'Guitar Harmonics', G, 52, 88, 2.0, False, 60),
  'gmbanjo': ('banjo', 'Banjo', G, 48, 84, 1.8, False, 48),
  'gmfretless': ('fretless_bass', 'Fretless Bass', B, 28, 64, 2.0, False, 36),
  'gmslap': ('slap_bass_1', 'Slap Bass', B, 28, 64, 1.6, False, 36),
  'gmpickbass': ('electric_bass_pick', 'Picked Bass', B, 28, 64, 1.8, False, 36),
  'gmsynbass1': ('synth_bass_1', 'Synth Bass 1', B, 28, 64, 1.6, False, 36),
  'gmsynbass2': ('synth_bass_2', 'Synth Bass 2', B, 28, 64, 1.6, False, 36),
  'gmstrings': ('string_ensemble_1', 'String Ensemble', S, 36, 88, 2.2, True, 48),
  'gmslowstr': ('string_ensemble_2', 'Slow Strings', S, 36, 88, 2.4, True, 48),
  'gmtremolo': ('tremolo_strings', 'Tremolo Strings', S, 36, 88, 2.0, True, 48),
  'gmpizzstr': ('pizzicato_strings', 'Pizzicato Strings', S, 36, 88, 1.2, False, 48),
  'gmsynstr': ('synth_strings_1', 'Synth Strings', S, 36, 88, 2.2, True, 48),
  'gmaahs': ('choir_aahs', 'Choir Aahs', S, 48, 80, 2.2, True, 48),
  'gmoohs': ('voice_oohs', 'Voice Oohs', S, 48, 80, 2.2, True, 48),
  'gmsynchoir': ('synth_choir', 'Synth Choir', S, 48, 84, 2.2, True, 48),
  'gmtimpani': ('timpani', 'Timpani', S, 36, 60, 2.4, False, 36),
  'gmorchhit': ('orchestra_hit', 'Orchestra Hit', S, 36, 84, 1.2, False, 48),
  'gmtrumpet': ('trumpet', 'Trumpet', W, 52, 84, 2.0, True, 60),
  'gmmuted': ('muted_trumpet', 'Muted Trumpet', W, 52, 84, 2.0, True, 60),
  'gmhorn': ('french_horn', 'French Horn', W, 40, 76, 2.2, True, 48),
  'gmbrass': ('brass_section', 'Brass Section', W, 40, 80, 2.0, True, 48),
  'gmtuba': ('tuba', 'Tuba', W, 28, 60, 2.0, True, 36),
  'gmsoprano': ('soprano_sax', 'Soprano Sax', W, 56, 88, 2.0, True, 60),
  'gmalto': ('alto_sax', 'Alto Sax', W, 48, 80, 2.0, True, 60),
  'gmbari': ('baritone_sax', 'Baritone Sax', W, 36, 68, 2.0, True, 48),
  'gmoboe': ('oboe', 'Oboe', W, 58, 90, 2.0, True, 60),
  'gmclarinet': ('clarinet', 'Clarinet', W, 50, 90, 2.0, True, 60),
  'gmbassoon': ('bassoon', 'Bassoon', W, 34, 72, 2.0, True, 48),
  'gmflute': ('flute', 'Flute', W, 60, 96, 2.0, True, 72),
  'gmpiccolo': ('piccolo', 'Piccolo', W, 72, 100, 1.8, True, 72),
  'gmrecorder': ('recorder', 'Recorder', W, 60, 96, 1.8, True, 72),
  'gmpanflute': ('pan_flute', 'Pan Flute', W, 60, 96, 2.0, True, 72),
  'gmshaku': ('shakuhachi', 'Shakuhachi', W, 56, 88, 2.0, True, 60),
  'gmocarina': ('ocarina', 'Ocarina', W, 60, 96, 1.8, True, 72),
  'gmwhistle': ('whistle', 'Whistle', W, 72, 100, 1.8, True, 72),
  'gmsquare': ('lead_1_square', 'Square Lead', Y, 48, 88, 2.0, True, 60),
  'gmsaw': ('lead_2_sawtooth', 'Saw Lead', Y, 48, 88, 2.0, True, 60),
  'gmcalliope': ('lead_3_calliope', 'Calliope Lead', Y, 48, 88, 2.0, True, 60),
  'gmchiff': ('lead_4_chiff', 'Chiff Lead', Y, 48, 88, 2.0, True, 60),
  'gmcharang': ('lead_5_charang', 'Charang', Y, 48, 88, 2.0, True, 60),
  'gmfifths': ('lead_7_fifths', 'Fifths Lead', Y, 48, 88, 2.0, True, 60),
  'gmbasslead': ('lead_8_bass__lead', 'Bass + Lead', Y, 36, 84, 2.0, True, 48),
  'gmsynbrass': ('synth_brass_1', 'Synth Brass', Y, 40, 80, 2.0, True, 48),
  'gmnewage': ('pad_1_new_age', 'New Age Pad', Y, 48, 84, 2.4, True, 48),
  'gmwarm': ('pad_2_warm', 'Warm Pad', Y, 48, 84, 2.4, True, 48),
  'gmpoly': ('pad_3_polysynth', 'Polysynth', Y, 48, 84, 2.0, True, 48),
  'gmbowed': ('pad_5_bowed', 'Bowed Pad', Y, 48, 84, 2.4, True, 48),
  'gmhalo': ('pad_7_halo', 'Halo Pad', Y, 48, 84, 2.4, True, 48),
  'gmsweep': ('pad_8_sweep', 'Sweep Pad', Y, 48, 84, 2.4, True, 48),
  'gmcrystal': ('fx_3_crystal', 'Crystal', Y, 60, 96, 2.4, False, 60),
  'gmatmos': ('fx_4_atmosphere', 'Atmosphere', Y, 48, 84, 2.4, False, 48),
  'gmechoes': ('fx_7_echoes', 'Echoes', Y, 48, 84, 2.4, False, 48),
  'gmsitar': ('sitar', 'Sitar', R, 48, 84, 2.4, False, 48),
  'gmkoto': ('koto', 'Koto', R, 48, 84, 2.2, False, 48),
  'gmshamisen': ('shamisen', 'Shamisen', R, 48, 84, 1.8, False, 48),
  'gmfiddle': ('fiddle', 'Fiddle', R, 56, 88, 2.0, True, 60),
  'gmbagpipe': ('bagpipe', 'Bagpipe', R, 56, 84, 2.0, True, 60),
  'gmshanai': ('shanai', 'Shehnai', R, 60, 88, 2.0, True, 60),
  'gmtinkle': ('tinkle_bell', 'Tinkle Bell', R, 60, 96, 1.8, False, 72),
  'gmagogo': ('agogo', 'Agogo', R, 60, 84, 1.0, False, 60),
  'gmtaiko': ('taiko_drum', 'Taiko', R, 36, 60, 1.6, False, 36),
  'gmmelotom': ('melodic_tom', 'Melodic Tom', R, 40, 72, 1.2, False, 48),
}

def name_of(m): return f'{NAMES[m % 12]}{m // 12 - 1}'

def fetch(gm, m):
    try:
        with urllib.request.urlopen(URL.format(gm, name_of(m)), timeout=60) as r: data = r.read()
    except Exception: return None
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], input=data, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy() if raw else None

def seamless_loop(x):       # as instruments.py: from 40% in to the end, the end faded into what comes before the start
    a, b, X = int(len(x) * 0.4), len(x), int(0.15 * RATE)
    w = np.linspace(0, 1, X, dtype=np.float32)
    x[b - X:b] = x[b - X:b] * (1 - w) + x[a - X:a] * w
    return a, b

index = json.load(open(f'{OUT}/banks.json'))
want = sys.argv[2:] or list(GM)
for key in want:
    gm, name, folder, lo, hi, cap, loop, base = GM[key]
    notes = list(range(lo, hi + 1, STEP))
    with ThreadPoolExecutor(8) as ex: takes = list(ex.map(lambda m: (m, fetch(gm, m)), notes))
    data, zones, lead = [0.0] * int(GAP * RATE), [], None
    for m, x in takes:
        if x is None or len(x) < RATE * 0.1 or np.max(np.abs(x)) < 1e-3: continue
        pk = float(np.max(np.abs(x))); a = int(np.argmax(np.abs(x) > pk * 0.05))
        x = x[max(0, a - RATE // 1000):][:int(cap * RATE)]
        x = (x / (np.max(np.abs(x)) or 1) * 0.9).astype(np.float32)
        if loop: la, lb = seamless_loop(x)
        else: fade = min(len(x), int(0.05 * RATE)); x[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        start = len(data)
        if lead is None: lead = start + int(np.argmax(np.abs(x) > 0.05))      # where the first note is first heard
        data.extend(x.tolist()); data.extend([0.0] * int(GAP * RATE))
        zones.append([m, start, start + len(x)] + ([start + la, start + lb] if loop else []))
    if not zones: print(f'{key}: nothing came', file=sys.stderr); continue
    pcm = (np.clip(np.array(data, dtype=np.float32), -1, 1) * 32767).astype('<i2')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', f'{OUT}/{key}.mp3'],
                   input=pcm.tobytes(), check=True)
    index[key] = {'name': name, 'rate': RATE, 'zones': zones, 'ext': 'mp3', 'lead': lead, 'from': 'musyngkite'}
    print(f'{key}: {len(zones)} zones {zones[0][0]}–{zones[-1][0]}, {len(data) / RATE:.0f} s, {os.path.getsize(f"{OUT}/{key}.mp3") / 1e6:.2f} MB', file=sys.stderr)
    json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))      # (each kept as it is made)
print('const GM = [' + ', '.join(f"['{k}', '{v[1]}', {v[7]}, '{v[2]}']" for k, v in GM.items() if k in index) + '];')
