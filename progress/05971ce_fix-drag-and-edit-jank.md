# Fix: Quest card drag-and-drop jank & edit jitter

**Date:** 2026-02-26
**Branch:** feature/sprint-2-storyline-generation

## Issue

Two related front-end problems with quest cards:

1. **Drag-and-drop jank** — dragging quest cards felt jumpy. Cards would overshoot when crossing thresholds, and dragging past cards of different heights caused a cascade where the item shot to the top or bottom of the list.
2. **Edit jitter** — animations on quest cards went out of control when editing (typing, cycling priority/level), with pulse/glow effects restarting repeatedly.

## Suspected causes

| Area | Cause | Impact |
|------|-------|--------|
| Layout refresh effect | `useQuestInteractions` effect fired `scheduleLayoutRefresh()` on every `editingQuest`, `editingSideQuest`, `selectedQuestId` change | Incremented `refreshToken` → remounted entire `Reorder.Group` via `key` prop → all animations restarted |
| Underdamped spring | Layout transition `stiffness: 300, damping: 30, mass: 1` had overshoot | Non-dragged items bounced past target position during reorder |
| Height-based cascade | No reorder cooldown; variable-height cards caused chain threshold crossings | Single drag moved item to top/bottom of list |
| Nested motion layers | `Reorder.Item` (layout animation) wrapping `AnimatedQuestCard` (motion.div with own spring + `y: 0`) | Two motion elements fighting over position |
| Hover during drag | `whileHover={{ scale: 1.015 }}` active on non-dragged cards | Scale animations triggered on cards as cursor passed over them during drag |
| Competing CSS transforms | `.selected`, `.drag-over`, `.started` applied `translateY(-1px/-2px)` | CSS transforms conflicted with Framer Motion layout positioning |
| Debug logging | `console.log` on every App render and every side-quest edit keystroke | Main thread overhead during high-frequency updates |

## Changes

### `useQuestInteractions.js`
- Removed `editingQuest`, `editingSideQuest`, `addingSideQuestTo`, `selectedQuestId`, `selectedSideQuest` from layout refresh effect deps. Only `quests` and `collapsedMap` (actual layout-affecting changes) remain.

### `FramerQuestList.jsx`
- Changed layout spring to overdamped: `stiffness: 300, damping: 40, mass: 0.8` (no overshoot).
- Reduced `dragElastic` from `0.12` to `0.08`.
- Added 150ms reorder cooldown to prevent cascade swaps.
- Passed `listIsDragging` through `dragMeta` to child cards.

### `FramerSideQuestList.jsx`
- Same overdamped spring, reduced `dragElastic`, reorder cooldown, and `listIsDragging` passthrough.

### `AnimatedComponents.js`
- Added `layout={false}` to prevent participating in Reorder layout animations.
- Changed `initial` to `false` for existing cards (only new cards get spawn animation), stopping the inner motion.div from fighting the outer `Reorder.Item`.

### `QuestCardShell.jsx`
- `whileHover` / `whileTap` now disabled on all cards when any drag is in progress (`dragMeta.listIsDragging`), not just the dragged card.

### `quest-cards.css`
- Removed `transform: translateY()` from `.quest.selected`, `.quest.drag-over`, `.quest.started`. Box-shadow/border effects preserved.

### `App.js` / `SideQuestList.jsx`
- Removed `console.log('[App] Re-rendering')` and per-keystroke side-quest edit debug log.

## 2026-02-26 DnD-kit rework (Option 2)

- Replaced Framer Motion `Reorder` lists with `@dnd-kit` Sortable lists in:
  - `client/src/features/quest-board/components/FramerQuestList.jsx`
  - `client/src/features/quest-board/components/FramerSideQuestList.jsx`
- Removed `useNeonDragHandle` from `listUtils.js` (Framer-specific).
- Added `DragOverlay` + pointer sensor (distance activation) to reduce layout thrash on mixed heights.
- Added dependencies to `client/package.json`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Note:** The agent could not run `npm install` due to `ENOTFOUND` (no registry access). Run locally to update `node_modules`/`package-lock.json`.
