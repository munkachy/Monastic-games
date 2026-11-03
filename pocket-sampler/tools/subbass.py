# Usage: python3 -I subbass.py <sounds folder> <bank> [<bank> ...]
# Sub bass you can hear on a phone or iPad. Their speakers play almost nothing under about
# 150 Hz, and a sub loop is nearly all under 60 Hz, so on them it all but vanishes. Bass
# enhancers (MaxxBass, R-Bass, SRS TruBass) add the note's overtones, which those speakers
# do play, and the ear fills in the low note from them (the "missing fundamental"). This
# does that once, to the recordings, for each loop of the bank whose name begins "Sub":
#   - the part under 120 Hz (the sub itself) is taken out (a steep low pass, done in the
#     frequency domain, so a loop stays seamless);
#   - from it, its 2nd to 6th overtones are made exactly in step with it (its analytic
#     signal: the same envelope, at 2, 3, ... times the phase), each quieter than the last,
#     and added to the loop (the sine underneath stays, for big speakers);
#   - the loop is brought up so its peak sits at 0.9 (the sub loops were made quiet).
# A bank done is marked ("harm": true in banks.json) and never done twice.
import sys, json, wave
import numpy as np

HARM = [(2, 0.6), (3, 0.42), (4, 0.28), (5, 0.16), (6, 0.09)]      # as the Sub Bass synth's
CUT = 120.0


def read(path):
    w = wave.open(path)
    n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr


def write(path, x, sr):
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(x, -1, 1) * 32767).round().astype(np.int16).tobytes()); w.close()


def enhance(x, sr):
    n = len(x); X = np.fft.fft(x); f = np.abs(np.fft.fftfreq(n, 1 / sr))
    low = X * (1 / (1 + (f / CUT) ** 8))                   # 8th-order low pass, zero phase, round the loop
    a = low.copy(); a[f > 0] *= 2; a[np.fft.fftfreq(n) < 0] = 0          # the analytic signal of the sub
    z = np.fft.ifft(a); mag, ph = np.abs(z), np.angle(z)
    over = sum(g * mag * np.cos(k * ph) for k, g in HARM)
    O = np.fft.fft(over); O *= 1 / (1 + (f / 2500) ** 4)  # smooth off the very top
    return x + np.real(np.fft.ifft(O))


def main():
    folder, banks = sys.argv[1], sys.argv[2:]
    meta = json.load(open(f'{folder}/banks.json'))
    for b in banks:
        e = meta[b]
        if e.get('harm'): print(b, 'already done'); continue
        x, sr = read(f'{folder}/{b}.wav'); y = x.copy()
        for (s, t), name in zip(e['slices'], e.get('from', [])):
            if not name.lower().startswith('sub'): continue
            seg = enhance(x[s:t], sr)
            y[s:t] = seg * (0.9 / max(1e-9, np.abs(seg).max()))
            print(b, name, f'peak {np.abs(x[s:t]).max():.2f} -> 0.90')
        write(f'{folder}/{b}.wav', y, sr); e['harm'] = True
    json.dump(meta, open(f'{folder}/banks.json', 'w'), separators=(',', ':'), ensure_ascii=False)


main()
