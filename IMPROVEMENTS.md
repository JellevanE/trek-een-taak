# Quest Hooks Improvement Notes

- **Split `useQuests` into focused hooks** — The current hook mixes data fetching, keyboard shortcuts, selection state, undo logic, debug utilities, and even JSX render helpers in a single 1K+ line file. Breaking it into domain hooks (e.g., `useQuestData`, `useQuestSelection`, `useQuestDebugTools`) would improve readability, reduce prop drilling, and make targeted testing feasible.
- **Move render helpers out of hooks** — Functions like `renderEditForm` and `renderAddSideQuestForm` return JSX from inside `useQuests`, forcing the hook to re-run when unrelated UI toggles change. Lifting these into memoized components would isolate view logic from state orchestration and shrink the dependency surface of the hook.
- **Batch layout refresh triggers** — Multiple code paths schedule `refreshLayout` with `setTimeout`, which can result in redundant calls when several quest mutations run together (e.g., bulk status changes). Wrapping these in a debounced utility or leveraging `requestAnimationFrame` batching inside `useSmoothDragQuests` would cut unnecessary reflows.
- **Generalize draggable layout** — `SmoothDraggableList` only supports a single column stack today. Extracting the physics layer from layout math would let the board offer responsive multi-column grids (or a denser masonry view) without rewriting drag logic.

## Registration Flow Enhancements

### UX Improvements
- **Real-time username availability check**: Integrate frontend with existing `/api/users/check-username/:username` endpoint with debounced API calls (500ms delay) and visual feedback (✓ available, ✗ taken, ⏳ checking). Show alternative suggestions when username is taken.
- **Enhanced password strength meter**: Expand basic strength indicator with specific improvement suggestions, character requirement checklist (uppercase, lowercase, numbers, special chars), and color-coded feedback beyond weak/good/strong levels.
- **Welcome step**: Add introductory step with app overview, feature highlights with icons, privacy/security assurance, and "Get Started" CTA before account details step.
- **Confirmation step**: Add final step after profile setup with welcome message, profile summary display, next steps guidance, and celebration elements (achievement notification, animated welcome toast).

### Visual & Interaction Polish
- **Avatar picker**: Add visual avatar selection component with grid layout, predefined avatar options, hover effects, selection states, and keyboard navigation support.
- **Clickable progress indicator**: Enable navigation by clicking on completed steps (if validation passed) to improve wizard flexibility.
- **Animation & transitions**: Implement 300ms ease-in-out slide transitions between steps, 200ms focus highlights, 150ms validation feedback color changes, and 400ms progress bar width animations.
- **Mobile optimization**: Enhance mobile experience (320px-768px) with larger touch targets (min 44px), simplified navigation, condensed progress indicator, and optimized keyboard handling. Add tablet layout (768px-1024px) with two-column forms and side-by-side fields.

### Accessibility Enhancements
- **WCAG 2.1 AA Compliance**: Add comprehensive ARIA labels, roles, and descriptions for all interactive elements. Ensure 4.5:1 color contrast minimum. Implement logical focus management with clear focus indicators and full keyboard navigation support (tab order, escape key handling).
- **Screen reader support**: Add form validation announcements, progress indicator screen reader descriptions, skip links for multi-step navigation, and proper alternative text for all icons and visual feedback.
- **Error handling**: Improve error messages with specific, actionable guidance rather than generic messages. Add descriptive screen reader announcements for validation feedback.

### Backend API Enhancements
- **Email validation endpoint**: Add `POST /api/users/validate-email` endpoint for RFC-compliant email format validation to support optional email field validation.
- **Enhanced password validation**: Enforce stronger password requirements (8+ characters with mixed case, numbers, special characters) on backend beyond current 6-character minimum.
- **Rate limiting**: Implement 5 registration attempts per IP per hour to prevent abuse.
- **Reserved words**: Add username blacklist for reserved words, admin terms, and system usernames.

### Component Refactoring Opportunities
- **FormField component**: Create reusable form input component with built-in validation, error/success message display, and consistent styling to reduce code duplication.
- **ErrorBoundary component**: Add registration-specific error boundary with graceful error handling, user-friendly messages, retry mechanisms, and fallback UI for critical failures.
- **LoadingSpinner component**: Centralize loading state management with consistent indicators, context labels, timeout handling, and cancel buttons for long operations.

### Testing Gaps
- **Unit tests**: Add tests for individual components (RegistrationWizard, AccountDetailsStep, ProfileSetupStep, ProgressIndicator), validation logic, state management, and API integration points.
- **Integration tests**: Test complete registration flow, error handling scenarios, cross-browser compatibility, and mobile device experience.
- **Accessibility tests**: Validate screen reader compatibility, keyboard navigation functionality, color contrast compliance, and focus management behavior.
- **Performance tests**: Measure component render times, API response handling, and behavior with large datasets or slow connections.

### Advanced Features (Future Consideration)
- **Social login integration**: Support for Google, GitHub, or other OAuth providers.
- **Email verification system**: Optional email confirmation workflow for verified accounts.
- **Two-factor authentication**: Add 2FA setup option during or after registration.
- **Registration achievements**: Award special badges or XP bonuses for completing profile setup.
- **Welcome quest tutorial**: Create introductory quest that guides new users through core features.


## Future Enhancements (Post-Migration)
- Consider ESM modules (`"type": "module"`) for modern Node.js patterns
- Expand Zod validation across remaining controllers and responses, and align error mapping with existing API expectations
- Implement strict null checks and enable stricter compiler options
- Generate OpenAPI/Swagger docs from TypeScript types
- Add `tsc --watch` mode for development hot-reloading
- Archive or relocate legacy `dist/src` artifacts once the release freeze ends
- Break `src/rpg/experience.ts` into modules (`experienceEngine`, `rewardTables`, `eventHooks`) after migration; draft steps:
  1. Outline current responsibilities and decide module boundaries.
  2. Create new files with shared types and migrate logic incrementally.
  3. Update imports/tests to reflect the new structure and ensure coverage.
- Audit remaining `any` usages; proposal:
  1. Inventory current `any` locations and document justification per file.
  2. Replace with precise domain types or utility generics where possible.
  3. For unavoidable cases (JSON parsing), wrap with helper functions and comments.

## Estimated Timeline
- **Minimal viable migration**: 3-4 days of focused work
- **Complete with tests and docs**: 5-7 days
- **Per-file average**: 15-30 minutes including testing

## Success Metrics
- ✅ Zero TypeScript compilation errors
- ✅ All existing Jest tests pass
- ✅ `deno task validate` passes
- ✅ No runtime regressions in API behavior
- ✅ Type coverage >90% (no implicit `any` types)
