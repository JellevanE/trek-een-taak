# Quest Tracker: Project Overview

## 1. What It Is

Quest Tracker is a full-stack web application that gamifies task management. It turns tasks into "quests" with RPG elements like XP, levels, and stats to make productivity engaging. It's a small multi-user app (JWT auth, per-user data) with a fun, retro-arcade theme, deployed publicly as a portfolio/demo. It is **not** multi-tenant SaaS — severities and scaling choices are calibrated to a handful of users.

## 2. Key Features

- **Task Management:** Create quests and sub-tasks (side-quests) with statuses (`todo`, `in_progress`, `done`), priorities, and due dates.
- **Gamification:** Earn XP, level up, streaks, and daily rewards, all computed server-side. Quests are grouped into "Campaigns."
- **Campaign Storylines:** Each campaign gets an AI-generated narrative (LangChain + Claude) that grows as quests are completed — intro, daily updates, reflections, and a completion arc, revealed with a typewriter effect. See `docs/storylines.md`.
- **RPG-style Backend:** The backend manages player stats (level, XP, HP, etc.) and calculates rewards; responses carry an `rpg` payload so the client stays in sync without polling.
- **UI/UX:** A responsive React frontend with a retro theme, Framer Motion animations, sound effects, and drag-and-drop quest reordering. A component showcase is available at `/showcase` and a theme preview at `/themes` (both lazy-loaded, dev-facing).
- **API:** A TypeScript/Node.js/Express backend provides a RESTful API with JWT authentication, per-IP/per-user rate limiting, and helmet security headers. Data is stored in flat JSON files (atomic write-temp-then-rename).
- **Admin/Debug:** Debug tooling and an admin stats endpoint are gated behind `ADMIN_USERNAMES` and compiled out of the production client build. See `docs/superpowers/specs/2026-06-08-debug-gating-and-admin-stats-design.md`.
- **MCP Server:** An MCP server (`mcp/`) exposes campaigns, quests, and sub-quests as tools for use from Claude.

## 3. The Roadmap: Planned Improvements

- **Scalability — database migration:** Move from JSON file storage to SQLite (`better-sqlite3`) behind a thin repository layer to fix read-modify-write races and non-atomic multi-file writes. Tracked in `docs/PRE-DEPLOY-REVIEW.md` §C; a persistent disk (already provisioned) is the prerequisite.
- **CRA → Vite:** Proposal to replace the unmaintained Create React App toolchain with Vite/Vitest. See `docs/CRA-TO-VITE.md`. Not urgent (the audit findings are build-time only).
- **Storyline Phase 3:** 4am scheduled batch-generation endpoint (depends on the persistent-process hosting decision). See `docs/storylines.md`.
- **Registration & UX polish, quest-board accessibility, and other follow-ups:** Remaining open items tracked in `docs/IMPROVEMENTS.md`.

## 4. Tech Stack

**Frontend (`client/`):**

- **Framework:** React 19 (Create React App)
- **State Management:** Purpose-built custom hooks per domain; Zustand for two cross-cutting stores (`questBoardStore`, `storylineStore`)
- **Animations / Drag:** Framer Motion, `@dnd-kit`
- **Styling:** CSS with a custom theming system (design tokens in `tokens.css`)

**Backend (`server/`):**

- **Runtime/Framework:** Node.js with Express 5
- **Language:** TypeScript (ESM, `"type": "module"`); dev via `tsx watch`, prod via compiled `dist/`
- **Authentication:** JWT (`jsonwebtoken`, `bcryptjs`)
- **Validation:** `zod`
- **AI:** LangChain + Anthropic Claude (Sonnet for story text, Haiku for narrative-state extraction)
- **Security:** `helmet`, CORS allowlist, in-memory rate limiters (login, registration, AI generation)

**Tooling (`tools/`):** Deno scripts for validation and backups (`deno task validate`, `deno task backup`).

## 5. Data Model & Architecture

- **Core Entities:**
  - **`User`:** Stores user credentials and their RPG stats (`level`, `xp`, `inventory`).
  - **`TaskRecord` (Quest):** The main task unit. Contains a description, status, priority, and an array of `SubTask` objects.
  - **`SubTask` (Side-Quest):** A smaller part of a `TaskRecord`.
  - **`Campaign`:** A collection of related `TaskRecord`s.
  - **`Storyline`:** A separate entity linked to a campaign by `campaignId`, holding the narrative state and the AI-generated update history.
- **Architecture:**
  - **Client-Server Monorepo:** Two independent Node projects. In dev, the client proxies `/api/*` to the server on `:4001`.
  - **Single-Service Deploy:** In production the Express server serves both the API and the compiled client bundle (`express.static` + SPA fallback). See `docs/DEPLOY-RENDER.md`.
  - **File-Based Persistence:** Four flat JSON stores (`tasks.json`, `users.json`, `campaigns.json`, `storylines.json`), read/written synchronously per request with atomic writes. File paths resolve via env overrides (`TASKS_FILE`, etc.) so tests inject isolated fixtures. This is the main area targeted for the SQLite migration.
  - **Hook-Driven Frontend:** A large `App.js` delegates to domain hooks; features with sub-components live under `src/features/`.
- **Development:**
  - Start both services with `./start-dev.sh` (server on `:4001`, client on `:4000`).
  - `deno task validate` runs lint + tsc + the server and client test suites.
  - Debug endpoints (admin-gated) seed data and exercise RPG mechanics.
