# Quest Tracker: Project Overview

## 1. What It Is

Quest Tracker is a full-stack web application that gamifies task management. It turns tasks into "quests" with RPG elements like XP, levels, and stats to make productivity engaging. It's currently a single-user prototype with a clear path for expansion. The UI has a fun, retro-arcade theme.

## 2. Key Features

- **Task Management:** Create quests and sub-tasks (side-quests) with statuses (`todo`, `in_progress`, `done`), priorities, and due dates.
- **Gamification:** Earn XP, level up, and receive daily rewards. Quests can be grouped into "Campaigns."
- **RPG-style Backend:** The backend manages player stats (level, XP, HP, etc.), and calculates rewards.
- **UI/UX:** A responsive React frontend with a retro theme, animations (`framer-motion`), and sound effects. A component showcase is available at `/showcase`.
- **API:** A TypeScript/Node.js/Express backend provides a RESTful API with JWT authentication. Data is stored in JSON files.

## 3. The Roadmap: Planned Improvements

The project has a well-defined roadmap focused on modernization and user experience.

- **Frontend Overhaul:** A major initiative to refactor the frontend for better performance and maintainability.
  - **New Tech:** Migrating to `framer-motion` for animations and `zustand` for state management.
  - **UI Polish:** A visual refresh of the quest cards and overall layout.
- **Registration & UX:** Enhancing the user registration flow with real-time validation and a better mobile experience.
- **Scalability:** Migrating from JSON file storage to a database (e.g., SQLite, MongoDB).
- **API & Tooling:** Generating OpenAPI/Swagger documentation for the API.

## 4. Tech Stack

**Frontend (`client/`):**
- **Framework:** React
- **State Management:** `zustand`
- **Animations:** `framer-motion`
- **Styling:** CSS with a custom theming system

**Backend (`server/`):**
- **Runtime/Framework:** Node.js with Express
- **Language:** TypeScript
- **Authentication:** JWT (`jsonwebtoken`, `bcryptjs`)
- **Validation:** `zod`

## 5. Data Model & Architecture

- **Core Entities:**
  - **`User`:** Stores user credentials and their RPG stats (`level`, `xp`, `inventory`).
  - **`TaskRecord` (Quest):** The main task unit. Contains a description, status, priority, and an array of `SubTask` objects.
  - **`SubTask` (Side-Quest):** A smaller part of a `TaskRecord`.
  - **`Campaign`:** A collection of related `TaskRecord`s.
- **Architecture:**
  - **Client-Server Monorepo:** A standard separation of frontend and backend concerns.
  - **File-Based Persistence:** The backend uses `tasks.json`, `users.json`, and `campaigns.json` to store data. This is a key area for future improvement.
  - **Hook-Driven Frontend:** The React code is structured around custom hooks, with a plan to refactor them into more granular, reusable pieces.
  - **Planning-Oriented:** The project's direction is guided by detailed markdown planning documents.
- **Development:**
  - The project can be started easily with `./start-dev.sh`.
  - The backend includes a suite of tests and debug endpoints for seeding data and testing RPG mechanics.
  - Code quality is enforced through linting and type-checking scripts.