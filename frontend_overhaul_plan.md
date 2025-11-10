# Quest Board Frontend Overhaul Plan

Shared goals from the JAD session:
- Prioritize the quest board as the primary interaction surface.
- Fix the janky drag behavior, including side-quest reordering and spacing.
- Adopt Framer Motion so animations feel arcade-neon, yet remain themable and modular.
- Reduce bundle size by refactoring oversized hooks/components for reusability.
- Use current CSS (fonts/colors) as the canonical style guide and treat `inspiration.html` + `UI_UX_IDEAS.md` as reference only—any new feature concepts from those must be confirmed with the stakeholder first.
- We have freedom to restructure the client folders/features so long as it increases clarity (e.g., grouping quest-board assets under a feature directory).
- All work should happen on a dedicated feature branch, with each story landing as its own commit and backed by sufficient test coverage before merge.

## Story 1 · Framer Motion Drag Infrastructure
- [x] Benchmark the current physics implementation in `client/src/components/SmoothDraggable.js` to list the behaviors we must retain (activation thresholds, resize observers, side-quest caps).
- [x] Introduce Framer Motion (via `framer-motion` + `Reorder`) and scaffold `client/src/components/quest-board/FramerQuestList.jsx` plus `FramerSideQuestList.jsx` that mirror the existing API but support column-aware layouts.
- [x] Update `client/src/hooks/useSmoothDragQuests.js` (or replace with `useQuestReorder.js`) to expose the new Framer Motion lists, ensuring quest and side-quest reorders hydrate `quests` state without extra renders.
- [x] Instrument the new lists with arcade-style interaction tokens (snap duration, neon glow on drag, focus ring) and wire them to a shared theme provider so motion curves swap with future themes.
- [x] Remove react-spring/@use-gesture dependencies and measure bundle delta after the migration.

_CRA build stats (post-migration): main bundle 119.33 kB gzip (+16.88 kB vs previous baseline reported by react-scripts)._

## Story 2 · Quest Hook Decomposition & UI Extraction
- [x] Carve data fetching/mutations from `client/src/hooks/useQuests.js` into `useQuestData.js`, leaving orchestration hooks (`useQuestSelection.js`, `useQuestInteractions.js`, `useQuestAnimations.js`) to manage selection, keyboard shortcuts, undo stacks, and glow/pulse states.
- [x] Move JSX helper functions such as `renderEditForm` and `renderAddSideQuestForm` into dedicated components under `client/src/components/quest-board/forms/` so hooks no longer emit UI.
- [ ] Introduce a lightweight context (e.g., `QuestBoardContext.jsx`) that exposes quest state + dispatchers to the card and list components, reducing prop threading. _Pending next iteration; new hook wiring was structured to plug into this context without additional refactors._
- [x] Add focused unit tests per hook (jest/react-hooks) covering selection reset, undo timers, and layout refresh scheduling now that logic is isolated.
- [x] Document the refactor in-code (JSDoc or README snippet) so future contributors know where to extend quests vs. side quests.
- _Note: Drag jank persists because `renderQuestCard` and related props are regenerated on nearly every state change inside `useQuests.js`. Decomposition should stabilize dependencies so Framer Motion receives steady layout data before drag start events._

## Story 3 · Quest & Side-Quest Layout Refresh
- [ ] Split `client/src/components/QuestCard.js` into composable pieces (`QuestCardShell`, `QuestHeader`, `QuestProgress`, `SideQuestList`, `QuestActions`) so spacing and overflow are isolated per section.
- [ ] Ensure the new `SideQuestList` keeps items inside the quest card by using intrinsic height calculations plus CSS grid/flex tweaks in `client/src/App.css` (or a new `quest-board.css`).
- [ ] Rebuild side-quest rows (`SideQuestItem.jsx`) with tighter vertical rhythm, draggable handles that don’t overlap buttons, and responsive states for nested buttons/menus.
- [ ] Add stories/tests or Storybook-style fixtures (even lightweight) to verify quests with 0/3/6 side quests render without clipping.
- [ ] Align spacing tokens (gap, padding, card width) with the neon arcade vibe decided for the board skin.

## Story 4 · Theme & Interaction Tokens
- [ ] Extend `client/src/hooks/useTheme.js` (or create `client/src/theme/index.js`) to expose interaction tokens: `motion.curves`, `motion.durations`, `glow.intensity`, `card.depth`, `soundFx` toggles.
- [ ] Provide a default “Neon Arcade” theme profile plus a placeholder “Classic” profile so we can prove animations/styles swap together.
- [ ] Update quest board components (`QuestCard`, new Framer list wrappers, CTA buttons) to consume the theme tokens instead of hard-coded CSS transitions.
- [ ] Ensure theming covers reduced-motion fallbacks by reading `prefers-reduced-motion` inside the theme hook and clamping animation durations.
- [ ] Add regression checks (Jest snapshots or visual diff harness) that confirm theme changes don’t alter business logic output, only presentation.

## Story 5 · Quest State Store (Zustand)
- [ ] Introduce a `client/src/store/questBoardStore.js` (or similar) using Zustand to own quests, selection, editing, and layout metadata.
- [ ] Refactor `useQuests` descendants to read/write through the store (selectors/actions) while keeping server synchronization logic in hooks.
- [ ] Expose derived selectors for quest lists, side-quest subsets, animation states, and undo queues so components subscribe narrowly.
- [ ] Ensure the Zustand store cooperates with the new Framer Motion lists (no stale closures) and supports optimistic updates with rollback.
- [ ] Cover the store with unit tests for reducers/actions, especially reorder, selection reset, and side-quest edits.

## Story 6 · Bundle & UX Validation
- [ ] Track bundle size before/after the migration using `client npm run build -- --stats` and flag any regressions >5%.
- [ ] Define UX heuristics for the quest board (latency targets for drag start, drop, and side-quest open/close) and verify them manually or via React Profiler traces.
- [ ] Run `deno task validate` plus focused `client npm test` after each major story to ensure both suites stay green throughout the overhaul.
- [ ] Keep a running changelog (e.g., `docs/quest-board-overhaul.md`) that maps stories to files touched, aiding future onboarding.
