---
name: fantasy-sprites
description: Generate pixel art sprites for medieval fantasy games in a cohesive retro style (similar to Shovel Knight). Use this skill when the user requests creating sprites for characters (heroes, NPCs, enemies), creatures (monsters, animals, dragons), buildings (castles, houses, structures, props), or items (weapons, potions, collectibles, equipment). This skill ensures consistent purple-blue color palette, smooth modern retro aesthetics, and appropriate technical specifications across all sprite types.
---

# Fantasy Sprites Skill

Generate pixel art sprites for medieval fantasy games with consistent style, color palette, and quality.

## Core Style Guidelines

**Aesthetic:** Modern retro pixel art - Shovel Knight adjacent
- Smooth color gradients (not strictly limited palette)
- Anti-aliasing for smooth edges
- Rich purple-blue color scheme with cream/off-white accents
- Medieval fantasy theme
- Readable silhouettes at small sizes

**Technical Requirements:**
- PNG format with transparent background
- Dimensions: Flexible, typically 16-128 pixels
- Anti-aliasing: Allowed and encouraged
- Color depth: Full RGB (not palette-limited)
- Export: 1x scale (no upscaling)

## Color Palette

**Primary Colors (Purple-Blue Spectrum):**
- Deep darks: #0b0328, #170a47, #0c0336
- Dark purples: #281c59, #2f2264, #3d3467
- Mid purples: #534a81, #695791, #675690
- Light purples: #807eb3, #85839f, #7e779e
- Highlights: #e2e0b8 (cream/off-white)

**Usage:**
- Characters: Purple-blue armor, varied shading
- Creatures: Same palette, adapt for texture
- Buildings: Stone (purple-gray), roofs (blue-purple)
- Items: Metals (purple-blue), accents (brighter tones)

**Consistency:** All sprites in a campaign/level should use the same palette range for cohesion.

## Workflow

**Step 1: Determine sprite category**
- Characters? → Read `references/characters.md`
- Creatures? → Read `references/creatures.md`
- Buildings? → Read `references/buildings.md`
- Items? → Read `references/items.md`

**Step 2: Review examples**
- `assets/examples/knight.png` - Character reference
- `assets/examples/dragon.png` - Creature reference
- `assets/examples/castle.png` - Building reference

**Step 3: Generate sprite**
- Match the retro pixel art style
- Use the purple-blue color palette
- Ensure transparent background
- Keep dimensions appropriate to sprite type
- Maintain clear, readable silhouette

**Step 4: Validate quality**
- Silhouette test: Is it recognizable in solid black?
- Palette test: Colors match the purple-blue scheme?
- Scale test: Readable at intended size?
- Consistency test: Fits with other sprites?

## Category-Specific Quick Reference

**Characters:**
- Size: 16-64 pixels tall typically
- Readable anatomy and silhouette
- Purple-blue armor tones
- Consider animation (idle, walk, attack)
- See `references/characters.md` for details

**Creatures:**
- Size: Variable (12-128+ pixels)
- Exaggerated features for readability
- Same palette as characters
- Threatening or charming as appropriate
- See `references/creatures.md` for details

**Buildings:**
- Size: 32-128+ pixels typical
- Medieval fantasy architecture
- Stone (purple-gray), roofs (blue-purple)
- Vertical emphasis for grandeur
- See `references/buildings.md` for details

**Items:**
- Size: 8-48 pixels typical
- Instantly recognizable purpose
- Consistent with other sprites
- Consider inventory vs world size
- See `references/items.md` for details

## Best Practices

**Do:**
- Match the purple-blue palette from examples
- Use smooth gradients for modern retro feel
- Keep silhouettes clear and readable
- Maintain consistency across sprite types
- Use transparent backgrounds
- Review example sprites for style reference

**Don't:**
- Use colors outside the purple-blue palette
- Make sprites too detailed (loses readability)
- Forget transparent backgrounds
- Ignore scale (too large or too small)
- Mix different art styles
- Use hard palette limits (smooth gradients are good)

## Output Format

When generating a sprite, always:
1. Create the sprite as a PNG with transparent background
2. Use appropriate dimensions for the sprite type
3. Ensure it matches the style of the example sprites
4. Explain the design choices (colors, size, details)
5. Offer variations or adjustments if needed

## Example Usage

**User:** "Create a fire mage character sprite"
**Process:**
1. Read `references/characters.md` for character guidelines
2. Review `assets/examples/knight.png` for style reference
3. Generate 32x48 pixel character sprite
4. Use purple-blue for robes, brighter accents for fire effects
5. Ensure readable silhouette and clear pose
6. Export as PNG with transparent background

**User:** "Generate a health potion item sprite"
**Process:**
1. Read `references/items.md` for item guidelines
2. Generate 16x16 pixel item sprite
3. Flask shape with red liquid (accent color)
4. Purple-blue glass with highlights
5. Transparent background
6. Offer both inventory and world sizes

## Quality Checklist

Before finalizing any sprite:
- [ ] Transparent background
- [ ] Purple-blue color palette
- [ ] Appropriate size for sprite type
- [ ] Clear, readable silhouette
- [ ] Smooth modern retro style
- [ ] Matches example sprite aesthetic
- [ ] Consistent with other sprites in set
- [ ] Technical specs met (PNG, dimensions)
