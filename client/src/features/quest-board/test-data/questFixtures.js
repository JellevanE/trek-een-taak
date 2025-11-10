export const createQuestFixture = (overrides = {}) => ({
    id: overrides.id ?? 42,
    description: 'Prototype neon quest',
    priority: 'normal',
    task_level: 3,
    campaign_id: null,
    due_date: '2024-12-31',
    ...overrides
});

export const createCampaignFixture = (overrides = {}) => ({
    id: overrides.id ?? 7,
    name: 'Neon Arcade Initiative',
    progress_summary: '3/8',
    image_url: null,
    stats: {
        quests_completed: 3,
        quests_total: 8
    },
    ...overrides
});

export const createSideQuestFixture = (overrides = {}) => ({
    id: overrides.id ?? 101,
    description: 'Refine card glow states',
    status: 'todo',
    ...overrides
});
