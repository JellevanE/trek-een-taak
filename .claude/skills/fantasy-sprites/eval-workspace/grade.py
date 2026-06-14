#!/usr/bin/env python3
"""Grade eval runs against the assertions in each eval_metadata.json.

Writes grading.json (fields: text/passed/evidence per expectation) into each
run directory (with_skill/, old_skill/). Pixel checks are done with PIL; the
SVG check parses the XML. Run from anywhere:

  python3 grade.py /path/to/iteration-1
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

PALETTE_FILE = Path(__file__).resolve().parent.parent / "assets" / "palette.txt"

SIZE_RANGES = {
    "treasure-chest-no-image": (8, 32),
    "candle-photo-to-sprite": (8, 32),
    "castle-render-svg": (48, 128),
}


def load_palette():
    colors = set()
    for line in PALETTE_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("# "):
            h = line.lstrip("#")
            if len(h) == 6:
                colors.add(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
    return colors


def find_sprite(outputs):
    """The deliverable sprite: a small PNG, preferring names containing 'sprite'."""
    pngs = [p for p in outputs.rglob("*.png") if "preview" not in p.name.lower()]
    if not pngs:
        return None
    named = [p for p in pngs if "sprite" in p.name.lower()]
    candidates = named or pngs
    # Smallest by pixel area = the 1x asset (vs upscaled or source copies).
    return min(candidates, key=lambda p: Image.open(p).size[0] * Image.open(p).size[1])


def grade_run(eval_name, assertions, outputs):
    palette = load_palette()
    results = []
    sprite_path = find_sprite(outputs) if outputs.exists() else None
    img = Image.open(sprite_path).convert("RGBA") if sprite_path else None
    if img:
        pixels = list(img.convert("RGBA").getdata())
        opaque = [p[:3] for p in pixels if p[3] == 255]
        unique_opaque = set(opaque)
        alphas = {p[3] for p in pixels}
        w, h = img.size
        corners = [img.getpixel((x, y))[3] for x, y in
                   [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]

    for text in assertions:
        passed, evidence = False, ""
        t = text.lower()
        if "png file is delivered" in t:
            passed = sprite_path is not None
            evidence = f"found {sprite_path.name}" if passed else "no sprite PNG in outputs"
        elif img is None:
            results.append({"text": text, "passed": False,
                            "evidence": "no sprite PNG to check"})
            continue
        elif "corner pixels are fully transparent" in t:
            passed = all(a == 0 for a in corners)
            evidence = f"corner alphas: {corners}"
        elif "longest side" in t:
            lo, hi = SIZE_RANGES[eval_name]
            longest = max(w, h)
            passed = lo <= longest <= hi
            evidence = f"sprite is {w}x{h}, longest side {longest}, expected {lo}-{hi}"
        elif "unique opaque colors" in t:
            passed = len(unique_opaque) <= 16
            evidence = f"{len(unique_opaque)} unique opaque colors"
        elif "exact color from the house palette" in t:
            off = unique_opaque - palette
            passed = not off
            evidence = ("all colors in palette" if passed else
                        f"{len(off)} off-palette colors, e.g. "
                        + ", ".join(f"#{r:02x}{g:02x}{b:02x}" for r, g, b in list(off)[:5]))
        elif "alpha is hard" in t:
            passed = alphas <= {0, 255}
            evidence = (f"alpha values: {{0, 255}}" if passed else
                        f"{len(alphas - {0, 255})} intermediate alpha values present")
        elif "svg file is delivered" in t:
            svgs = list(outputs.rglob("*.svg"))
            if svgs:
                try:
                    root = ET.parse(svgs[0]).getroot()
                    passed = root.tag.endswith("svg")
                    evidence = f"{svgs[0].name} parses, root <{root.tag.split('}')[-1]}>"
                except ET.ParseError as e:
                    evidence = f"{svgs[0].name} is not well-formed: {e}"
            else:
                evidence = "no SVG in outputs"
        elif "crisp pixel edges" in t:
            svgs = list(outputs.rglob("*.svg"))
            if svgs:
                content = svgs[0].read_text()
                passed = "crispedges" in content.lower() or "pixelated" in content.lower()
                evidence = ("shape-rendering crispEdges present" if passed
                            else "no crispEdges/pixelated rendering hint found")
            else:
                evidence = "no SVG in outputs"
        elif "attribution" in t:
            attrib = list(outputs.rglob("ATTRIBUTION*")) + list(outputs.rglob("*attribution*"))
            web_images = list(outputs.rglob("*.jpg"))
            if attrib:
                passed, evidence = True, f"found {attrib[0].name}"
            elif not web_images:
                # Can't prove web images were used from outputs alone; pass
                # vacuously but say so.
                passed, evidence = True, "no downloaded web images in outputs (vacuous)"
            else:
                evidence = "web images present but no attribution file"
        else:
            evidence = "no programmatic check matched this assertion"
        results.append({"text": text, "passed": passed, "evidence": evidence})
    return results


def main():
    iteration = Path(sys.argv[1]).resolve()
    for eval_dir in sorted(p for p in iteration.iterdir() if p.is_dir()):
        meta_file = eval_dir / "eval_metadata.json"
        if not meta_file.exists():
            continue
        meta = json.loads(meta_file.read_text())
        for config in ("with_skill", "old_skill"):
            run_dir = eval_dir / config
            if not run_dir.exists():
                continue
            expectations = grade_run(meta["eval_name"], meta["assertions"],
                                     run_dir / "outputs")
            n_pass = sum(e["passed"] for e in expectations)
            (run_dir / "grading.json").write_text(
                json.dumps({"expectations": expectations}, indent=2))
            print(f"{meta['eval_name']}/{config}: {n_pass}/{len(expectations)} passed")


if __name__ == "__main__":
    main()
