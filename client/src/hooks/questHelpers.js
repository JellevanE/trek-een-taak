import { useMemo } from 'react';

export const PRIORITY_ORDER = ['low', 'medium', 'high'];
export const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

export const normalizeSideQuest = (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const status = raw.status || (raw.completed ? 'done' : 'todo');
    return { ...raw, status, completed: status === 'done' ? true : !!raw.completed };
};

export const normalizeQuest = (task) => {
    if (!task || typeof task !== 'object') return task;
    const rawSubs = Array.isArray(task.side_quests)
        ? task.side_quests
        : Array.isArray(task.sub_tasks)
            ? task.sub_tasks
            : [];
    const sideQuests = rawSubs.map(normalizeSideQuest);
    const taskLevel = typeof task.task_level === 'number' ? task.task_level : 1;
    return { ...task, side_quests: sideQuests, task_level: taskLevel };
};

export const normalizeQuestList = (list) => (Array.isArray(list) ? list.map(normalizeQuest) : []);

export const getQuestStatus = (quest) => {
    if (!quest) return 'todo';
    return quest.status || (quest.completed ? 'done' : 'todo');
};

export const getQuestStatusLabel = (quest) => getQuestStatus(quest).replace('_', ' ');

export const getQuestSideQuests = (quest) => {
    if (!quest || !Array.isArray(quest.side_quests)) return [];
    return quest.side_quests;
};

export const getSideQuestStatus = (sideQuest, parent) => {
    if (!sideQuest) return parent ? getQuestStatus(parent) : 'todo';
    return sideQuest.status || (sideQuest.completed ? 'done' : 'todo');
};

export const getSideQuestStatusLabel = (sideQuest, parent) => getSideQuestStatus(sideQuest, parent).replace('_', ' ');

export const idsMatch = (a, b) => String(a) === String(b);

export const cloneQuestSnapshot = (quest) => {
    if (!quest) return null;
    return JSON.parse(JSON.stringify(quest));
};

export const findSideQuestById = (quest, sideQuestId) =>
    getQuestSideQuests(quest).find((sub) => idsMatch(sub?.id, sideQuestId)) || null;

export const isInteractiveTarget = (target) =>
    target && typeof target.closest === 'function'
    && target.closest('input,textarea,button,select,[contenteditable=\"true\"]');

export const priorityWeight = (priority) => {
    if (!priority) return 1.0;
    const value = String(priority).toLowerCase();
    switch (value) {
        case 'low':
            return 1.0;
        case 'medium':
            return 1.15;
        case 'high':
            return 1.30;
        default:
            return 1.0;
    }
};

export const sideQuestWeight = (sub, parent) => {
    if (!sub) return 1.0;
    if (typeof sub.weight === 'number') return Math.max(0.1, sub.weight);
    if (sub.priority) return priorityWeight(sub.priority);
    if (sub.difficulty) return priorityWeight(sub.difficulty);
    const fallbackPriority = parent && parent.priority ? parent.priority : 'medium';
    return priorityWeight(fallbackPriority);
};

export const getQuestProgress = (task) => {
    if (!task) return 0;
    const subs = Array.isArray(task.side_quests) ? task.side_quests : [];
    if (subs.length > 0) {
        let weightedDone = 0;
        let weightSum = 0;
        subs.forEach((sub) => {
            const weight = sideQuestWeight(sub, task);
            weightSum += weight;
            const done = getSideQuestStatus(sub, task) === 'done' ? 1 : 0;
            weightedDone += done * weight;
        });
        return weightSum > 0 ? Math.round((weightedDone / weightSum) * 100) : 0;
    }
    switch (getQuestStatus(task)) {
        case 'done':
            return 100;
        case 'in_progress':
            return 50;
        case 'blocked':
            return 25;
        default:
            return 0;
    }
};

export const progressColor = (pct) => {
    if (pct >= 80) return 'linear-gradient(90deg, #23d160, #36d7b7)'; // green-teal
    if (pct >= 60) return 'linear-gradient(90deg, #a0e39b, #bae637)'; // light green
    if (pct >= 40) return 'linear-gradient(90deg, #ffd666, #ffb36b)'; // amber
    if (pct >= 20) return 'linear-gradient(90deg, #ff7a45, #ff9278)'; // orange
    return 'linear-gradient(90deg, #ff4d4f, #ff758f)'; // red
};

export const getProgressAura = (pct) => {
    if (pct >= 90) return { emoji: '🌟', mood: 'Legendary focus', fillClass: 'progress-legend' };
    if (pct >= 70) return { emoji: '🚀', mood: 'Momentum rising', fillClass: 'progress-heroic' };
    if (pct >= 40) return { emoji: '⚔️', mood: 'Battle ready', fillClass: 'progress-ready' };
    if (pct >= 15) return { emoji: '🛠️', mood: 'Forge in progress', fillClass: 'progress-building' };
    return { emoji: '💤', mood: 'Boot sequence idle', fillClass: 'progress-idle' };
};

export const useGlobalProgress = (quests) => useMemo(() => {
    if (!Array.isArray(quests) || quests.length === 0) {
        return {
            percent: 0,
            count: 0,
            todayCount: 0,
            backlogCount: 0,
            totalCount: 0,
            weightingToday: false
        };
    }

    const todayKey = new Date().toISOString().split('T')[0];
    const today = quests.filter((quest) => quest && quest.due_date === todayKey);
    const backlog = quests.filter((quest) => quest && quest.due_date !== todayKey);
    const weightingToday = today.length > 0;

    let weightSum = 0;
    let weightedProgressSum = 0;

    const contribute = (task, multiplier = 1) => {
        if (!task) return;
        const baseWeight = priorityWeight(task.priority);
        const subs = getQuestSideQuests(task);
        const subWeightSum = subs.reduce((sum, sub) => sum + sideQuestWeight(sub, task), 0);
        const questWeight = (baseWeight + subWeightSum) * Math.max(multiplier, 0);
        if (questWeight <= 0) return;
        weightSum += questWeight;
        weightedProgressSum += (getQuestProgress(task) || 0) * questWeight;
    };

    today.forEach((task) => contribute(task, 1));
    backlog.forEach((task) => {
        const dueDate = task && typeof task.due_date === 'string' ? task.due_date : null;
        let multiplier = 1;
        if (weightingToday) {
            if (dueDate && dueDate < todayKey) {
                multiplier = 0.75;
            } else {
                multiplier = 0.4;
            }
        }
        contribute(task, multiplier);
    });

    const percent = weightSum > 0 ? Math.round(weightedProgressSum / weightSum) : 0;
    return {
        percent,
        count: weightingToday ? today.length : quests.length,
        todayCount: today.length,
        backlogCount: backlog.length,
        totalCount: quests.length,
        weightingToday
    };
}, [quests]);

export const calculateGlobalProgress = (quests) => {
    if (!Array.isArray(quests) || quests.length === 0) {
        return {
            percent: 0,
            count: 0,
            todayCount: 0,
            backlogCount: 0,
            totalCount: 0,
            weightingToday: false
        };
    }

    const todayKey = new Date().toISOString().split('T')[0];
    const today = quests.filter((quest) => quest && quest.due_date === todayKey);
    const backlog = quests.filter((quest) => quest && quest.due_date !== todayKey);
    const weightingToday = today.length > 0;

    let weightSum = 0;
    let weightedProgressSum = 0;

    const contribute = (task, multiplier = 1) => {
        if (!task) return;
        const baseWeight = priorityWeight(task.priority);
        const subs = getQuestSideQuests(task);
        const subWeightSum = subs.reduce((sum, sub) => sum + sideQuestWeight(sub, task), 0);
        const questWeight = (baseWeight + subWeightSum) * Math.max(multiplier, 0);
        if (questWeight <= 0) return;
        weightSum += questWeight;
        weightedProgressSum += (getQuestProgress(task) || 0) * questWeight;
    };

    today.forEach((task) => contribute(task, 1));
    backlog.forEach((task) => {
        const dueDate = task && typeof task.due_date === 'string' ? task.due_date : null;
        let multiplier = 1;
        if (weightingToday) {
            if (dueDate && dueDate < todayKey) {
                multiplier = 0.75;
            } else {
                multiplier = 0.4;
            }
        }
        contribute(task, multiplier);
    });

    const percent = weightSum > 0 ? Math.round(weightedProgressSum / weightSum) : 0;
    return {
        percent,
        count: weightingToday ? today.length : quests.length,
        todayCount: today.length,
        backlogCount: backlog.length,
        totalCount: quests.length,
        weightingToday
    };
};

export const getNextPriority = (current) => {
    const index = PRIORITY_ORDER.indexOf(current);
    const nextIndex = index === -1 ? 0 : (index + 1) % PRIORITY_ORDER.length;
    return PRIORITY_ORDER[nextIndex];
};

export const getNextLevel = (current) => {
    const idx = LEVEL_OPTIONS.indexOf(Number(current));
    const nextIdx = idx === -1 ? 0 : (idx + 1) % LEVEL_OPTIONS.length;
    return LEVEL_OPTIONS[nextIdx];
};
