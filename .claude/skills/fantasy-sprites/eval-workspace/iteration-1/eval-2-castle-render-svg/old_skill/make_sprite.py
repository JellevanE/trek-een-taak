#!/usr/bin/env python3
"""Convert castle render into final building sprite PNG + scalable SVG."""
import os
from PIL import Image

BASE = '/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/'
OUT = BASE + 'iteration-1/castle-render-svg/old_skill/outputs/'

img = Image.open(BASE + 'test-inputs/castle_render.png').convert('RGBA')
w, h = img.size
px = img.load()

# 1) Final sprite PNG (transparent background, 1x scale, optimized)
img.save(OUT + 'castle_sprite.png', optimize=True)

# 2) SVG: merge horizontal runs of identical RGBA into rects; crispEdges keeps
#    pixel-art sharp when the engine scales the background asset.
rects = []
for y in range(h):
    x = 0
    while x < w:
        r, g, b, a = px[x, y]
        if a == 0:
            x += 1
            continue
        run = 1
        while x + run < w and px[x + run, y] == (r, g, b, a):
            run += 1
        fill = '#%02x%02x%02x' % (r, g, b)
        op = '' if a == 255 else ' fill-opacity="%.3f"' % (a / 255)
        rects.append('<rect x="%d" y="%d" width="%d" height="1" fill="%s"%s/>'
                     % (x, y, run, fill, op))
        x += run

svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
       'shape-rendering="crispEdges">' % (w, h)]
svg.extend(rects)
svg.append('</svg>')
with open(OUT + 'castle_sprite.svg', 'w') as f:
    f.write('\n'.join(svg))
print('svg rects:', len(rects))

# 3) Silhouette test (skill quality checklist)
sil = Image.new('RGBA', (w, h), (0, 0, 0, 0))
sp = sil.load()
for y in range(h):
    for x in range(w):
        if px[x, y][3] > 0:
            sp[x, y] = (0, 0, 0, 255)
sil.save(OUT + 'castle_silhouette_check.png')

# 4) 4x nearest-neighbor preview for inspection
img.resize((w * 4, h * 4), Image.NEAREST).save(OUT + 'castle_sprite_preview_4x.png')

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(OUT + f), 'bytes')
