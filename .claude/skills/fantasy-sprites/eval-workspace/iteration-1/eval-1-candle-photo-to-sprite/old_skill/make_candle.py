#!/usr/bin/env python3
"""Generate a 16x16 tavern table candle prop sprite.

Based on the user's photo: a squat, wide candle with a melted wax pool
and a single flame. Styled to the fantasy-sprites skill:
- cream/off-white wax (#e2e0b8 highlight family)
- purple-blue metal holder dish
- warm gold/orange flame as a sparing bright accent
- transparent background, 1x scale PNG
"""
from PIL import Image
import math

W, H = 16, 16

# Palette (skill colors + warm flame accent)
COLORS = {
    'O': (224, 117, 42, 255),   # flame outer orange
    'Y': (242, 177, 61, 255),   # flame gold
    'F': (253, 240, 192, 255),  # flame core (pale warm white)
    'K': (23, 10, 71, 255),     # wick (#170a47 deep dark)
    'C': (226, 224, 184, 255),  # wax highlight (#e2e0b8 cream)
    'P': (240, 238, 205, 255),  # wax pool top, lit by flame
    'M': (199, 193, 158, 255),  # wax mid tone
    'S': (157, 148, 168, 255),  # wax shadow (purple-grey)
    'D': (40, 28, 89, 255),     # holder dark (#281c59)
    'H2': (83, 74, 129, 255),   # holder mid (#534a81)
    'L': (128, 126, 179, 255),  # holder light (#807eb3)
    'U': (11, 3, 40, 110),      # ground shadow (semi-transparent #0b0328)
    '.': (0, 0, 0, 0),          # transparent
}

# 16x16 pixel grid (tokens separated by spaces)
GRID = """
.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  O  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  Y  .  .  .  .  .  .  .  .
.  .  .  .  .  .  O  Y  O  .  .  .  .  .  .  .
.  .  .  .  .  .  Y  F  Y  .  .  .  .  .  .  .
.  .  .  .  .  .  Y  F  Y  .  .  .  .  .  .  .
.  .  .  .  .  .  .  Y  .  .  .  .  .  .  .  .
.  .  .  .  C  P  P  K  P  P  C  .  .  .  .  .
.  .  .  M  C  P  P  P  P  P  C  M  .  .  .  .
.  .  .  M  C  C  C  C  C  M  C  S  .  .  .  .
.  .  .  M  C  C  C  C  C  M  C  S  .  .  .  .
.  .  .  S  M  M  M  M  M  M  C  S  .  .  .  .
.  .  H2 L  L  L  L  L  L  L  L  L  L  H2 .  .
.  .  .  D  H2 H2 L  L  H2 H2 H2 H2 D  .  .  .
.  .  U  U  D  D  D  D  D  D  D  D  U  U  .  .
"""

img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
px = img.load()

rows = [r for r in GRID.strip('\n').split('\n')]
assert len(rows) == H, f"expected {H} rows, got {len(rows)}"
for y, row in enumerate(rows):
    tokens = row.split()
    assert len(tokens) == W, f"row {y}: expected {W} tokens, got {len(tokens)}"
    for x, t in enumerate(tokens):
        px[x, y] = COLORS[t]

# Soft warm glow halo around the flame (world-sprite glow effect).
# Only painted on transparent pixels so the sprite stays crisp.
gx, gy, radius = 7.0, 4.5, 4.6
glow_color = (242, 177, 61)
for y in range(H):
    for x in range(W):
        if px[x, y][3] != 0:
            continue
        d = math.hypot(x - gx, y - gy)
        if d < radius:
            a = int(46 * (1.0 - d / radius))
            if a > 4:
                px[x, y] = (*glow_color, a)

out = '/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/iteration-1/candle-photo-to-sprite/old_skill/outputs/candle_sprite.png'
img.save(out)
print(f"saved {out} ({img.size[0]}x{img.size[1]})")

# 8x nearest-neighbor preview (convenience only; the 16x16 is the asset)
preview = img.resize((W * 8, H * 8), Image.NEAREST)
pv = out.replace('candle_sprite.png', 'candle_sprite_preview_8x.png')
preview.save(pv)
print(f"saved {pv}")
