# Theme Tokens & Interaction Notes

## CSS Variables Managed by the Theme System
- `--accent-cyan`, `--accent-pink`, `--accent-purple`, `--muted`
- `--bg-dark`, `--panel-dark`, `--body-background`
- `--progress-track`, `--quest-progress-gradient`
- Card + CTA shadows: `--quest-card-shadow-*`, `--cta-*`
- Animation hooks: `--anim-pulse-*`, `--anim-spawn-*`, `--anim-glow-*`, `--anim-burst-*`

## Themable Animations
- `pulse-anim` – color/intensity driven by `--anim-pulse-*`
- `quest-spawn-anim` – drop shadow values come from `--anim-spawn-*`
- `glow-anim` – glow phases keyed off `--anim-glow-*`
- `burst-ring` / celebratory halo – colors supplied through `--anim-burst-*`

## Structural Animations (Do Not Theme)
- `progress-flow`
- `pulse-subtle-anim`
- `pulse-spawn-anim`
- `burst-fade` / `burst-copy` transforms
- Drag handle hover states (CSS only; keep consistent with accessibility guidance)

## Sound FX Requirements
- Every clip must provide both `audio/webm` and `audio/mpeg` sources
- Maximum file size: **50kb** per clip
- Events we currently map: `quest_add`, `quest_complete`, `side_quest_add`, `priority_cycle`, `level_up`
- Reduced-motion preferences automatically mute all FX; do not override

## Validation Toolkit
1. Visit `/themes` to preview all quest states across every theme. Capture screenshots for Percy/Chromatic runs.
2. Run `npm test -- ThemePreview` to update the snapshot harness that guards the preview markup.
3. Flip `prefers-reduced-motion` (system setting) to confirm glow/pulse tokens clamp and sounds mute.
