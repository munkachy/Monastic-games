# Cut a 4x3 AI sheet: per cell drop scraps touching the cell edge (bleed from neighbours),
# align every frame on the main body's bottom-center, pad frames apart, save one strip.
from PIL import Image
import numpy as np, sys
from collections import deque
src, out, F = sys.argv[1], sys.argv[2], float(sys.argv[3])
rows = [int(v) for v in sys.argv[4].split(',')]
im = np.array(Image.open(src).convert('RGB')).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
fg = ~((r > 150) & (b > 140) & (g < 120))
Wd = im.shape[1]; cw = Wd // 4; ch = 350
def comps(m):
    lab = np.zeros(m.shape, int); n = 0; out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                yy, xx = y+dy, x+dx
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
        out.append(np.array(pts))
    return out
cells = []
for i in range(12):
    cy = rows[i // 4]; x0 = (i % 4) * cw
    m = fg[cy-ch//2:cy+ch//2, x0:x0+cw].copy(); rgb = im[cy-ch//2:cy+ch//2, x0:x0+cw]
    cs = sorted(comps(m), key=len, reverse=True); keep = np.zeros_like(m)
    for k, c in enumerate(cs):
        edge = c[:,1].min() <= 2 or c[:,1].max() >= cw-3
        if len(c) > 30 and (k == 0 or not edge): keep[c[:,0], c[:,1]] = True
    main = cs[0]; ax = (main[:,1].min() + main[:,1].max()) / 2; ay = main[:,0].max()
    cells.append((rgb, keep, ax, ay))
up = max(ay for *_, ay in cells); left = max(ax for *_, ax, _ in cells)
right = max(cw - ax for *_, ax, _ in cells); 
CW, CH = int(left + right), int(up + 10)
fw, fh = round(CW / F), round(CH / F); pad = 2
strip = Image.new('RGBA', ((fw + pad) * 12, fh))
for i, (rgb, keep, ax, ay) in enumerate(cells):
    canvas = np.zeros((CH, CW, 4), np.uint8)
    ox, oy = int(left - ax), int(up - ay)
    h, w = keep.shape
    ys, xs = np.nonzero(keep)
    ty, tx = ys + oy, xs + ox; ok = (ty >= 0) & (ty < CH) & (tx >= 0) & (tx < CW)
    canvas[ty[ok], tx[ok], :3] = rgb[ys[ok], xs[ok]]; canvas[ty[ok], tx[ok], 3] = 255
    strip.paste(Image.fromarray(canvas, 'RGBA').resize((fw, fh), Image.LANCZOS), (i * (fw + pad), 0))
strip.save(out); print(fw, fh, 'feet at', round(up / F), 'pad', pad)
