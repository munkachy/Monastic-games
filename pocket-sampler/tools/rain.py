# Usage: python3 -I rain.py <recording.wav> <start s> <seconds> <sounds folder> <bank> <sound name>
# Puts a real recording (rain, wind...) in place of one sound of a bank, as a seamless loop: the
# stretch from <start> on, <seconds> long, its last two seconds faded into its first (equal power),
# made mono at the bank's rate and brought to the loudness of the sound it replaces. The bank's
# other sounds stay as they were; the slices after it move. Used for the Rain of Records & Ambience
# (it was made in code): Benjamin Trimoreau's summer rain, Taastrup, 2017 (radio aporee, Public
# Domain Mark; see SOUNDS.md).
import sys, json, wave, subprocess
import numpy as np

FADE = 2.0


def read(path):
    w = wave.open(path); n, ch, sr, sw = w.getnframes(), w.getnchannels(), w.getframerate(), w.getsampwidth()
    assert sw == 2, 'a 16-bit WAV'
    x = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr


def main():
    src, start, secs, folder, bank, name = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), *sys.argv[4:7]
    meta = json.load(open(f'{folder}/banks.json')); e = meta[bank]
    k = e['from'].index(name); rate = e['rate']
    x, sr = read(src)
    seg = x[int(start * sr):int((start + secs) * sr)]
    seg = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f64le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', str(rate), '-f', 'f64le', '-'],
                                       input=seg.tobytes(), capture_output=True, check=True).stdout, np.float64)
    f = int(FADE * rate); n = len(seg) - f
    t = np.linspace(0, np.pi / 2, f)
    loop = seg[:n].copy(); loop[:f] = seg[:f] * np.sin(t) + seg[n:n + f] * np.cos(t)     # the end runs on into the start
    loop -= loop.mean()
    data, _ = read(f'{folder}/{bank}.wav')
    s, t2 = e['slices'][k]; old = data[s:t2]
    loop *= min(np.sqrt(np.mean(old ** 2)) / np.sqrt(np.mean(loop ** 2)), 0.95 / np.abs(loop).max())
    out = np.concatenate([data[:s], loop, data[t2:]]); shift = len(loop) - (t2 - s)
    e['slices'] = [sl if i < k else [s, s + len(loop)] if i == k else [sl[0] + shift, sl[1] + shift] for i, sl in enumerate(e['slices'])]
    w = wave.open(f'{folder}/{bank}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
    w.writeframes(np.clip((out * 32768).round(), -32768, 32767).astype('<i2').tobytes()); w.close()     # the other sounds exactly as they were
    json.dump(meta, open(f'{folder}/banks.json', 'w'), separators=(',', ':'))
    print(f'{bank} {name}: {len(loop) / rate:.1f} s loop at {rate} Hz (was {(t2 - s) / rate:.1f} s)')


main()
