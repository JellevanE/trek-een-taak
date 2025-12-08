export const storylineConfig = {
    claude: {
        model: 'claude-3-haiku-20240307', // Downgraded to Haiku as Sonnet 3.5 is not available for this key
        extractorModel: 'claude-3-haiku-20240307',
        maxTokens: 1000,
        temperature: 0.8,
    },
    generation: {
        retryAttempts: 3,
        timeoutMs: 30000,
        maxHistoryUpdates: 3,
    },
    rateLimits: {
        maxGenerationsPerDay: 10,
        maxActiveCampaignsWithStorylines: 5,
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
