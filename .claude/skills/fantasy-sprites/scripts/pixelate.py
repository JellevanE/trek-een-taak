#!/usr/bin/env python3
"""
Deterministic image -> pixel sprite converter. No AI models involved.

Pipeline:
  1. (optional) strip a flat background by flood-filling from the corners
  2. crop to content, downscale to the target sprite size (box filter)
  3. snap every pixel to a fixed palette (optionally with dithering)
  4. write a 1x PNG, an upscaled preview PNG, and optionally an SVG

Usage:
  python3 pixelate.py input.jpg --size 32
  python3 pixelate.py photo.png --size 48 --remove-bg --svg
  python3 pixelate.py art.png --size 64 --palette auto:12 --dither
  python3 pixelate.py art.png --palette colors.txt   # one hex per line
"""

import argparse
import sys
from pathlib import Path

from PIL import Image

# House palette (purple-blue spectrum + cream highlight). assets/palette.txt is
# the editable source of truth; this embedded copy is the fallback so the
# script also works standalone.
HOUSE_PALETTE_FILE = Path(__file__).resolve().parent.parent / "assets" / "palette.txt"
DEFAULT_PALETTE = [
    "#0b0328", "#170a47", "#0c0336",            # deep darks
    "#281c59", "#2f2264", "#3d3467",            # dark purples
    "#534a81", "#695791", "#675690",            # mid purples
    "#807eb3", "#85839f", "#7e779e",            # light purples
    "#aaa8c8", "#c8c6da",                       # near-highlights
    "#e2e0b8",                                  # cream highlight
]


def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_palette(spec, img):
    """Palette spec: None (house palette), 'auto:N', or a file of hex codes."""
    if spec is None:
        spec = str(HOUSE_PALETTE_FILE) if HOUSE_PALETTE_FILE.exists() else None
    if spec is None:
        return [hex_to_rgb(c) for c in DEFAULT_PALETTE]
    if spec.startswith("auto:"):
        n = int(spec.split(":")[1])
        # Quantize on opaque pixels only so transparency doesn't skew colors.
        rgb = img.convert("RGBA")
        opaque = Image.new("RGB", rgb.size, (255, 0, 255))
        opaque.paste(rgb, mask=rgb.getchannel("A"))
        quantized = opaque.quantize(colors=n + 1, method=Image.Quantize.MEDIANCUT)
        pal = quantized.getpalette()[: (n + 1) * 3]
        colors = [tuple(pal[i:i + 3]) for i in range(0, len(pal), 3)]
        return [c for c in colors if c != (255, 0, 255)][:n]
    import re
    lines = Path(spec).read_text().splitlines()
    colors = [m.group(0) for line in lines
              if (m := re.fullmatch(r"#?[0-9a-fA-F]{6}", line.strip()))]
    if not colors:
        sys.exit(f"no hex colors found in palette file: {spec}")
    return [hex_to_rgb(c) for c in colors]


def remove_background(img, tolerance):
    """Flood-fill from the four corners, treating the corner color as background."""
    from collections import deque

    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    visited = set()
    queue = deque()
    for s in seeds:
        bg = px[s][:3]
        queue.append((s, bg))
    while queue:
        (x, y), bg = queue.popleft()
        if (x, y) in visited or not (0 <= x < w and 0 <= y < h):
            continue
        visited.add((x, y))
        r, g, b, a = px[x, y]
        if a == 0 or sum(abs(c - t) for c, t in zip((r, g, b), bg)) > tolerance:
            continue
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            queue.append(((x + dx, y + dy), bg))
    return img


def crop_to_content(img, alpha_threshold):
    """Trim fully transparent borders so the subject fills the sprite."""
    alpha = img.getchannel("A").point(lambda a: 255 if a >= alpha_threshold else 0)
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def snap_to_palette(img, palette, dither, alpha_threshold):
    """Map every opaque pixel to its nearest palette color; binarize alpha."""
    pal_img = Image.new("P", (1, 1))
    flat = [c for rgb in palette for c in rgb]
    pal_img.putpalette(flat + flat[:3] * (256 - len(palette)))

    rgb = img.convert("RGB")
    dither_mode = Image.Dither.FLOYDSTEINBERG if dither else Image.Dither.NONE
    snapped = rgb.quantize(palette=pal_img, dither=dither_mode).convert("RGBA")

    # Hard alpha: pixel art wants fully opaque or fully transparent, never fringe.
    alpha = img.getchannel("A").point(lambda a: 255 if a >= alpha_threshold else 0)
    snapped.putalpha(alpha)
    return snapped


def to_svg(img):
    """Emit one <rect> per horizontal run of same-colored pixels."""
    w, h = img.size
    px = img.load()
    rects = []
    for y in range(h):
        x = 0
        while x < w:
            r, g, b, a = px[x, y]
            if a == 0:
                x += 1
                continue
            run = x
            while run < w and px[run, y] == (r, g, b, a):
                run += 1
            rects.append(
                f'<rect x="{x}" y="{y}" width="{run - x}" height="1" '
                f'fill="#{r:02x}{g:02x}{b:02x}"/>'
            )
            x = run
    body = "\n".join(rects)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" shape-rendering="crispEdges">\n{body}\n</svg>\n'
    )


def main():
    p = argparse.ArgumentParser(description="Convert an image to a pixel sprite.")
    p.add_argument("input", type=Path)
    p.add_argument("--size", type=int, default=32,
                   help="target size of the longest side in pixels (default 32)")
    p.add_argument("--palette", default=None,
                   help="palette file (hex per line), 'auto:N', or omit for house palette")
    p.add_argument("--dither", action="store_true",
                   help="Floyd-Steinberg dithering (texture at the cost of noise)")
    p.add_argument("--remove-bg", action="store_true",
                   help="flood-fill flat background from corners to transparency")
    p.add_argument("--bg-tolerance", type=int, default=60,
                   help="background color tolerance for --remove-bg (default 60)")
    p.add_argument("--alpha-threshold", type=int, default=128,
                   help="alpha cutoff for opaque vs transparent (default 128)")
    p.add_argument("--svg", action="store_true", help="also write an SVG version")
    p.add_argument("--preview-scale", type=int, default=8,
                   help="nearest-neighbor upscale factor for the preview PNG (default 8)")
    p.add_argument("--out-dir", type=Path, default=None,
                   help="output directory (default: alongside the input)")
    args = p.parse_args()

    img = Image.open(args.input).convert("RGBA")
    if args.remove_bg:
        img = remove_background(img, args.bg_tolerance)
    img = crop_to_content(img, args.alpha_threshold)

    img.thumbnail((args.size, args.size), Image.Resampling.BOX)
    palette = load_palette(args.palette, img)
    sprite = snap_to_palette(img, palette, args.dither, args.alpha_threshold)

    out_dir = args.out_dir or args.input.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.input.stem

    sprite_path = out_dir / f"{stem}_sprite.png"
    sprite.save(sprite_path)
    preview = sprite.resize(
        (sprite.width * args.preview_scale, sprite.height * args.preview_scale),
        Image.Resampling.NEAREST,
    )
    preview_path = out_dir / f"{stem}_preview.png"
    preview.save(preview_path)
    print(f"sprite : {sprite_path} ({sprite.width}x{sprite.height}, "
          f"{len(palette)} palette colors)")
    print(f"preview: {preview_path}")

    if args.svg:
        svg_path = out_dir / f"{stem}_sprite.svg"
        svg_path.write_text(to_svg(sprite))
        print(f"svg    : {svg_path}")


if __name__ == "__main__":
    sys.exit(main())
