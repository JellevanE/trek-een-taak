# Quest Card & Side Quest Stabilization Plan

## Review Summary (Stories 1-4)
**Reviewed:** November 11, 2025

### Completed Work
- ✅ **Story 1:** Side quest optimistic updates working; field normalization (`sub_tasks`/`side_quests`) complete
- ✅ **Story 2:** Status transitions functional with proper selectors; animations working
- ✅ **Story 3:** Start button decoupled from selection via `stopPropagation()`; handlers properly isolated

### Gaps Identified
- **Story 1:** Add button lacks disabled/loading state for queued operations
- **Story 2:** Missing comprehensive failure fallback tests
- **Story 3:** No regression tests for selection + action interactions
- **Story 4:** Width tokens exist but need visual QA; potential text overlaps unverified

### Recommendations
1. Add visual feedback (spinner/disabled state) to "Add Side Quest" button during async operations
2. Create RTL test suite covering: selected quest actions, multi-side-quest failures, rapid-fire adds
3. Manual QA pass for layout consistency across breakpoints and overlapping elements

Shared goals from today's interview:
- Keep side quest actions purely client fixes—backend already persists data correctly.
- Ensure quests and side quests update instantly in the UI, regardless of selection state, and stay in sync with server truth.
- Align quest card layout (width, spacing, typography) with the header while cleaning up overlapping buttons and awkward shapes.
- Smooth out drag interactions with whole-card handles and eased snap-to-grid so cards no longer jitter or jump.
- Use the refactor window to modularize hooks/components for better performance and easier animation upgrades (Framer Motion preferred).
- Track future UI polish items (e.g., button/shape refresh) so they are not lost once functional bugs are fixed.

## Story 1 · Side Quest UI Sync & Feedback
**Status:** ✅ Completed — UI now stays in sync while adding multiple side quests; optimistic updates + drafts cleared reliably.
- [x] Reproduce the disappearing side quest bug when adding multiple items; audit `useQuestInteractions` + board store to confirm optimistic updates always replace the quest entry immutably.
- [x] Normalize how `sub_tasks` vs. `side_quests` fields are merged so React diffing never drops freshly added items.
- [x] Add loading/disabled feedback on the "Add Side Quest" button so users know additional clicks are queued. **Implemented:** ActionButton component with retro arcade spinner, per-quest loading state tracking.
- [x] Write RTL coverage for "add two side quests in a row" to guard against regressions.

## Story 2 · Side Quest Status Transitions
**Status:** ✅ Completed — side quests can be started/completed from the UI; progress meters animate correctly and stay in lockstep with server data.
- [x] Trace the status-toggle handlers to ensure local state, animations, and progress meters update even before the API response returns.
- [x] Fix any stale selectors that prevent cards from re-rendering when subtasks move between `todo → in_progress → completed`.
- [x] Surface inline status indicators (e.g., motion variants or icon swaps) so state changes remain visible while backend confirmations stream in.
- [ ] Extend hook tests to cover multi-side-quest toggles and failure fallbacks. **Note:** Basic test exists, but no comprehensive failure scenario coverage.

## Story 3 · Quest Selection & Start Button Fixes
**Status:** 🟡 Investigating — Start button now properly decoupled from selection state via `event.stopPropagation()` in QuestActions, but no dedicated tests yet.
- [x] Debug why "Start Quest" only works when the card isn't selected; likely a stale selection reference or stopPropagation issue inside `QuestCardActions`. **Note:** Fixed via `handle()` wrapper that calls `event.stopPropagation()`.
- [x] Decouple action handlers from selection state so each button targets its owning quest regardless of highlight. **Note:** Buttons conditionally render based on `questSelected` prop but handlers are properly isolated.
- [ ] Add regression tests (hooks + RTL) covering "selected quest can start/in-progress/completion toggles" to lock behavior. **Note:** No dedicated tests for selection + action interaction found.

## Story 4 · Layout & Width Harmonization
**Status:** 🟢 Partially Complete — CSS tokens exist (`--quest-card-max-width`, `QUEST_LAYOUT_TOKENS.cardMaxWidth`) but header/card consistency needs verification.
- [x] Share width tokens between the header and quest cards so cards span the same width at every breakpoint. **Note:** Tokens exist but actual application to header needs visual QA.
- [ ] Adjust side quest lists, progress bars, and badges so text no longer overlaps buttons as states change. **Note:** Need to verify no overlaps at various screen sizes.
- [ ] Update CSS/SCSS modules with clearer stacking contexts and padding to keep buttons and shapes aligned; capture screenshots for QA reference.

## Story 5 · Drag & Motion Experience Refresh
- [ ] Promote the entire quest card to the drag handle via Framer Motion (or `Reorder.Group`) while keeping keyboard reordering accessible.
- [ ] Tune drag inertia and snapping so movement feels smooth, only snapping back to the grid on pointer release with eased timing.
- [ ] Prevent card jumps near column boundaries by stabilizing the layout measurements (`ResizeObserver` + memoized dimensions).
- [ ] Expand Framer Motion usage (hover/press states, side quest entry/exit) to make interactions cohesive and prepare for future animation work.

## Story 6 · UI Polish & Future Button/Shape Refresh
**Status:** 📝 Tracked for later — document the overlapping text/button shapes so the visual refresh can build on the functional fixes.
- [ ] Document the current button + pill shapes that overlap copy so the upcoming visual refresh has clear requirements.
- [ ] Prototype adjusted button geometry (rounded corners, consistent heights) that leaves room for status text and icons.
- [ ] Gate visual-only tweaks behind feature flags or component props so functional fixes can ship independently.
- [ ] Capture follow-up tasks in `IMPROVEMENTS.md` or a dedicated ADR so the team remembers to revisit button/shape styling even if schedules tighten.

## Story 7 · Quality Gates & Release Prep
- [ ] Run `deno task validate` (or `deno task test:client`) after each story; add focused jest specs where gaps exist.
- [ ] Maintain the feature branch `feature/quest-card-sidequest-refactor`, landing one commit per completed story with descriptive messages.
- [ ] Manually QA the flows: add/remove/toggle side quests, start quests while selected, resize viewport, and drag cards across columns.
- [ ] Draft release notes summarizing the fixes plus the planned UI button/shape polish so downstream teams know what changed and what’s next.
