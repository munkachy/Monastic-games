# Usage: EURORACK=<eurorack checkout> python3 plaitsinst.py <sounds folder> [ids]
# Instruments made with Mutable Instruments Plaits' engines (Emilie Gillet, MIT license; see
# drumlab.py for the build), the new sounds of a pack, kept as recordings like every sound made in
# code: a note every 6 half steps, from an octave and a half below the root to two and a half above,
# packed as the recorded synths are (one WAV, zones in banks.json). A held instrument has two takes
# of each note: as tapped (One shot: the note, then its release), and held (Gate or Loop), which
# rings on a seamless loop once the note has settled. A struck one (bells, plucks) has one take, as
# it rings. Each is measured as it is made: the loudest pitch must be the note asked (or one
# of its harmonics), so a setting that plays a chord or drifts off the key is caught.
#
# Vigils' sounds (G minor, night electronica):
#   vigstrings  Vigil Strings: the string machine (the ensemble strings of the 70s), slow to swell
#   vigswarm    Night Swarm: a swarm of detuned saws, drifting
#   vigbass     -> see vigils.py; here vigcloister, Cloister Bass: the analog VCF, round and short
#   vighowl     Howl: phase distortion, gliding up into the note, with a slow vibrato
#   vigchant    Chant: the formant voice, an "ah" sung low, with a little vibrato
#   viglauds    Lauds Pluck: a plucked string, bright and short
#   vigbell     Compline Bell: the modal resonator, a struck bar that rings
#   vigglass    Night Glass: wave terrain, a glassy key that fades
import os, sys, json, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drumlab import plaits as raw, hp
# every take with its DC taken out (some engines sit off zero, which thumps when a note starts)
plaits = lambda *a: hp(raw(*a), 20, 2)

OUT = sys.argv[1]; ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
RATE = 32000
# id: (name, root, engine, harmonics, timbre, morph, out, kind, envelope (attack, release s), tapped length,
#      extras (vibrato semitones, vibrato Hz, timbre swing, glide semitones, glide s))
INSTRUMENTS = {
    'vigstrings': ('Vigil Strings', 48, 'stringmachine', 0.0, 0.5, 0.5, 'out', 'held', (0.45, 1.2), 0.9, (0.05, 5.0, 0.12, 0, 0.1)),
    'vigswarm': ('Night Swarm', 48, 'swarm', 0.22, 0.4, 0.6, 'out', 'held', (0.3, 1.0), 0.8, (0, 5.0, 0.15, 0, 0.1)),
    'vigcloister': ('Cloister Bass', 36, 'vcf', 0.35, 0.3, 0.8, 'out', 'held', (0.004, 0.15), 0.35, (0, 5.0, 0, 0, 0.1)),
    'vighowl': ('Howl', 60, 'phasedist', 0.3, 0.55, 0.4, 'out', 'held', (0.08, 0.6), 0.6, (0.25, 5.0, 0.1, -2.0, 0.12)),
    'vigchant': ('Chant', 48, 'speech', 0.0, 0.3, 0.4, 'out', 'held', (0.25, 0.8), 0.8, (0.12, 4.5, 0.05, 0, 0.1)),
    'viglauds': ('Lauds Pluck', 60, 'string', 0.1, 0.7, 0.6, 'out', 'struck', None, None, None),
    'vigbell': ('Compline Bell', 60, 'modal', 0.3, 0.55, 0.7, 'out', 'struck', None, None, None),
    'vigglass': ('Night Glass', 60, 'terrain', 0.5, 0.5, 0.5, 'out', 'keys', (0.004, 1.4), None, (0, 5.0, 0.05, 0, 0.1)),
    # Ephesians' sounds (A minor, industrial techno, ephesians.py):
    #   ephsignal  Emergency Signal: an additive tone swung up and down like a siren, a half step each way
    #   ephdrone   Strained Drone: phase distortion held, its timbre straining slowly back and forth
    #   ephvolt    Voltage Bass: the analog VCF, resonant and hard, short
    #   ephclang   Steel Clang: the modal resonator struck hard, inharmonic, like a steel beam
    #   ephstab    Voltage Stab: the waveshaper, a hard key that fades
    'ephsignal': ('Emergency Signal', 60, 'additive', 0.15, 0.3, 0.5, 'out', 'held', (0.02, 0.4), 0.6, (0.5, 2.2, 0.0, 0, 0.1)),
    'ephdrone': ('Strained Drone', 48, 'phasedist', 0.5, 0.45, 0.6, 'out', 'held', (0.6, 1.4), 0.9, (0.0, 0.35, 0.18, 0, 0.1)),
    'ephvolt': ('Voltage Bass', 36, 'vcf', 0.55, 0.62, 0.95, 'out', 'held', (0.003, 0.12), 0.3, (0, 5.0, 0, 0, 0.1)),
    'ephclang': ('Steel Clang', 60, 'modal', 0.45, 0.65, 0.45, 'out', 'struck', None, None, None),
    'ephstab': ('Voltage Stab', 48, 'waveshape', 0.6, 0.7, 0.6, 'out', 'keys', (0.002, 0.5), None, (0, 5.0, 0.0, 0, 0.1)),
}

def envelope(n, a, hold, rel):
    t = np.arange(n) / RATE; e = np.minimum(1, t / max(a, 1e-4)); e = np.sin(e * np.pi / 2) ** 2
    if hold is not None: e *= np.where(t < hold, 1, np.exp(-(t - hold) / (rel / 4)))
    return e

def crossfade(x, a, b):
    # the end fades into what comes just before a. The two are in step (the loop is a whole number of
    # the note's waves and of its vibrato), so a straight crossfade keeps the level even
    X = min(int(0.08 * RATE), (b - a) // 3, a)
    u = (np.arange(X) + 1) / (X + 1); x[b - X:b] = x[b - X:b] * (1 - u) + x[a - X:a] * u

def loop_points(n, m, vibhz, vib):
    # a loop ending 0.1 s before the take does, about 0.8 s long: a whole number of vibrato cycles
    # (if it has one), then a whole number of the note's periods
    period = RATE / (440 * 2 ** ((m - 69) / 12)); L = 0.8 * RATE
    if vib: L = round(0.8 * vibhz) / vibhz * RATE
    L = round(L / period) * period; b = n - int(0.1 * RATE)
    return int(round(b - L)), b

def near_zero(x, i): j = np.argmin(np.abs(x[i - 200:i + 200])); return i - 200 + int(j)

def check(x, m, name):
    # the loudest pitch, 40 Hz to 4 kHz, after the attack: the note or one of its harmonics (a whole
    # number of times it: a sung vowel lifts the harmonics near its formant), not a pitch between
    seg = x[int(0.15 * RATE):]; S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; f = np.fft.rfftfreq(len(seg), 1 / RATE)
    k = (f > 40) & (f < 4000); f0 = f[k][np.argmax(S[k])]; semis = 12 * np.log2(f0 / (440 * 2 ** ((m - 69) / 12)))
    ratio = 2 ** (semis / 12); ok = abs(ratio - round(ratio)) < 0.03 * ratio and round(ratio) >= 1 or abs(semis + 12) < 0.5
    if not ok: print(f'   !! {name} {m}: loudest at {f0:.0f} Hz, {semis:+.1f} half steps from the note')
    return ok

banks = json.load(open(f'{OUT}/banks.json'))
for id, (name, root, eng, h, t, mo, out, kind, env, tap, ex) in INSTRUMENTS.items():
    if ONLY and id not in ONLY: continue
    gap = int(0.02 * RATE); parts, zones, at, bad = [], [], 0, 0
    for m in range(root - 18, root + 31, 6):
        if kind == 'struck':
            x = plaits(eng, m, h, t, mo, 0.85, 3.0, out); x = x[: int(3.0 * RATE)]
            f = int(0.05 * RATE); x[-f:] *= np.linspace(1, 0, f)
            bad += not check(x, m, name); zones.append([m, at, at + len(x)]); parts.append(x); at += len(x) + gap
            continue
        a, rel = env
        if kind == 'keys':                 # a key that fades as it is held, like an electric piano
            x = plaits(eng, m, h, t, mo, 0.85, 2.6, out, *ex); x = x[: int(2.6 * RATE)] * envelope(int(2.6 * RATE), a, 0.0, rel * 4)
            f = int(0.05 * RATE); x[-f:] *= np.linspace(1, 0, f)
            bad += not check(x, m, name); zones.append([m, at, at + len(x)]); parts.append(x); at += len(x) + gap
            continue
        # held: as tapped (the note for its length, then the release), then held (a loop near its end)
        L = tap + rel * 1.5 + 0.05
        one = plaits(eng, m, h, t, mo, 0.85, L, out, *ex)[: int(L * RATE)] * envelope(int(L * RATE), a, tap, rel)
        held_s = max(1.8, a + 1.5)
        hx = plaits(eng, m, h, t, mo, 0.85, held_s, out, *ex)[: int(held_s * RATE)] * envelope(int(held_s * RATE), a, None, rel)
        la, lb = loop_points(len(hx), m, ex[1], ex[0] or ex[2]); crossfade(hx, la, lb)
        bad += not check(hx, m, name)
        z = [m, at, at + len(one)]; parts.append(one); at += len(one) + gap
        z += [at + la, at + lb, at, at + len(hx)]; parts.append(hx); at += len(hx) + gap
        zones.append(z)
    top = max(np.abs(p).max() for p in parts); level = top / 0.95
    data = np.zeros(at)
    o = 0
    for p in parts: data[o:o + len(p)] = p / level; o += len(p) + gap
    pcm = (np.clip(data, -1, 1) * 32767).round().astype('<i2')
    w = wave.open(f'{OUT}/{id}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
    banks[id] = {'name': name, 'rate': RATE, **({'synth': True} if kind == 'held' else {}), **({'level': round(level, 4)} if level > 1 else {}),
                 'zones': zones, 'made': 'Plaits'}
    print(f'{id:12} {name:15} {len(zones)} notes, {at / RATE:5.1f} s, {os.path.getsize(f"{OUT}/{id}.wav") / 1e6:.2f} MB{"" if not bad else f"  ({bad} notes off)"}')
json.dump(banks, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
