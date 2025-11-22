# Implementation Plan: Campaign Storylines

## Overview
Add narrative storylines to campaigns with daily updates, quest log, and typewriter text effects. Start with classic fantasy theme, but architect for future flexibility.

---

## Phase 1: Data Model & Backend Foundation

### 1.1 New Data Entity: `Storyline`

**File:** `server/src/types/storyline.ts`

```typescript
interface Storyline {
  id: string;
  campaignId: string;
  theme: 'fantasy' | 'scifi' | 'mystery'; // extensible
  
  // Narrative State (for LLM context)
  narrativeState: {
    chapter: number;
    currentObjective: string;
    summary: string;
    characters: string[];
    locations: string[];
    keyPlotPoints: string[];
    progressPercentage: number; // based on campaign completion
  };
  
  // Story History (for quest log display)
  updates: StoryUpdate[];
  
  // Metadata
  createdAt: string;
  lastGeneratedAt: string;
  lastVisitDate: string;
  generationFailures: number; // track consecutive failures
}

interface StoryUpdate {
  id: string;
  type: 'intro' | 'daily' | 'completion' | 'reflection'; // extensible
  text: string;
  generatedAt: string;
  tasksCompleted: string[]; // task IDs referenced in this update
}
```

### 1.2 Update Campaign Model

**File:** `server/src/types/campaign.ts`

```typescript
interface Campaign {
  // ... existing fields
  storylineId?: string; // optional - campaigns can exist without storylines
}
```

### 1.3 Data Storage

**New file:** `server/data/storylines.json`

Initialize as empty array, managed similar to tasks/campaigns.

---

## Phase 2: Backend API & Generation Logic

### 2.1 Storyline Service

**File:** `server/src/services/storyline.service.ts`

Key methods:
- `createStoryline(campaignId, userId)` - **Automatically called** when campaign is created
- `checkAndGenerateUpdate(storylineId, userId)` - Called on campaign load
- `getStoryline(storylineId)` - Fetch for display
- `generateStoryUpdate(storyline, updateType, context)` - Core generation logic
- `deleteStoryline(storylineId)` - **Cascade delete** when campaign is deleted

### 2.2 Campaign Lifecycle Integration

**Campaign Creation:**
- When a new campaign is created, automatically create an associated storyline
- `POST /api/campaigns` should call `storylineService.createStoryline()` after campaign creation
- Generate intro update immediately (or queue for async generation)

**Campaign Deletion:**
- When a campaign is deleted, cascade delete its storyline
- `DELETE /api/campaigns/:id` should call `storylineService.deleteStoryline()`
- Removes storyline and all associated updates from storage

### 2.3 Generation Flow

```
Frontend loads campaign
  → Calls GET /api/storylines/:campaignId/check-update
    → Backend checks lastVisitDate
      → If new day needed:
        - Set generating flag
        - Call generateStoryUpdate() async
        - Return { status: 'generating', lastUpdate: {...} }
      → If up to date:
        - Return { status: 'current', updates: [...] }
```

### 2.4 API Endpoints

**File:** `server/src/routes/storyline.routes.ts`

```
POST   /api/storylines/create          - Create storyline for campaign
GET    /api/storylines/:campaignId     - Get storyline data
GET    /api/storylines/:campaignId/check-update  - Check/trigger daily update
GET    /api/storylines/:id/updates     - Get all updates (quest log)
```

### 2.5 Claude Integration

**File:** `server/src/services/ai/claude.service.ts`

**Core functionality:**
- Use Anthropic SDK (`@anthropic-ai/sdk`)
- Configurable model (claude-sonnet-4-20250514)
- Retry logic (3 attempts with exponential backoff)
- Error handling with fallback generic text
- Response validation (ensure text is generated)

**Configuration:**
- API key stored in `.env` file: `ANTHROPIC_API_KEY=sk-ant-...`
- Model and temperature configurable via `storyline.config.ts`
- Timeout: 30 seconds per generation

**Security:**
- Input sanitization for all user-provided content (campaign names, task descriptions)
- Strip/escape any potential prompt injection attempts
- Validate input lengths before sending to Claude

**Rate Limiting:**
- Track generation requests per user
- Limit: Maximum 10 storyline generations per user per day (configurable)
- Limit: Maximum 5 active campaigns with storylines per user
- Store rate limit data in memory (or Redis for production)
- Return 429 status code when limits exceeded

### 2.6 Narrative State Extraction

After generating story text, we need to extract/update structured narrative state. This is done via a **second Claude API call** with structured output.

**File:** `server/src/services/ai/narrative-extractor.service.ts`

**Process:**
1. After story text is generated, make a second call to Claude
2. Use a smaller/cheaper model (e.g., `claude-haiku-4-20250514`) for cost efficiency
3. Provide the generated story text + previous narrative state
4. Request structured JSON output with specific fields

**Extraction Prompt Template:**
```
Given this story update and previous narrative state, extract the following information as JSON:

Story Text:
{{storyText}}

Previous State:
{{previousNarrativeState}}

Extract:
{
  "summary": "2-3 sentence summary of the story so far",
  "currentObjective": "The hero's current main goal",
  "chapter": number (increment if major milestone reached),
  "characters": ["list", "of", "character", "names"],
  "locations": ["list", "of", "locations"],
  "keyPlotPoints": ["important", "events", "that", "happened"]
}

Return ONLY valid JSON, no other text.
```

**Cost Optimization:**
- Consider batching multiple storyline extractions in one call (if processing multiple campaigns)
- Cache extraction results to avoid re-processing
- Use Haiku model for extraction (cheaper, sufficient for structured tasks)

---

## Phase 3: Prompt System

### 3.1 Prompt Structure

**Directory:** `server/src/prompts/`

```
prompts/
  fantasy/
    intro.txt
    daily-update-1.txt
    daily-update-2.txt
    daily-update-3.txt
    reflection.txt
    completion.txt
  _shared/
    system.txt
  config.json
```

### 3.2 Template System

Use simple template strings with variable injection:

```typescript
// server/src/services/prompt.service.ts
class PromptService {
  loadTemplate(theme: string, type: string): string;
  injectVariables(template: string, variables: Record<string, any>): string;
  getRandomVariant(theme: string, type: 'daily-update'): string;
}
```

Variables available:
- `{{userName}}`
- `{{userLevel}}`
- `{{userClass}}`
- `{{campaignName}}`
- `{{tasksSummary}}`
- `{{narrativeSummary}}`
- `{{currentObjective}}`
- `{{recentUpdates}}` (last 3)
- etc.

### 3.3 Example Prompt Template

**File:** `server/src/prompts/fantasy/intro.txt`

```
You are a fantasy storyteller creating an epic adventure.

Campaign: {{campaignName}}
Hero: {{userName}}, Level {{userLevel}} {{userClass}}

Upcoming Quests:
{{tasksSummary}}

Create an engaging story introduction (200-300 words) that:
- Sets the scene and establishes the adventure's tone
- Incorporates the hero's name and background
- References the upcoming quests naturally
- Ends with a clear call to action

Style: Classic fantasy RPG (Dragon Quest, Final Fantasy)
Tone: Heroic and adventurous
```

---

## Phase 4: Frontend - State Management

### 4.1 Storyline Store

**File:** `client/src/stores/storylineStore.ts`

```typescript
interface StorylineState {
  storylines: Record<string, Storyline>;
  currentStoryline: Storyline | null;
  isGenerating: boolean;
  hasNewUpdate: boolean;
  error: string | null;
  
  // Actions
  fetchStoryline: (campaignId: string) => Promise<void>;
  checkForUpdate: (campaignId: string) => Promise<void>;
  markUpdateAsRead: () => void;
}
```

### 4.2 Integration with Campaign Store

Campaign store should:
- Trigger `checkForUpdate()` when campaign is loaded
- Display notification badge if `hasNewUpdate === true`

---

## Phase 5: Frontend - UI Components

### 5.1 Core Components

**TypewriterText Component**
```
client/src/components/story/TypewriterText.tsx
```
- Character-by-character animation
- Configurable speed (default: 30ms per char)
- Skip button to show full text immediately
- Pause on punctuation (.,!?) for natural rhythm

**StoryUpdateModal**
```
client/src/components/story/StoryUpdateModal.tsx
```
- Shows new daily update with typewriter effect
- "Continue" button to advance through paragraphs
- Stores completion state in local storage

**QuestLog**
```
client/src/components/story/QuestLog.tsx
```
- Timeline view of all story updates
- Grouped by date
- Click to expand full text
- Scroll to latest

### 5.2 Campaign Page Redesign

**From:** Collapsible side panel
**To:** Full page with tabs/sections

```
Campaign Page
├─ Header (campaign name, progress)
├─ Tabs
│  ├─ Quests (existing task list)
│  ├─ Story (new - quest log view)
│  └─ Settings
└─ Notification badge on Story tab when hasNewUpdate
```

### 5.3 User Flow

```
1. User opens campaign
   → checkForUpdate() called
   → If generating: show subtle loading indicator
   → If new update ready: show notification badge

2. User clicks Story tab or notification
   → StoryUpdateModal appears
   → Typewriter effect displays update
   → User clicks "Continue" through paragraphs
   → Modal closes, badge cleared

3. User can revisit QuestLog anytime
   → See full history
   → Scroll through timeline
```

---

## Phase 6: Generation Logic Details

### 6.1 Determining Update Type

```typescript
function determineUpdateType(storyline: Storyline, user: User): UpdateType {
  const today = new Date().toDateString();
  const lastVisit = new Date(storyline.lastVisitDate).toDateString();
  
  // First visit ever
  if (!storyline.updates.length) return 'intro';
  
  // Campaign completed
  if (storyline.narrativeState.progressPercentage >= 100) {
    return 'completion';
  }
  
  // Same day, already generated
  if (today === lastVisit) return null;
  
  // New day, check for completed tasks since last visit
  const tasksCompletedSinceLastVisit = getCompletedTasksSince(
    storyline.campaignId, 
    storyline.lastVisitDate
  );
  
  if (tasksCompletedSinceLastVisit.length > 0) {
    return 'daily'; // with task progress
  } else {
    return 'reflection'; // no progress, motivational
  }
}
```

### 6.2 Context Building

**Important:** Daily updates group **all tasks completed since the last visit** into a single narrative update per campaign. We do not generate one update per task - instead, we collect all completions and create one cohesive story segment.

```typescript
function buildGenerationContext(
  storyline: Storyline,
  campaign: Campaign,
  user: User,
  recentTasks: Task[]
): GenerationContext {
  // Helper to extract subtasks from tasks
  const getAllSubtasks = (tasks: Task[]) => {
    return tasks.flatMap(t => t.subtasks || []);
  };
  
  return {
    userName: user.name,
    userLevel: user.stats.level,
    userClass: user.stats.class,
    campaignName: campaign.name,
    campaignDescription: campaign.description,
    
    // Narrative continuity
    narrativeSummary: storyline.narrativeState.summary,
    currentObjective: storyline.narrativeState.currentObjective,
    currentChapter: storyline.narrativeState.chapter,
    characters: storyline.narrativeState.characters.join(', '),
    locations: storyline.narrativeState.locations.join(', '),
    
    // Recent context (last 3 updates)
    recentUpdates: storyline.updates.slice(-3).map(u => u.text).join('\n\n'),
    
    // Current progress (includes main tasks AND subtasks)
    tasksCompleted: recentTasks
      .filter(t => t.status === 'done')
      .map(t => ({
        task: t.description,
        subtasks: getAllSubtasks([t]).filter(st => st.status === 'done')
      })),
    tasksInProgress: recentTasks
      .filter(t => t.status === 'in_progress')
      .map(t => t.description),
    tasksUpcoming: recentTasks
      .filter(t => t.status === 'todo')
      .map(t => t.description),
    
    progressPercentage: storyline.narrativeState.progressPercentage
  };
}
```

### 6.3 Input Validation

Before building context or sending to Claude, validate all user input:

```typescript
function validateInputs(campaign: Campaign, tasks: Task[]): void {
  const MAX_NAME_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 1000;
  
  // Validate campaign
  if (campaign.name.length > MAX_NAME_LENGTH) {
    throw new ValidationError('Campaign name too long');
  }
  if (campaign.description?.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError('Campaign description too long');
  }
  
  // Validate tasks and subtasks
  tasks.forEach(task => {
    if (task.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError('Task description too long');
    }
    
    task.subtasks?.forEach(subtask => {
      if (subtask.description.length > MAX_DESCRIPTION_LENGTH) {
        throw new ValidationError('Subtask description too long');
      }
    });
  });
  
  // Sanitize for prompt injection
  sanitizeForPrompt(campaign.name);
  sanitizeForPrompt(campaign.description);
  tasks.forEach(t => {
    sanitizeForPrompt(t.description);
    t.subtasks?.forEach(st => sanitizeForPrompt(st.description));
  });
}

function sanitizeForPrompt(text: string): string {
  // Remove or escape potential injection patterns
  return text
    .replace(/\{\{/g, '') // Remove template markers
    .replace(/\}\}/g, '')
    .replace(/<prompt>/gi, '') // Remove XML-like tags
    .replace(/<\/prompt>/gi, '')
    .trim();
}
```

### 6.4 Post-Generation Processing

After Claude returns story text:

1. **Save full text** to new `StoryUpdate` with timestamp and referenced task IDs
2. **Extract narrative state** using the Narrative Extractor Service (section 2.6):
   - Call `narrativeExtractor.extractState(storyText, previousState)`
   - Receives structured JSON with updated summary, objective, chapter, characters, locations
   - Uses Claude Haiku for cost efficiency
3. **Update storyline metadata:**
   - `lastGeneratedAt` = current timestamp
   - `lastVisitDate` = current date
   - `generationFailures` = 0 (reset on success)
4. **Persist to storage** (`storylines.json`)

---

## Phase 7: Polish & Future-Proofing

### 7.1 Error Handling

- **Generation failures:** Store count, after 3 consecutive failures, disable auto-generation and notify user
- **API timeouts:** 30 second timeout, show generic fallback
- **Invalid responses:** Validate Claude output, retry if malformed

### 7.2 Configuration

**File:** `server/src/config/storyline.config.ts`

```typescript
export const storylineConfig = {
  claude: {
    model: 'claude-sonnet-4-20250514',
    extractorModel: 'claude-haiku-4-20250514', // cheaper model for extraction
    maxTokens: 1000,
    temperature: 0.8,
  },
  generation: {
    retryAttempts: 3,
    timeoutMs: 30000,
    maxHistoryUpdates: 3, // how many past updates to include in context
  },
  rateLimits: {
    maxGenerationsPerDay: 10, // per user
    maxActiveCampaignsWithStorylines: 5, // per user
  },
  validation: {
    maxCampaignNameLength: 200,
    maxDescriptionLength: 1000,
    maxTaskDescriptionLength: 1000,
  },
  themes: {
    fantasy: {
      defaultTone: 'heroic',
      systemPromptFile: 'fantasy/system.txt',
    },
    // future themes here
  },
};
```

### 7.3 Extensibility Points

**For future features:**
- Add new `updateType` values (e.g., 'decision', 'event', 'unlock')
- Add `InteractiveDecision` type with choices array
- Add `unlockables: { images: [], glyphs: [] }` to narrative state
- Theme system is already in place for non-fantasy campaigns

---

## Implementation Order

### Sprint 1: Backend Foundation
1. Create `Storyline` data model
2. Add `storylineId` to Campaign model
3. Create storyline service with basic CRUD
4. **Hook storyline creation into campaign creation endpoint**
5. **Hook storyline deletion into campaign deletion endpoint**
6. Set up Claude API integration (SDK, `.env` config)
7. Create prompt template system
8. **Implement rate limiting middleware** (generation limits per user/day)

### Sprint 2: Generation Logic
1. **Implement input validation and sanitization** (length checks, prompt injection prevention)
2. Implement `checkAndGenerateUpdate()` with update type determination
3. Build context generation (including subtasks)
4. **Create Narrative Extractor Service** (structured state extraction with Haiku)
5. Create fantasy prompt templates (intro, daily, reflection, completion)
6. Test generation flow with real campaigns
7. Add error handling and retry logic
8. **Test narrative state extraction accuracy**

### Sprint 3: Frontend State & API
1. Create `useStorylineStore`
2. Add API client methods
3. Integrate with campaign loading flow
4. Add notification system

### Sprint 4: UI Components
1. Build `TypewriterText` component
2. Build `StoryUpdateModal`
3. Build `QuestLog` component
4. Redesign Campaign page with tabs
5. Wire everything together

### Sprint 5: Polish & Testing
1. Fine-tune prompts based on testing
2. Optimize typewriter timing/UX
3. Add loading states and transitions
4. Test full user journey
5. Document the system

---

## Testing Strategy

- **Unit tests:** 
  - Prompt template injection and variable replacement
  - Update type determination logic
  - Input validation and sanitization functions
  - Rate limiting logic
- **Integration tests:** 
  - Full generation flow with mocked Claude
  - Narrative extraction service with sample outputs
  - Campaign creation → storyline creation hook
  - Campaign deletion → storyline deletion cascade
- **Security tests:**
  - Prompt injection attempts (malicious campaign/task names)
  - Length validation enforcement
  - Rate limit enforcement
- **Manual testing:** 
  - Multiple campaigns with different themes/progress levels
  - Complete 10+ tasks in one day, verify single grouped update
  - Test with and without subtasks
  - Verify narrative state extraction accuracy (characters, locations, objectives)
- **Prompt testing:** 
  - Generate 20+ storylines, review for quality/consistency
  - Test reflection updates (no task completion)
  - Test completion updates (100% progress)
  - Verify narrative continuity across multiple updates

---

## Success Metrics (for future)

- % of users who enable storylines on new campaigns
- Daily active users viewing quest log
- Average time spent on Story tab
- User feedback on narrative quality

---

## Risks & Mitigation

### Technical Risks:
1. **Narrative state extraction failures**
   - Risk: Claude might not return valid JSON or miss key elements
   - Mitigation: Strict validation, retry logic, fallback to previous state if extraction fails
   
2. **File I/O bottlenecks**
   - Risk: `storylines.json` grows large with 100+ updates per campaign
   - Mitigation: Plan database migration for production; acceptable for local dev/prototype
   
3. **Generation cost explosion**
   - Risk: Users spam campaign creation or abuse system
   - Mitigation: Rate limiting (10/day), max 5 active campaigns, input validation

4. **Prompt injection vulnerabilities**
   - Risk: Malicious task names could manipulate story generation
   - Mitigation: Sanitization function removes template markers and suspicious patterns

5. **Inconsistent narrative quality**
   - Risk: Story becomes repetitive or loses coherence over time
   - Mitigation: Include narrative state in context, test extensively, tune prompts iteratively

### UX Risks:
1. **Generation latency**
   - Risk: 5-10 second wait frustrates users
   - Mitigation: Show previous update while generating, add loading states, async processing

2. **Typewriter effect too slow/fast**
   - Risk: Users skip or get impatient
   - Mitigation: Configurable speed (future), skip button, pause on punctuation for rhythm

### Future Architecture Risks:
1. **File-based storage limits scalability**
   - Risk: Hard to transition to multi-user production
   - Mitigation: Already planning database migration; keep data structure compatible

2. **No undo for generated stories**
   - Risk: If user dislikes a story, can't regenerate
   - Mitigation: Out of scope for V1; consider "regenerate" button in future

---

## Notes from Planning Session

### Key Decisions Made:
1. **Storyline as separate entity** - Not nested in Campaign, allows future flexibility
2. **One storyline per campaign initially** - Keep it simple, expand later if needed
3. **Automatic storyline creation** - Every new campaign gets a storyline, no opt-in/opt-out for V1
4. **Cascade delete** - When campaign is deleted, storyline is deleted too
5. **Async generation without queue** - Start simple, add proper queue system when moving to database
6. **Prompt templates in folders** - Organized by theme with variable injection
7. **Separate zustand store** - `useStorylineStore` for clean separation of concerns
8. **Full campaign page redesign** - Move from collapsible panel to tabbed interface
9. **Typewriter effect is core** - Not polish, essential to the experience
10. **Daily updates group all completed tasks** - One narrative update per day per campaign, not one per task
11. **Include subtasks in narrative** - Both main tasks and subtasks are referenced in story generation
12. **Two-call generation process** - First call generates story text, second call extracts narrative state
13. **Use Haiku for extraction** - Cost optimization by using cheaper model for structured extraction
14. **Rate limiting built-in** - Prevent abuse with generation limits per user/day
15. **Input validation required** - Length checks and sanitization to prevent prompt injection
16. **No migration needed** - Local dev only, can wipe storage
17. **Mobile not prioritized** - Desktop-first for V1
18. **Notification UX details deferred** - Basic implementation for V1, detailed design later

### Implementation Notes:
- **Environment:** API key in `.env` file (`ANTHROPIC_API_KEY`)
- **Models:** Sonnet 4.5 for generation, Haiku 4.5 for extraction
- **Rate Limits:** 10 generations/day per user, max 5 active storyline campaigns per user
- **Validation:** Campaign names max 200 chars, descriptions max 1000 chars
- **Context:** Last 3 story updates + structured narrative state sent to Claude
- **Batching consideration:** May batch multiple extractions for cost efficiency (future optimization)

### Future Possibilities (Out of Scope for V1):
- User settings/preferences (typewriter speed, update frequency)
- Opt-in/opt-out for storylines
- Pause/resume storylines
- Retroactively add storylines to existing campaigns
- Interactive decisions ("What do you do?")
- Multiple storylines per campaign
- Storylines that transcend campaigns
- Unlockable images/glyphs
- XP-related story events
- Non-fantasy themes (sci-fi, mystery, etc.)
- Sound effects on story updates
- Advanced notification UX (toasts, animations)
- Mobile optimization
