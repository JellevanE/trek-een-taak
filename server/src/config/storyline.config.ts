export const storylineConfig = {
    claude: {
        model: 'claude-sonnet-4-6', // story text
        extractorModel: 'claude-haiku-4-5-20251001', // narrative state extraction
        maxTokens: 1000,
        temperature: 0.8,
    },
    generation: {
        retryAttempts: 3,
        timeoutMs: 30000,
        maxHistoryUpdates: 3,
    },
    rateLimits: {
        // Per-user/day generation budget is the primary cost guard.
        // The old maxActiveCampaignsWithStorylines cap was dropped: with lazy
        // intro generation, an unopened storyline costs nothing.
        maxGenerationsPerDay: 10,
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
    },
};
