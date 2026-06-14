#!/usr/bin/env python3
"""Skill quality checks: silhouette test + palette analysis."""
import sys
from PIL import Image

sys.path.insert(0, '/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/skill-snapshot/scripts')
from analyze_palette import analyze_sprites

BASE = '/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/iteration-1/candle-photo-to-sprite/old_skill'
sprite = f'{BASE}/outputs/candle_sprite.png'

# Silhouette test: opaque pixels -> black, upscaled for inspection
img = Image.open(sprite).convert('RGBA')
sil = Image.new('RGBA', img.size, (0, 0, 0, 0))
sp, ip = sil.load(), img.load()
for y in range(img.height):
    for x in range(img.width):
        if ip[x, y][3] > 100:
            sp[x, y] = (0, 0, 0, 255)
sil.resize((128, 128), Image.NEAREST).save(f'{BASE}/candle_silhouette_8x.png')
print('silhouette saved')

# Palette test
analyze_sprites([sprite])
