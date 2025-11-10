# Backend Todos

## ✅ Completed
- [x] Email validation endpoint: add `POST /api/users/validate-email` for RFC-compliant email validation to back optional email field checks. Implemented in `server/src/controllers/usersController.ts` with schema support in `server/src/validation/schemas/auth.ts`.
- [x] Rate limiting: enforce a cap of 5 registration attempts per IP per hour to mitigate abuse. Implemented via `server/src/security/registrationRateLimiter.ts` and applied in `server/src/controllers/usersController.ts`.
- [x] Reserved usernames: maintain and enforce a blacklist covering reserved words, admin terms, and system accounts. Backed by `server/src/security/reservedUsernames.ts`, used by availability checks and registration.
- [x] Validation coverage: expand Zod schemas across controllers and responses, keeping error mapping consistent with current API expectations. Added schemas for campaigns (`server/src/validation/schemas/campaigns.ts`), debug seeds, and RPG adjustments, wiring them through the respective controllers.
- [x] TypeScript watch mode: added `npm run watch` wrapper around `tsc --watch` for incremental rebuilds (`server/package.json`, documented in `server/README.md`).
- [x] Legacy artifacts cleanup: removed obsolete `dist/src` assets now that the TypeScript build targets `dist/` directly, keeping the deploy bundle lean.
- [x] Experience module refactor: split the monolithic `rpg/experience` helpers into `experienceEngine`, `rewardTables`, and `eventHooks`, introduced shared XP types, and refreshed imports/tests to align.
- [x] Remaining `any` usages: tightened the dynamic listen patch to use explicit tuple helpers and `unknown`-based callbacks, eliminating wildcard typings.

## 🚧 In Progress / Next Up
- [x] API documentation: generate OpenAPI/Swagger definitions from existing TypeScript types to document the API surface (now reflects registration endpoint responses).
- [x] Compiler strictness: enable strict null checks and other TypeScript compiler safeguards for the backend codebase.
- [x] Module format migration: evaluate enabling `"type": "module"` for the API to align with modern Node.js patterns.
