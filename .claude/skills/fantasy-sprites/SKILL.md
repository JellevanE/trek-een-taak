---
name: fantasy-sprites
description: Convert images into pixel art sprites (PNG + SVG) for a medieval fantasy game using a deterministic, model-free pipeline. Use this skill whenever the user wants a game sprite made from an image — a photo, downloaded art, an AI render, or any picture — or asks to pixelate an image, snap art to the game's palette, extract a palette from existing art, or keep sprites stylistically consistent. Also use it when the user asks to "create a sprite" of a character, creature, building, or item, even without providing any image: the pipeline can fetch openly-licensed reference images from the web and convert those. Never draw sprites pixel-by-pixel by hand; always use this pipeline.
---

# Fantasy Sprites

Turn any source image into a game-ready pixel sprite with `scripts/pixelate.py`.
The pipeline is deterministic: it downscales the image, snaps every pixel to the
game's fixed palette, hardens the alpha channel, and emits PNG (1x sprite +
preview) and optionally SVG. Style consistency comes from the shared palette
file, not from drawing skill — so never hand-place pixels with PIL; always run
the script.

## Workflow

**1. Get a source image.** Every sprite starts from a picture: a photo the user
provides, art they downloaded, or an AI render from any image tool. A single
centered subject on a plain background converts best.

If the user asks for a sprite but provided no image, fetch openly-licensed
candidates instead of asking them to go find one:

```bash
python3 scripts/fetch_reference.py "candle" --count 4
```

This queries Openverse (Creative Commons search) filtered to licenses that
allow commercial use and modification — important, because sprites shipped in
a game are derivative works. It downloads the candidates to
`/tmp/sprite-refs/<query>/` along with an `ATTRIBUTION.txt`; tell the user to
keep that file if their chosen license (e.g. CC BY) requires credit.

Photos vary wildly in how well they convert, so treat fetched images as
candidates, not answers: convert all of them (step 3), read every preview, and
keep only the ones where the subject survived — typically the photo with the
plainest background and clearest silhouette. Show the user the best one or two
and let them pick. If all candidates convert to mush, refine the search query
(e.g. "candle white background" or "candle clipart") and try once more before
asking the user for an image.

**2. Pick the size for the category.**

| Category  | Typical `--size` | Notes                                  |
|-----------|------------------|----------------------------------------|
| Items     | 16–24            | coins/gems 16, weapons/potions 24      |
| Characters| 32               | bosses up to 48                        |
| Creatures | 32–48            | scale to menace                        |
| Buildings | 64–96            | props 32                               |

Keep sizes consistent within a category — a 32px hero next to a 48px guard
reads as a size difference in-world.

**3. Run the converter.**

```bash
python3 scripts/pixelate.py SOURCE_IMAGE --size 32 --svg
```

Useful flags:
- `--remove-bg` — photos or renders with a flat background; flood-fills it to
  transparency (tune with `--bg-tolerance`, default 60)
- `--dither` — adds texture on large surfaces (stone walls); skip for small
  sprites where it reads as noise
- `--palette auto:12` — extract the palette from the source instead of the
  house palette (only when the user explicitly wants to break style)
- `--out-dir DIR` — where outputs go (default: next to the input)

The script writes `<name>_sprite.png` (1x, the game asset),
`<name>_preview.png` (8x nearest-neighbor, for human review), and with `--svg`
a `<name>_sprite.svg` (crisp-edges rects, scales losslessly).

**4. Validate by looking.** Read the `_preview.png` back and check:
- Is the subject recognizable? If it's mush, the source is too busy or the
  size too small — try a larger `--size` or a cleaner source crop.
- Did background bleed into the sprite? Raise `--bg-tolerance` or ask for a
  source with a plainer background.
- Silhouette readable? If not, the source pose is the problem, not the
  conversion — get a source with a clearer outline.

Show the preview to the user and offer one round of adjustments (size, dither,
background tolerance) before calling it done.

## Palette

`assets/palette.txt` is the single source of truth: a purple-blue ramp with a
cream highlight (Shovel Knight adjacent). `pixelate.py` uses it by default, so
every sprite automatically lands on-style. To retheme the whole game, edit that
file — don't pass ad-hoc palettes per sprite.

To build a palette from the user's existing art instead:

```bash
python3 scripts/extract_palette.py their_art1.png their_art2.png --colors 12 -o assets/palette.txt
```

## Examples

`assets/examples/` holds three source→sprite pairs showing the target look:

- `knight_source.png` → `knight_sprite.png` (character, 32px)
- `dragon_source.png` → `dragon_sprite.png` (creature, 48px)
- `castle_source.png` → `castle_sprite.png` (building, 64px)

When unsure whether a result is good enough, compare its preview against these.
