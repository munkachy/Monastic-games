# Usage: python3 banks.py <folder with deva/ and sub/ unzipped> <output folder>
# deva/: https://opengameart.org/content/8-bit-sound-effect-pack-vol-001 (CC0, by Deva / @Shades)
# sub/:  https://opengameart.org/content/512-sound-effects-8-bit-style (CC0, by Juhani Junkala)
# Pack CC0 sound effects into banks of 16: one 22,050 Hz mono WAV per bank
# plus a JSON list of where each sound starts and ends.
import wave, glob, os, json, sys, struct, array
SFX, OUT = sys.argv[1], sys.argv[2]
SUB = glob.glob(SFX + '/sub/*')[0]
def files(rel, n, start=0):
    fs = sorted(glob.glob(glob.escape(f'{SUB}/{rel}') + '/*.wav'))
    return fs[start:start + n]
def deva(*names): return [f'{SFX}/deva/{n}.wav' for n in names]
BANKS = {
  'blips':  ('Blips',  files('General Sounds/Simple Bleeps', 11) + files('General Sounds/High Pitched Sounds', 5), 0.6),
  'lasers': ('Lasers', files('Weapons/Lasers', 13) + deva('Shoot 1', 'Shoot 2', 'Shoot 3'), 0.9),
  'glitch': ('Glitch', files('General Sounds/Weird Sounds', 16), 1.6),
  'coins':  ('Coins',  deva('Coin 1', 'Coin 2', 'Coin 3', 'Coin 4', 'Powerup 1', 'Powerup 2', 'Powerup 3', 'Jump 1')
                       + files('General Sounds/Coins', 4) + files('General Sounds/Positive Sounds', 4), 0.9),
  'robots': ('Robots', files('Death Screams/Android', 6) + files('Death Screams/Robot', 2) + deva('Talk 1', 'Talk 2', 'Talk 3', 'Talk 4')
                       + files('Explosions/Shortest', 4), 1.0),
  'hits':   ('8-bit Hits', files('General Sounds/Simple Damage Sounds', 8) + files('Weapons/Melee', 4) + files('General Sounds/Impacts', 4), 0.5),
}
RATE = 22050
index = {}
for key, (name, fs, cap) in BANKS.items():
    assert len(fs) == 16, (key, len(fs))
    out, slices = array.array('h'), []
    for f in fs:
        w = wave.open(f); assert w.getnchannels() == 1 and w.getsampwidth() == 2
        x = array.array('h', w.readframes(w.getnframes()))
        if w.getframerate() == 44100:                        # 44.1 kHz -> 22.05 kHz, averaging pairs
            x = array.array('h', [(x[i] + x[i + 1]) // 2 for i in range(0, len(x) - 1, 2)])
        x = x[:int(cap * RATE)]
        fade = min(len(x), int(0.01 * RATE))
        for i in range(fade): x[len(x) - 1 - i] = int(x[len(x) - 1 - i] * i / fade)
        slices.append([len(out), len(out) + len(x)])
        out.extend(x); out.extend([0] * int(0.02 * RATE))
    w = wave.open(f'{OUT}/{key}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(out.tobytes()); w.close()
    index[key] = {'name': name, 'slices': slices, 'from': [os.path.basename(f)[:-4] for f in fs]}
json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
