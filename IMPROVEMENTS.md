# Quest Hooks Improvement Notes

- **Split `useQuests` into focused hooks** — The current hook mixes data fetching, keyboard shortcuts, selection state, undo logic, debug utilities, and even JSX render helpers in a single 1K+ line file. Breaking it into domain hooks (e.g., `useQuestData`, `useQuestSelection`, `useQuestDebugTools`) would improve readability, reduce prop drilling, and make targeted testing feasible.
- **Move render helpers out of hooks** — Functions like `renderEditForm` and `renderAddSideQuestForm` return JSX from inside `useQuests`, forcing the hook to re-run when unrelated UI toggles change. Lifting these into memoized components would isolate view logic from state orchestration and shrink the dependency surface of the hook.
- **Batch layout refresh triggers** — Multiple code paths schedule `refreshLayout` with `setTimeout`, which can result in redundant calls when several quest mutations run together (e.g., bulk status changes). Wrapping these in a debounced utility or leveraging `requestAnimationFrame` batching inside `useSmoothDragQuests` would cut unnecessary reflows.
- **Generalize draggable layout** — `SmoothDraggableList` only supports a single column stack today. Extracting the physics layer from layout math would let the board offer responsive multi-column grids (or a denser masonry view) without rewriting drag logic.

---

# Backend TypeScript Migration Plan

## Overview
Migrate the Express backend from JavaScript (CommonJS) to TypeScript to improve type safety, catch API contract mismatches, and leverage modern development tooling. The backend is a manageable size (~24 files) making this an ideal candidate for incremental migration.

## Benefits
- **Type-safe API contracts** — Define interfaces for Quest, Campaign, User, and XP payloads to prevent client/server mismatches
- **Better refactoring confidence** — TypeScript catches breaking changes during complex RPG system enhancements
- **Improved IDE support** — Enhanced autocomplete, inline documentation, and error detection
- **Future-proof architecture** — Align with modern Node.js patterns and potential ESM migration
- **Team consistency** — Match TypeScript usage in Deno tools (`validate.ts`, `backup.ts`)

## Migration Strategy

### Phase 1: Project Setup (1-2 hours)
1. **Install TypeScript dependencies**
   ```bash
   cd server
   npm install --save-dev typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs
   npm install --save-dev @types/jest @types/supertest
   npm install --save-dev ts-node ts-jest
   ```

2. **Create `tsconfig.json`** in `server/` directory:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "commonjs",
       "lib": ["ES2022"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "moduleResolution": "node",
       "types": ["node", "jest"]
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "__tests__"]
   }
   ```

3. **Update package.json scripts**:
   ```json
   "scripts": {
     "build": "tsc",
     "start": "node dist/server.js",
     "dev": "ts-node src/server.ts",
     "test": "jest --runInBand"
   }
   ```

4. **Configure Jest for TypeScript** — Update `jest.config.js`:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     roots: ['<rootDir>/__tests__'],
     testMatch: ['**/*.test.ts'],
     moduleFileExtensions: ['ts', 'js', 'json']
   };
   ```

### Phase 2: Folder Restructuring (30 minutes)
Move all source files into `server/src/` to match TypeScript conventions:
```
server/
  src/
    server.ts
    app.ts
    config.ts
    routes/
    controllers/
    middleware/
    data/
    rpg/
    utils/
    types/          ← New: shared type definitions
  dist/             ← New: compiled output
  __tests__/        ← Keep separate, migrate later
  tasks.json        ← Keep at root (data files)
  users.json
  campaigns.json
```

### Phase 3: Create Core Type Definitions (1-2 hours)
Create `server/src/types/` directory with shared interfaces:

**`types/quest.types.ts`**:
```typescript
export type QuestUrgency = 'critical' | 'high' | 'medium' | 'low';
export type QuestStatus = 'active' | 'completed';

export interface SideQuest {
  id: string;
  description: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  description: string;
  priority: QuestUrgency;
  level: number;
  status: QuestStatus;
  campaign_id?: string;
  user_id: string;
  side_quests?: SideQuest[];
  created_at?: string;
  completed_at?: string | null;
}
```

**`types/rpg.types.ts`**:
```typescript
export interface XPPayload {
  xp_gained: number;
  level_up: boolean;
  new_level?: number;
  total_xp?: number;
}

export interface PlayerStats {
  id: string;
  username: string;
  level: number;
  xp: number;
  total_quests_completed: number;
  daily_streak: number;
  last_daily_bonus?: string;
}
```

**`types/campaign.types.ts`**:
```typescript
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at?: string;
}
```

**`types/user.types.ts`**:
```typescript
export interface User {
  id: string;
  username: string;
  email?: string;
  password_hash: string;
  level: number;
  xp: number;
  total_quests_completed: number;
  daily_streak: number;
  last_daily_bonus?: string;
  created_at?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}
```

**`types/express.types.ts`**:
```typescript
import { Request } from 'express';
import { User } from './user.types';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}
```

### Phase 4: Incremental File Migration (2-3 days)
Migrate files in dependency order, renaming `.js` → `.ts`:

**Day 1: Utilities and Data Layer**
1. `utils/http.ts` — Simple HTTP utilities
2. `data/filePaths.ts` — Path configurations
3. `data/taskStore.ts` — Add `Quest` types to CRUD operations
4. `data/userStore.ts` — Add `User` types
5. `data/campaignStore.ts` — Add `Campaign` types
6. `rpg/experience.ts` — Add `XPPayload` return types

**Day 2: Middleware and Controllers**
1. `middleware/auth.ts` — Type `AuthenticatedRequest`
2. `controllers/rpgController.ts` — Type XP calculation functions
3. `controllers/tasksController.ts` — Type Quest handlers
4. `controllers/usersController.ts` — Type User handlers
5. `controllers/campaignsController.ts` — Type Campaign handlers
6. `controllers/debugController.ts` — Type debug utilities

**Day 3: Routes and App**
1. `routes/rpg.ts` — Apply `AuthenticatedRequest` types
2. `routes/tasks.ts`
3. `routes/users.ts`
4. `routes/campaigns.ts`
5. `routes/debug.ts`
6. `app.ts` — Main Express app configuration
7. `server.ts` — Entry point
8. `config.ts` — Configuration types

### Phase 5: Test Migration (1 day)
1. Rename `__tests__/api.test.js` → `api.test.ts`
2. Rename `__tests__/campaigns.test.js` → `campaigns.test.ts`
3. Add type annotations to test fixtures and assertions
4. Update Supertest calls with typed responses

### Phase 6: Validation and Cleanup (2-3 hours)
1. Run `npm run build` — Fix any TypeScript compilation errors
2. Run `npm test` — Ensure all tests pass
3. Update `start-dev.sh` to run `npm run dev` for TypeScript
4. Update `tools/validate.ts` to compile TypeScript before testing
5. Update documentation in `server/README.md` and root `README.md`
6. Remove old `.js` files after confirming `.ts` versions work

## Migration Example: A Simple File

**Before (`rpg/experience.js`)**:
```javascript
function calculateXpReward(level) {
  const baseXp = 10;
  const levelMultiplier = 1.5;
  return Math.floor(baseXp * Math.pow(levelMultiplier, level - 1));
}

module.exports = { calculateXpReward };
```

**After (`rpg/experience.ts`)**:
```typescript
export function calculateXpReward(level: number): number {
  const baseXp = 10;
  const levelMultiplier = 1.5;
  return Math.floor(baseXp * Math.pow(levelMultiplier, level - 1));
}
```

## Rollout Strategy
- **Feature branch**: Create `feature/typescript-migration` branch
- **Incremental PRs**: Submit separate PRs for each phase to keep reviews manageable
- **Parallel development**: Keep main branch working in JS while migration progresses
- **Cutover**: Merge complete TypeScript backend once all tests pass and validation succeeds

## Future Enhancements (Post-Migration)
- Consider ESM modules (`"type": "module"`) for modern Node.js patterns
- Add runtime validation with Zod or io-ts for API request/response schemas
- Implement strict null checks and enable stricter compiler options
- Generate OpenAPI/Swagger docs from TypeScript types
- Add `tsc --watch` mode for development hot-reloading

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
