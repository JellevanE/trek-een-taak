# Sprint 3: Replace Zustand store with useStoryline hook, add notification dot

**Date:** 2026-02-23
**Branch:** feature/sprint-2-storyline-generation
**Message:** Sprint 3: frontend state hook, notification dot, auth fix

## Context

Sprint 2 completed the backend storyline generation. The frontend had a Zustand store (`storylineStore.js`) from Sprint 1 that bypassed the auth pattern used by every other hook: it read tokens from `localStorage`, used a hardcoded `http://localhost:4001` URL instead of the CRA proxy path, and didn't pass `onUnauthorized` to `apiFetch` — so 401 responses silently failed instead of triggering logout.

## Changed files

| File                                                           | Reason                                                                                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/hooks/useStoryline.js`                             | **New** — hook replacing Zustand store, follows `useCampaigns` pattern                                                                   |
| `client/src/hooks/useQuestBoard.js`                            | Rewired from Zustand import to `useStoryline` hook; exports `markStorylineAsRead`                                                        |
| `client/src/store/storylineStore.js`                           | **Deleted** — no remaining imports                                                                                                       |
| `client/src/App.js`                                            | Added `markStorylineAsRead` destructuring; notification dot in collapsed pills and expanded items; wired `onMarkAsRead` to StorylineCard |
| `client/src/styles/campaigns.css`                              | Added `position: relative` to `.campaign-pill`; new `.storyline-dot` styles with pulse animation                                         |
| `client/src/features/quest-board/components/StorylineCard.jsx` | Added `onMarkAsRead` prop; called on "Show History" expand and "Check for Updates" click                                                 |
| `storylines-implementation-plan.md`                            | Added Sprint 3 decision note explaining Zustand-to-hook rationale                                                                        |

## useStoryline.js — design decisions

**Pattern:** Follows `useCampaigns` exactly — receives `{ token, getAuthHeaders, onUnauthorized, pushToast, activeCampaignFilter }`, uses `apiFetch` with `getAuthHeadersUtil(token)` and passes `onUnauthorized` as third arg.

**Relative URLs:** Uses `/api/storylines/${campaignId}` instead of hardcoded `http://localhost:4001/api/...`, so CRA proxy handles routing in dev.

**404 handling:** `fetchStoryline` treats 404 as "no storyline yet" (sets `currentStoryline` to null) instead of throwing an error.

**Auto-fetch effect:** Watches `activeCampaignFilter` — fetches + checks when a campaign is selected, clears state when deselected.

**Logout reset:** Watches `token` — resets all state to defaults when token becomes falsy (matches `useCampaigns` lines 20-25).

## useQuestBoard.js — changes

- Replaced `import { useStorylineStore }` with `import { useStoryline }`
- Replaced Zustand destructuring + `useEffect` (old lines 46-61) with single `useStoryline({...})` call
- Removed `useEffect` from React import (no longer needed in this hook)
- Added `markStorylineAsRead: storylineApi.markUpdateAsRead` to return object

## Notification dot

- `.storyline-dot`: 6px green circle with `box-shadow` glow and a 2s pulse animation
- Collapsed pills: absolute-positioned at top-right corner of `.campaign-pill`
- Expanded items: flex-positioned at right edge of `.campaign-item`
- Shown when `storylineHasUpdate && activeCampaignFilter === campaign.id`
- Cleared when user expands StorylineCard history or clicks "Check for Updates"

## Bugs fixed

1. **Hardcoded URL** — `http://localhost:4001/api/...` → relative `/api/` paths via CRA proxy
2. **Direct localStorage reads** — `getToken()` from localStorage → token passed via hook props
3. **Missing onUnauthorized** — `apiFetch` calls had no 401 handler → now triggers logout
4. **404 as error** — missing storyline threw to error state → now returns null gracefully
