import type { SubTask, TaskRecord, TaskStatus } from '../types/task';
import { XP_CONFIG, clampTaskLevel, getPriorityMultiplier } from './experience';

export interface TaskRewardBreakdown {
    amount: number;
    level: number;
    multiplier: number;
    base: number;
}

export interface SubtaskRewardBreakdown extends TaskRewardBreakdown {
    weight: number;
    source_priority: TaskRecord['priority'] | undefined;
}

export interface DailyReward {
    amount: number;
    reason: 'daily_focus';
}

type PartialTask = Partial<TaskRecord> | null | undefined;
type PartialSubtask = Partial<SubTask> | null | undefined;

function resolveTaskStatus(task: Partial<TaskRecord>): TaskStatus {
    const status = task.status;
    if (status === 'todo' || status === 'in_progress' || status === 'blocked' || status === 'done') {
        return status;
    }
    return 'todo';
}

export function computeTaskXp(task: PartialTask): TaskRewardBreakdown {
    if (!task || typeof task !== 'object') {
        return { amount: 0, level: 1, multiplier: 1, base: XP_CONFIG.baseTaskXp };
    }
    const level = clampTaskLevel(task.task_level ?? 1);
    const base = XP_CONFIG.baseTaskXp + (level - 1) * XP_CONFIG.taskLevelBonus;
    const multiplier = getPriorityMultiplier(task.priority);
    const amount = Math.max(1, Math.round(base * multiplier));
    return { amount, level, multiplier, base };
}

export function computeSubtaskXp(task: PartialTask, subtask: PartialSubtask): SubtaskRewardBreakdown {
    const baseTask = computeTaskXp(task);

    if (!task || typeof task !== 'object') {
        return {
            ...baseTask,
            weight: 1,
            source_priority: undefined
        };
    }

    const base = XP_CONFIG.baseSubtaskXp + (baseTask.level - 1) * XP_CONFIG.subtaskLevelBonus;
    const prioritySource = subtask?.priority ?? task.priority;
    const multiplier = getPriorityMultiplier(prioritySource);
    let weight = 1;
    if (typeof subtask?.weight === 'number' && Number.isFinite(subtask.weight)) {
        weight = Math.max(XP_CONFIG.subtaskWeightFloor, subtask.weight);
    }
    const amount = Math.max(1, Math.round(base * multiplier * weight));
    return {
        amount,
        level: baseTask.level,
        multiplier,
        base,
        weight,
        source_priority: prioritySource
    };
}

export function computeDailyBaseXp(): DailyReward {
    return { amount: XP_CONFIG.dailyBaseXp, reason: 'daily_focus' };
}

export function summarizeTaskReward(task: PartialTask): TaskRewardBreakdown & { status: TaskStatus } {
    const reward = computeTaskXp(task);
    return {
        ...reward,
        status: task && typeof task === 'object' ? resolveTaskStatus(task) : 'todo'
    };
}
