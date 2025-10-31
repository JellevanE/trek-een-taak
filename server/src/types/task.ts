export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface StatusHistoryEntry {
    status: TaskStatus;
    at: string;
    note: string | null;
}

export interface TaskRewardHistoryEntry {
    at: string;
    amount: number;
    reason: string;
    subtask_id?: number;
}

export interface TaskRpgData {
    xp_awarded: boolean;
    last_reward_at: string | null;
    history: TaskRewardHistoryEntry[];
}

export interface SubtaskRpgData {
    xp_awarded: boolean;
    last_reward_at: string | null;
}

export interface SubTask {
    id: number;
    description: string;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
    status_history: StatusHistoryEntry[];
    completed?: boolean;
    rpg: SubtaskRpgData;
    priority?: TaskPriority;
    weight?: number;
}

export interface TaskRecord {
    id: number;
    description: string;
    priority: TaskPriority;
    sub_tasks: SubTask[];
    side_quests?: SubTask[];
    nextSubtaskId: number;
    due_date?: string;
    status: TaskStatus;
    order: number;
    created_at: string;
    updated_at: string;
    completed?: boolean;
    task_level: number;
    status_history: StatusHistoryEntry[];
    rpg: TaskRpgData;
    campaign_id: number | null;
    owner_id: number;
    nextId?: number;
}

export interface TaskStoreData {
    tasks: TaskRecord[];
    nextId: number;
}
