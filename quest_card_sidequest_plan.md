# Quest Card & Side Quest Remediation Plan

Shared goals from the latest interview:
- Restore instant UI feedback for side quests: creations, status toggles, and quest-level state should mirror server mutations without manual refreshes.
- Fix the quest selection quirks so starting/acting on a quest never depends on whether it is currently highlighted.
- Normalize quest card layout (match header width, predictable gutters) while smoothing the drag experience with a gentler snap-to-grid feel.
- Use the refactor window to modularize the client code (state, hooks, motion, layout) for better performance and easier future tweaks.
- Keep server APIs untouched unless a client fix proves impossible; all current symptoms appear purely client-side.
- Ship work behind a feature branch with incremental commits + tests (hooks, reducers, critical UI flows).

## Story 1 · Side Quest Data Flow Corrections
- [ ] Trace side quest creation pipeline (button → form → mutation hook → quest state) and document where the UI stops receiving updates after the first addition.
- [ ] Audit the quest/side-quest selectors (likely `useQuestData` + board context) to ensure new side quests are appended immutably so React diffing sees the change.
- [ ] Add optimistic UI handling (or force refetch) so successive additions render instantly even if the server response lags.
- [ ] Capture regression tests: RTL spec covering “add multiple side quests” and verifying they appear without a reload.

## Story 2 · Side Quest Status & Action Wiring
- [ ] Inspect the handlers that flip side quest `in_progress` / `completed` flags; confirm they update local state instead of only awaiting the API result.
- [ ] Fix reducer/hook logic so per-side-quest status changes re-render the owning quest card and progress meter.
- [ ] Add visual feedback (loading / disabled state) so buttons reflect the pending mutation.
- [ ] Extend tests to cover toggling status across multiple side quests and ensure UI reflects backend data.

## Story 3 · Quest Selection & Action Consistency
- [ ] Debug why “start quest” buttons only work when the quest is not currently selected; likely stale selection state or stopPropagation logic.
- [ ] Decouple quest activation handlers from card selection state so actions always address the card that owns the button.
- [ ] Add QA checklist/spec ensuring selection, start, and completion actions can be triggered in any order without misfires.

## Story 4 · Layout & Width Harmonization
- [ ] Compare quest card container width against the header component and align via shared layout tokens (CSS variables / theme constants).
- [ ] Ensure side quest lists inherit the new width and maintain consistent padding, taking into account responsive breakpoints.
- [ ] Add visual regression notes or Chromatic snapshots (if available) to lock the wider layout in place.

## Story 5 · Drag & Drop Experience Refresh
- [ ] Profile the current drag stack (likely custom SmoothDraggable or Framer Motion) to understand why cards jump near thresholds and only drag via the hamburger handle.
- [ ] Allow the entire quest card to act as the drag handle while preserving accessibility (focus/keyboard reorder fallback).
- [ ] Adjust motion curves so dragging is smooth, with snap-to-grid triggered only on release and with eased animation rather than instant jumps.
- [ ] Validate spacing between cards post-drop to avoid the free-form gaps encountered in earlier experiments.
- [ ] Expand Framer Motion usage beyond drag (hover/press states, side quest entry animations) so interactions feel cohesive.
- [ ] Add automated tests (unit or Cypress smoke) for drag ordering plus manual QA notes for cross-browser verification.

## Story 6 · Modularization & Performance Guardrails
- [ ] Split oversized quest board hooks/components so data fetching, selection, interactions, and presentation are clearly separated (follow patterns from `frontend_overhaul_plan.md`).
- [ ] Memoize expensive selectors and ensure quest/side quest lists leverage React context or virtualization to prevent unnecessary re-renders on each mutation.
- [ ] Document the new module boundaries (README snippet or ADR) so future contributors know where to plug in quest logic.
- [ ] Include performance benchmarks (FPS while dragging, React devtools flame graph snapshots) before vs. after the refactor to confirm improvements.

## Story 7 · Validation & Release Checklist
- [ ] Run `deno task validate` (server + client tests) after each clustered change set.
- [ ] Capture manual QA steps: add multiple side quests, toggle their states, start/complete main quests while selected, resize window, and drag cards across columns.
- [ ] Confirm no regressions in backups, keyboard shortcuts, or accessibility from the prior overhaul plan.
- [ ] Prepare release notes summarizing the visual changes, improved drag feel, and data synchronization fixes.

## Story 8 · Framer Motion & Animated Component Adoption
- [ ] Inventory existing UI elements (modals, button groups, progress indicators) that still rely on ad-hoc CSS transitions and flag candidates for Framer Motion conversion.
- [ ] Create reusable motion components (e.g., `AnimatedQuestCard`, `SideQuestEntrance`, `QuestActionBar`) that encapsulate variants, spring settings, and theme tokens.
- [ ] Ensure new motion wrappers stay tree-shakeable and don’t regress performance; measure bundle deltas after each adoption.
- [ ] Document patterns for composing Framer Motion with the quest board context so future contributors can animate features without rewriting data flows.
