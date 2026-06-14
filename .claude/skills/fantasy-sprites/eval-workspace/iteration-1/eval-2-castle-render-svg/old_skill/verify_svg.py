#!/usr/bin/env python3
"""Verify SVG fidelity: reconstruct raster from rects, diff against source PNG."""
import re
from PIL import Image

BASE = '/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/'
OUT = BASE + 'iteration-1/castle-render-svg/old_skill/outputs/'

src = Image.open(BASE + 'test-inputs/castle_render.png').convert('RGBA')
w, h = src.size
recon = Image.new('RGBA', (w, h), (0, 0, 0, 0))
rp = recon.load()

pat = re.compile(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" '
                 r'fill="#([0-9a-f]{6})"(?: fill-opacity="([0-9.]+)")?/>')
n = 0
with open(OUT + 'castle_sprite.svg') as f:
    for line in f:
        m = pat.match(line.strip())
        if not m:
            continue
        n += 1
        x, y, wd = int(m.group(1)), int(m.group(2)), int(m.group(3))
        hexc = m.group(4)
        a = round(float(m.group(5)) * 255) if m.group(5) else 255
        col = (int(hexc[0:2], 16), int(hexc[2:4], 16), int(hexc[4:6], 16), a)
        for i in range(wd):
            rp[x + i, y] = col

sp = src.load()
maxdiff = 0
mismatch = 0
for y in range(h):
    for x in range(w):
        s, r = sp[x, y], rp[x, y]
        if s[3] == 0 and r[3] == 0:
            continue
        d = max(abs(a - b) for a, b in zip(s, r))
        maxdiff = max(maxdiff, d)
        if d > 1:
            mismatch += 1
print('rects parsed:', n)
print('max channel diff:', maxdiff, '(alpha quantization tolerance 1)')
print('pixels off by >1:', mismatch)
