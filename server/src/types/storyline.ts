export interface Storyline {
    id: string;
    campaignId: number; // Changed to number to match CampaignRecord.id type
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

export interface StoryUpdate {
    id: string;
    type: 'intro' | 'daily' | 'completion' | 'reflection'; // extensible
    text: string;
    generatedAt: string;
    tasksCompleted: string[]; // task IDs referenced in this update
}
