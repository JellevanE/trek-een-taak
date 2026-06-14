#!/usr/bin/env python3
"""
Extract a compact, usable color palette from one or more images.

Clusters the colors (median cut) instead of dumping every unique RGB value,
and emits them in the palette-file format that pixelate.py consumes.

Usage:
  python3 extract_palette.py art1.png art2.png --colors 12
  python3 extract_palette.py *.png --colors 16 -o ../assets/palette.txt
"""

import argparse
import sys
from pathlib import Path

from PIL import Image


def extract(paths, n_colors):
    # Paste all images side by side on magenta so transparent areas don't
    # count, then let median-cut clustering find the dominant colors.
    images = [Image.open(p).convert("RGBA") for p in paths]
    total_w = sum(im.width for im in images)
    max_h = max(im.height for im in images)
    sheet = Image.new("RGB", (total_w, max_h), (255, 0, 255))
    x = 0
    for im in images:
        sheet.paste(im, (x, 0), im.getchannel("A"))
        x += im.width
    quantized = sheet.quantize(colors=n_colors + 1, method=Image.Quantize.MEDIANCUT)
    pal = quantized.getpalette()[: (n_colors + 1) * 3]
    colors = [tuple(pal[i:i + 3]) for i in range(0, len(pal), 3)]
    colors = [c for c in colors if c != (255, 0, 255)][:n_colors]
    # Sort dark to light so the palette file reads like a ramp.
    return sorted(colors, key=lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])


def main():
    p = argparse.ArgumentParser(description="Extract a palette from images.")
    p.add_argument("images", nargs="+", type=Path)
    p.add_argument("--colors", type=int, default=12,
                   help="number of palette colors to extract (default 12)")
    p.add_argument("-o", "--output", type=Path, default=None,
                   help="write palette file here (default: print to stdout)")
    args = p.parse_args()

    colors = extract(args.images, args.colors)
    lines = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]
    sources = ", ".join(p.name for p in args.images)
    text = f"# Extracted from: {sources}\n" + "\n".join(lines) + "\n"
    if args.output:
        args.output.write_text(text)
        print(f"wrote {len(colors)} colors to {args.output}")
    else:
        print(text, end="")


if __name__ == "__main__":
    sys.exit(main())
