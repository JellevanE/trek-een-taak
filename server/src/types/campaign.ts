export interface CampaignRecord {
    id: number;
    name: string;
    description: string;
    image_url: string | null;
    owner_id: number;
    archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface CampaignStoreData {
    campaigns: CampaignRecord[];
    nextId: number;
}

export interface CampaignProgressStats {
    quests_total: number;
    quests_completed: number;
    quests_remaining: number;
    quests_in_progress: number;
    completion_percent: number;
}

export interface CampaignExtras {
    stats: CampaignProgressStats;
    progress_summary: string;
}
