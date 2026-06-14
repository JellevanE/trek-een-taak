# Character Sprites Reference

Guide for creating pixel art character sprites in the medieval fantasy retro style.

## Style Principles

**Size Guidelines:**
- Small characters: 16-24 pixels tall
- Medium characters: 24-40 pixels tall  
- Large characters/bosses: 40-64 pixels tall
- Keep consistent proportions within same category

**Character Anatomy:**
- Head: ~1/3 to 1/4 of total height
- Body: Simplified, focus on silhouette
- Limbs: Can be minimalist (even single-pixel width for small sprites)
- Readable silhouette is crucial - should be identifiable in solid black

## Color Usage

**Character Classes:**
- Warriors/Knights: Blue-purple armor tones (see examples)
- Mages: Lighter purples, accent with brighter tones
- Rogues: Darker purples, deeper shadows
- NPCs: Varied but within the purple-blue palette
- Enemies: Can use same palette but different proportions

**Shading Technique:**
- Use 3-5 shades per color area
- Smooth gradients for modern retro feel
- Dithering sparingly for texture only
- Highlights on armor/metal surfaces
- Rim lighting for depth

## Animation Considerations

**Idle Stance:**
- Subtle breathing animation (2-4 frames)
- Weapon/shield held ready
- Center of gravity balanced

**Walk Cycle:**
- 4-8 frames typical
- Arms and legs move in opposition
- Bob up/down slightly for weight
- Weapon follows body motion

**Attack Animation:**
- Wind-up frame
- Strike frame (motion blur optional)
- Recovery frame
- Keep crisp, readable motion

## Technical Specs

- Transparent background (PNG with alpha)
- Power-of-2 dimensions when possible (16, 32, 64)
- Or standard game dimensions (24, 40, 48)
- Anti-aliasing allowed for smooth edges
- Export at 1x scale (no upscaling)

## Examples

See `assets/examples/knight.png` for reference - note the:
- Clear silhouette despite small size
- Purple-blue armor color scheme
- Smooth shading on armor plates
- Readable pose and proportions
