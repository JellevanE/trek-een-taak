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
- [x] Introduce a lightweight context (e.g., `QuestBoardContext.jsx`) that exposes quest state + dispatchers to the card and list components, reducing prop threading. _Implemented via `QuestBoardProvider`/`useQuestBoardContext`, wrapping the Framer quest list so cards/list items consume shared state without prop churn._
- [x] Add focused unit tests per hook (jest/react-hooks) covering selection reset, undo timers, and layout refresh scheduling now that logic is isolated.
- [x] Document the refactor in-code (JSDoc or README snippet) so future contributors know where to extend quests vs. side quests.
- _Note: Original drag jank was caused by `renderQuestCard` and related props being regenerated on nearly every state change inside `useQuests.js`. Decomposition stabilized dependencies so Framer Motion receives steady layout data before drag start events. **Verify if drag jank is fully resolved after Story 1 migration**—if yes, remove this note; if persists, identify remaining unstable dependencies causing re-renders._

## Story 3 · Quest & Side-Quest Layout Refresh
- [x] Split `client/src/components/QuestCard.js` (544 lines) into composable pieces (`QuestCardShell`, `QuestHeader`, `QuestProgress`, `SideQuestList`, `QuestActions`) so spacing and overflow are isolated per section. _New components now live under `client/src/components/quest-card/` with `QuestCard` acting as the orchestrator._
- [x] Ensure the new `SideQuestList` keeps items inside the quest card by using intrinsic height calculations plus CSS grid/flex tweaks in `client/src/App.css` (or a new `quest-board.css`). _Added `.quest-card-shell`, `.side-quest-panel`, and scroll clamping styles so Framer lists respect card bounds._
- [x] Rebuild side-quest rows (`SideQuestItem.jsx`) with tighter vertical rhythm, draggable handles that don't overlap buttons, and responsive states for nested buttons/menus. _Implemented via the `SideQuestList` + `SideQuestItem` pair, which centralizes button spacing and drag-handle focus management._
- [x] Add stories/tests or Storybook-style fixtures (even lightweight) to verify quests with 0/3/6 side quests render without clipping. _`SideQuestList.test.jsx` now covers empty, three-item, and six-item scenarios to guard scroll states._
- [x] Align spacing tokens (gap, padding, card width) with the neon arcade vibe decided for the board skin. _`client/src/index.css` now exposes the `arcade-space` scale + quest layout tokens, and `QuestCard.js` consumes `tokens/spacing.js` for consistent side-quest math._
- [x] **Side-quest overflow handling:** Implement max-height constraints for side-quest containers with proper scrolling behavior; consider virtualization for quests with 10+ side-quests to maintain performance. _Scroll regions now set `data-scrollable` when clamped; virtualization TBD if perf demands it._
- [x] **Content edge cases:** Test with long descriptions (200+ chars), special characters, emoji, and empty states to ensure layout doesn't break. _Quest/side-quest headings now clamp to two lines, fall back to "Untitled" labels, and `QuestHeader`/`SideQuestList` tests cover emoji + blank-description scenarios._
- [x] **Responsive breakpoints:** Define mobile (<768px) and tablet (768px-1024px) layouts:
  - Quest cards stack vertically on mobile with full-width
  - Side-quest action buttons reposition for touch (min 44px tap targets)
  - Drag handles enlarge for touch interaction
  - Consider horizontal scrolling for quest list on narrow screens
  _New 1024px/768px/600px media queries in `client/src/App.css` collapse quest card shells, enlarge drag handles via CSS vars, widen tap targets, and enable overflow scrolling when space is constrained._
- [x] **Clarify test fixtures approach:** Either add explicit Storybook setup with installation steps, or document that "Storybook-style" means lightweight test fixtures (`.json` mock data files) for component testing. _Documented via `client/src/features/quest-board/test-data/questFixtures.js`, which supplies deterministic fixtures to the new Jest suites._

## Story 4 · Theme & Interaction Tokens
- [x] Extend `client/src/hooks/useTheme.js` (or create `client/src/theme/index.js`) to expose interaction tokens: `motion.curves`, `motion.durations`, `glow.intensity`, `card.depth`, `soundFx` toggles. _New `client/src/theme/index.js` owns the Neon/Classic profiles and `useTheme` now returns `themeProfile`, auto-syncs CSS vars, and broadcasts card/CTA tokens + sound flags through context._
- [x] Provide a default "Neon Arcade" theme profile plus a placeholder "Classic" profile so we can prove animations/styles swap together. _`DEFAULT_THEME_ID` points to `neon_arcade` with a light-mode `classic` fallback + legacy dark/light aliases so existing localStorage entries migrate automatically._
- [x] Update quest board components (`QuestCard`, new Framer list wrappers, CTA buttons) to consume the theme tokens instead of hard-coded CSS transitions. _QuestCardShell + QuestActions now drive box-shadows/focus rings/CTA motion through theme-fed CSS vars, and Framer lists consume the shared motion presets._
- [x] Ensure theming covers reduced-motion fallbacks by reading `prefers-reduced-motion` inside the theme hook and clamping animation durations. _`useQuestMotionTokens` pulls from the central profiles and still halves durations + disables glow when reduced motion is enabled._
- [x] Add regression checks (Jest snapshots or visual diff harness) that confirm theme changes don't alter business logic output, only presentation. _Covered via the new `useQuestMotionTokens.test.js`, which asserts profile switching + reduced-motion clamping without touching quest logic._
- [x] **CSS variable migration:** Extract hardcoded colors and animations from `App.css` into theme-controlled variants:
  - Map existing CSS custom properties (--accent-cyan, --accent-pink, --accent-purple, --muted) to theme profiles
  - Migrate `@keyframes` animations (pulse-anim, glow-anim, burst-fade, burst-ring, quest-spawn-anim) to support theme-specific parameters
  - Document which animations/styles are themable vs. structural (unchangeable)
  _Body/background hues, progress bars, and the glow/burst/pulse keyframes now read from the theme tokens exposed via `getThemeCssVariables`, and `client/src/theme/THEME_NOTES.md` calls out which animations remain structural._
- [x] **Sound effect implementation:** Expand beyond toggle to include:
  - Define audio file requirements (format: WebM/MP3 fallback, max size: 50kb per file)
  - Add volume controls (0-100%) in theme settings
  - Implement preload strategy to avoid first-play latency
  - Map sound events: quest-add, quest-complete, side-quest-add, priority-cycle, level-up
  - Ensure sounds respect reduced-motion preferences (mute if enabled)
  _`useSoundFx` preloads tone/sample players, honors reduced-motion, and new FX sliders wire into `useTheme` so quest add/complete/etc. fire theme-aware cues._
- [x] **Theme validation tooling:** Create mechanisms to verify themes work across all states:
  - Consider a `/themes` preview route showing all quest states (active, completed, editing, dragging, glowing, pulsing)
  - Add visual regression testing setup (lightweight Percy/Chromatic snapshots or manual screenshot comparison)
  - Test theme switching doesn't cause FOUC (flash of unstyled content)
  _Visited via `/themes`, the preview grid renders every quest state per theme and is snapshotted by `ThemePreviewPage.test.jsx`; the root now sets `data-theme-ready` to prevent FOUC before CSS vars apply._
- [x] **Extend useQuestMotionTokens:** The existing hook in `client/src/features/quest-board/hooks/useQuestMotionTokens.js` already handles motion profiles and reduced-motion—integrate it with the broader theme system rather than duplicating logic. _Hook now resolves presets from the shared theme module so Story 4 tokens stay in sync._

## Story 5 · Quest State Store (Zustand)
- [ ] Introduce a `client/src/store/questBoardStore.js` (or similar) using Zustand to own quests, selection, editing, and layout metadata.
- [ ] Refactor `useQuests` descendants to read/write through the store (selectors/actions) while keeping server synchronization logic in hooks.
- [ ] Expose derived selectors for quest lists, side-quest subsets, animation states, and undo queues so components subscribe narrowly.
- [ ] Ensure the Zustand store cooperates with the new Framer Motion lists (no stale closures) and supports optimistic updates with rollback.
- [ ] Cover the store with unit tests for reducers/actions, especially reorder, selection reset, and side-quest edits.
- [ ] **Phased migration strategy:** Given `useQuests.js` is 767 lines with complex interdependencies, document the migration order:
  - Phase 1: Migrate read-only data (quests array, campaigns lookup) to store
  - Phase 2: Move selection state (selectedQuestId, selectedSideQuest, collapsedMap)
  - Phase 3: Migrate editing state (editingQuest, editingSideQuest, addingSideQuestTo)
  - Phase 4: Move animation flags (pulsingQuests, glowQuests, celebratingQuests, spawnQuests)
  - Phase 5: Integrate undo/redo logic with store actions
  - Each phase should be a separate commit with passing tests before proceeding
- [ ] **Context vs. Store resolution:** Clarify relationship with existing `QuestBoardContext` from Story 2:
  - Option A: Keep context as thin wrapper over Zustand store (context provides store instance)
  - Option B: Deprecate context entirely, have components import store hooks directly
  - Ensure no "two sources of truth" bugs during transition period
- [ ] **Bundle impact assessment:** Zustand adds ~3kb gzipped—validate against the 119.33kb baseline from Story 1 to confirm we stay under the 5% regression threshold (125.3kb max).
- [ ] **DevTools integration:** Set up Zustand DevTools for debugging:
  - Install `zustand/middleware` devtools
  - Enable time-travel debugging for state mutations
  - Document how to inspect store state during development
- [ ] **Persistence strategy:** Define which state should persist to localStorage:
  - User preferences: theme, collapsed quests, sidebar state (YES)
  - Active selections/editing: selectedQuestId, editingQuest (NO - reset on page load)
  - Animation flags: pulsingQuests, glowQuests (NO - transient)
  - Document restore logic and version migration for schema changes

## Story 6 · Bundle & UX Validation
- [ ] Track bundle size before/after the migration using `client npm run build -- --stats` and flag any regressions >5%.
- [ ] Define UX heuristics for the quest board (latency targets for drag start, drop, and side-quest open/close) and verify them manually or via React Profiler traces.
- [ ] Run `deno task validate` plus focused `client npm test` after each major story to ensure both suites stay green throughout the overhaul.
- [ ] Keep a running changelog (e.g., `docs/quest-board-overhaul.md`) that maps stories to files touched, aiding future onboarding.
- [ ] **Performance benchmarks:** Define concrete, measurable targets:
  - Drag start latency: <16ms (1 frame at 60fps) from mousedown to visual feedback
  - Side-quest expand animation: <300ms to match CSS transition duration in existing styles
  - Quest list initial render: <100ms for 20 quests, <250ms for 50 quests
  - Re-render performance: Quest card updates shouldn't trigger full list re-render (validate React.memo effectiveness)
  - Memory: No memory leaks during 100 quest add/complete/delete cycles
- [ ] **Test coverage requirements:** Current client-side test coverage is minimal (3 test files found):
  - Mandate minimum 75% coverage for each module
  - Required test files:
    - `useQuestMotionTokens.test.js` - Theme switching, reduced motion
    - `FramerQuestList.test.jsx` / `FramerSideQuestList.test.jsx` - Reorder logic, edge cases
    - `QuestCardShell.test.jsx`, `QuestHeader.test.jsx`, `SideQuestItem.test.jsx` - Component rendering, interactions
    - `questBoardStore.test.js` - Store actions, selectors, persistence (Story 5)
  - Expand `App.test.js` to cover keyboard shortcuts, theme switching, and quest board integration flows
- [ ] **Cumulative bundle tracking:** Story 1 shows +16.88kb post-Framer Motion migration (baseline: 119.33kb gzip). Track cumulative delta:
  - After Story 3 (component splits): Expected +2-3kb (more imports)
  - After Story 4 (theme system): Expected +3-5kb (theme data, audio preloading)
  - After Story 5 (Zustand): Expected +3kb (library)
  - Total target: <125.3kb (5% threshold) - if exceeded, identify optimization opportunities
- [ ] **Documentation location adjustment:** Move `docs/quest-board-overhaul.md` to `client/src/features/quest-board/OVERHAUL.md` to keep it adjacent to the code it documents. Include:
  - Story completion dates and commit SHAs
  - Breaking changes and migration notes
  - Performance before/after metrics
  - Known issues and future enhancements

## Story 7 · Accessibility & Keyboard UX (Optional Enhancement)
_Priority: Medium - Can be tackled after core Stories 3-6 if time permits_

- [ ] **ARIA enhancements:** Add semantic markup for assistive technologies:
  - `aria-label` for drag handles ("Reorder quest", "Reorder side quest")
  - `role="status"` for quest status indicators with `aria-live="polite"` for completion announcements
  - `aria-expanded` for collapsed/expanded quest cards
  - `aria-describedby` linking quest cards to their progress/status metadata
- [ ] **Screen reader support:** Ensure state changes are announced:
  - Quest completion: "Quest completed: [description]"
  - Priority/level changes: "Priority changed to urgent" / "Level increased to 3"
  - Side quest operations: "Side quest added" / "Side quest completed"
- [ ] **Focus management:** 
  - Focus traps in edit forms (Tab/Shift+Tab cycles within modal)
  - Focus restoration after deleting a quest (move to next/previous quest)
  - Visible focus indicators for all interactive elements (2px outline, high contrast)
- [ ] **Keyboard shortcuts refinement:** Existing shortcuts are well-documented, but verify:
  - No conflicts with browser/OS shortcuts
  - Shortcuts work within edit forms (or are contextually disabled)
  - Help panel (?) is keyboard-accessible
- [ ] **High contrast mode:** Test with Windows High Contrast and browser forced colors:
  - Ensure drag handles, buttons remain visible
  - Border colors don't disappear against backgrounds
  - Status indicators use patterns/icons, not just color

## Story 8 · Error Boundaries & Resilience (Optional Enhancement)
_Priority: Medium - Recommended before production deployment_

- [ ] **Quest board error boundary:** Wrap main quest board feature in `<QuestBoardErrorBoundary>`:
  - Catches rendering errors in quest cards, Framer Motion lists
  - Displays user-friendly fallback: "Quest board temporarily unavailable. Refresh to retry."
  - Logs error details to console (or external service like Sentry)
  - Provides "Retry" button that resets error boundary state
- [ ] **Graceful degradation:** Handle library failures:
  - If Framer Motion fails to load, fall back to CSS-only animations
  - If theme system fails, apply safe default theme
  - If Zustand store corrupts, reset to empty state with notification
- [ ] **Network error handling:** Improve existing API error UX:
  - Distinguish between 4xx (user error) and 5xx (server error) responses
  - Retry logic for transient failures (exponential backoff)
  - Offline mode detection with clear messaging
- [ ] **Testing:** Add error simulation tests:
  - Component throws error during render
  - API returns malformed data
  - localStorage quota exceeded
  - Network timeout scenarios
