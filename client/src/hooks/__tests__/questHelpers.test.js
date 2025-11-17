import { renderHook } from '@testing-library/react';
import {
    normalizeSideQuest,
    normalizeQuest,
    normalizeQuestList,
    getQuestStatus,
    getQuestStatusLabel,
    getQuestSideQuests,
    getSideQuestStatus,
    getSideQuestStatusLabel,
    idsMatch,
    cloneQuestSnapshot,
    findSideQuestById,
    isInteractiveTarget,
    priorityWeight,
    sideQuestWeight,
    getQuestProgress,
    progressColor,
    getProgressAura,
    useGlobalProgress,
    calculateGlobalProgress,
    getNextPriority,
    getNextLevel,
    PRIORITY_ORDER,
    LEVEL_OPTIONS
} from '../questHelpers.js';

describe('questHelpers', () => {
    describe('normalizeSideQuest', () => {
        it('should return raw if not an object', () => {
            expect(normalizeSideQuest(null)).toBeNull();
            expect(normalizeSideQuest(undefined)).toBeUndefined();
            expect(normalizeSideQuest('string')).toBe('string');
        });

        it('should normalize status from completed flag', () => {
            const sideQuest = { id: 1, completed: true };
            const result = normalizeSideQuest(sideQuest);
            expect(result.status).toBe('done');
            expect(result.completed).toBe(true);
        });

        it('should use status if provided', () => {
            const sideQuest = { id: 1, status: 'in_progress' };
            const result = normalizeSideQuest(sideQuest);
            expect(result.status).toBe('in_progress');
        });

        it('should default status to todo', () => {
            const sideQuest = { id: 1 };
            const result = normalizeSideQuest(sideQuest);
            expect(result.status).toBe('todo');
            expect(result.completed).toBe(false);
        });
    });

    describe('normalizeQuest', () => {
        it('should return raw if not an object', () => {
            expect(normalizeQuest(null)).toBeNull();
            expect(normalizeQuest(undefined)).toBeUndefined();
        });

        it('should normalize sub_tasks to side_quests', () => {
            const quest = {
                id: 1,
                sub_tasks: [{ id: 1, completed: true }]
            };
            const result = normalizeQuest(quest);
            expect(result.side_quests).toHaveLength(1);
            expect(result.side_quests[0].status).toBe('done');
        });

        it('should use side_quests if sub_tasks is empty', () => {
            const quest = {
                id: 1,
                sub_tasks: [],
                side_quests: [{ id: 1 }]
            };
            const result = normalizeQuest(quest);
            expect(result.side_quests).toHaveLength(1);
        });

        it('should default task_level to 1', () => {
            const quest = { id: 1 };
            const result = normalizeQuest(quest);
            expect(result.task_level).toBe(1);
        });

        it('should preserve task_level if number', () => {
            const quest = { id: 1, task_level: 3 };
            const result = normalizeQuest(quest);
            expect(result.task_level).toBe(3);
        });
    });

    describe('normalizeQuestList', () => {
        it('should return empty array for non-array input', () => {
            expect(normalizeQuestList(null)).toEqual([]);
            expect(normalizeQuestList(undefined)).toEqual([]);
            expect(normalizeQuestList('string')).toEqual([]);
        });

        it('should normalize all quests in list', () => {
            const quests = [
                { id: 1, completed: true },
                { id: 2, task_level: 3 }
            ];
            const result = normalizeQuestList(quests);
            expect(result).toHaveLength(2);
            expect(result[0].side_quests).toEqual([]);
            expect(result[1].task_level).toBe(3);
        });
    });

    describe('getQuestStatus', () => {
        it('should return todo for null quest', () => {
            expect(getQuestStatus(null)).toBe('todo');
        });

        it('should return status if present', () => {
            expect(getQuestStatus({ status: 'in_progress' })).toBe('in_progress');
        });

        it('should derive status from completed flag', () => {
            expect(getQuestStatus({ completed: true })).toBe('done');
            expect(getQuestStatus({ completed: false })).toBe('todo');
        });
    });

    describe('getQuestStatusLabel', () => {
        it('should replace underscores with spaces', () => {
            expect(getQuestStatusLabel({ status: 'in_progress' })).toBe('in progress');
        });
    });

    describe('getQuestSideQuests', () => {
        it('should return empty array for null quest', () => {
            expect(getQuestSideQuests(null)).toEqual([]);
        });

        it('should return empty array if side_quests is not array', () => {
            expect(getQuestSideQuests({ side_quests: null })).toEqual([]);
        });

        it('should return side_quests array', () => {
            const sideQuests = [{ id: 1 }, { id: 2 }];
            expect(getQuestSideQuests({ side_quests: sideQuests })).toEqual(sideQuests);
        });
    });

    describe('getSideQuestStatus', () => {
        it('should return parent status if sideQuest is null', () => {
            expect(getSideQuestStatus(null, { status: 'in_progress' })).toBe('in_progress');
        });

        it('should return todo if both null', () => {
            expect(getSideQuestStatus(null, null)).toBe('todo');
        });

        it('should return sideQuest status', () => {
            expect(getSideQuestStatus({ status: 'done' }, {})).toBe('done');
        });
    });

    describe('getSideQuestStatusLabel', () => {
        it('should replace underscores with spaces', () => {
            expect(getSideQuestStatusLabel({ status: 'in_progress' })).toBe('in progress');
        });
    });

    describe('idsMatch', () => {
        it('should match identical strings', () => {
            expect(idsMatch('123', '123')).toBe(true);
        });

        it('should match numbers and strings', () => {
            expect(idsMatch(123, '123')).toBe(true);
            expect(idsMatch('123', 123)).toBe(true);
        });

        it('should not match different values', () => {
            expect(idsMatch('123', '456')).toBe(false);
        });
    });

    describe('cloneQuestSnapshot', () => {
        it('should return null for null input', () => {
            expect(cloneQuestSnapshot(null)).toBeNull();
        });

        it('should create deep clone', () => {
            const quest = { id: 1, side_quests: [{ id: 2 }] };
            const clone = cloneQuestSnapshot(quest);
            expect(clone).toEqual(quest);
            expect(clone).not.toBe(quest);
            expect(clone.side_quests).not.toBe(quest.side_quests);
        });
    });

    describe('findSideQuestById', () => {
        it('should find side quest by id', () => {
            const quest = {
                side_quests: [
                    { id: 1, title: 'First' },
                    { id: 2, title: 'Second' }
                ]
            };
            expect(findSideQuestById(quest, 2)?.title).toBe('Second');
        });

        it('should return null if not found', () => {
            const quest = { side_quests: [{ id: 1 }] };
            expect(findSideQuestById(quest, 999)).toBeNull();
        });
    });

    describe('isInteractiveTarget', () => {
        it('should detect interactive elements', () => {
            const button = document.createElement('button');
            expect(isInteractiveTarget(button)).toBeTruthy();
        });

        it('should return false for null', () => {
            expect(isInteractiveTarget(null)).toBeFalsy();
        });
    });

    describe('priorityWeight', () => {
        it('should return correct weight for low priority', () => {
            expect(priorityWeight('low')).toBe(1.0);
        });

        it('should return correct weight for medium priority', () => {
            expect(priorityWeight('medium')).toBe(1.15);
        });

        it('should return correct weight for high priority', () => {
            expect(priorityWeight('high')).toBe(1.30);
        });

        it('should return default weight for unknown priority', () => {
            expect(priorityWeight('unknown')).toBe(1.0);
            expect(priorityWeight(null)).toBe(1.0);
        });

        it('should be case-insensitive', () => {
            expect(priorityWeight('HIGH')).toBe(1.30);
            expect(priorityWeight('Medium')).toBe(1.15);
        });
    });

    describe('sideQuestWeight', () => {
        it('should return weight property if numeric', () => {
            expect(sideQuestWeight({ weight: 2.5 })).toBe(2.5);
        });

        it('should return minimum weight of 0.1', () => {
            expect(sideQuestWeight({ weight: 0.05 })).toBe(0.1);
        });

        it('should use priority if weight not provided', () => {
            expect(sideQuestWeight({ priority: 'high' })).toBe(1.30);
        });

        it('should use difficulty if priority not provided', () => {
            expect(sideQuestWeight({ difficulty: 'medium' })).toBe(1.15);
        });

        it('should use parent priority as fallback', () => {
            expect(sideQuestWeight({}, { priority: 'high' })).toBe(1.30);
        });

        it('should default to medium if no priority', () => {
            expect(sideQuestWeight({}, {})).toBe(1.15);
        });

        it('should return 1.0 for null sideQuest', () => {
            expect(sideQuestWeight(null)).toBe(1.0);
        });
    });

    describe('getQuestProgress', () => {
        it('should return 0 for null quest', () => {
            expect(getQuestProgress(null)).toBe(0);
        });

        it('should calculate progress based on side quests', () => {
            const quest = {
                side_quests: [
                    { status: 'done' },
                    { status: 'done' },
                    { status: 'todo' }
                ]
            };
            const progress = getQuestProgress(quest);
            expect(progress).toBeGreaterThan(60);
            expect(progress).toBeLessThan(70);
        });

        it('should use weighted progress for side quests', () => {
            const quest = {
                side_quests: [
                    { status: 'done', weight: 2 },
                    { status: 'todo', weight: 1 }
                ]
            };
            const progress = getQuestProgress(quest);
            expect(progress).toBeGreaterThan(65);
        });

        it('should return 100 for done status without side quests', () => {
            expect(getQuestProgress({ status: 'done' })).toBe(100);
        });

        it('should return 50 for in_progress status', () => {
            expect(getQuestProgress({ status: 'in_progress' })).toBe(50);
        });

        it('should return 25 for blocked status', () => {
            expect(getQuestProgress({ status: 'blocked' })).toBe(25);
        });

        it('should return 0 for todo status', () => {
            expect(getQuestProgress({ status: 'todo' })).toBe(0);
        });

        it('should return 0 if weightSum is 0', () => {
            const quest = {
                side_quests: []
            };
            expect(getQuestProgress(quest)).toBe(0);
        });
    });

    describe('progressColor', () => {
        it('should return green-teal for 80%+', () => {
            expect(progressColor(90)).toContain('#23d160');
        });

        it('should return light green for 60-79%', () => {
            expect(progressColor(65)).toContain('#a0e39b');
        });

        it('should return amber for 40-59%', () => {
            expect(progressColor(45)).toContain('#ffd666');
        });

        it('should return orange for 20-39%', () => {
            expect(progressColor(25)).toContain('#ff7a45');
        });

        it('should return red for <20%', () => {
            expect(progressColor(10)).toContain('#ff4d4f');
        });
    });

    describe('getProgressAura', () => {
        it('should return legendary for 90%+', () => {
            const aura = getProgressAura(95);
            expect(aura.emoji).toBe('🌟');
            expect(aura.mood).toBe('Legendary focus');
        });

        it('should return momentum for 70-89%', () => {
            const aura = getProgressAura(75);
            expect(aura.emoji).toBe('🚀');
            expect(aura.mood).toBe('Momentum rising');
        });

        it('should return ready for 40-69%', () => {
            const aura = getProgressAura(50);
            expect(aura.emoji).toBe('⚔️');
            expect(aura.mood).toBe('Battle ready');
        });

        it('should return building for 15-39%', () => {
            const aura = getProgressAura(20);
            expect(aura.emoji).toBe('🛠️');
            expect(aura.mood).toBe('Forge in progress');
        });

        it('should return idle for <15%', () => {
            const aura = getProgressAura(5);
            expect(aura.emoji).toBe('💤');
            expect(aura.mood).toBe('Boot sequence idle');
        });
    });

    describe('useGlobalProgress', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return zero values for empty list', () => {
            const { result } = renderHook(() => useGlobalProgress([]));
            expect(result.current.percent).toBe(0);
            expect(result.current.count).toBe(0);
            expect(result.current.totalCount).toBe(0);
        });

        it('should calculate progress for today tasks', () => {
            const quests = [
                { id: 1, due_date: '2024-01-15', status: 'done', priority: 'high' },
                { id: 2, due_date: '2024-01-15', status: 'todo', priority: 'low' }
            ];
            const { result } = renderHook(() => useGlobalProgress(quests));
            expect(result.current.todayCount).toBe(2);
            expect(result.current.weightingToday).toBe(true);
        });

        it('should apply reduced weight to backlog tasks', () => {
            const quests = [
                { id: 1, due_date: '2024-01-15', status: 'done', priority: 'medium' },
                { id: 2, due_date: '2024-01-16', status: 'todo', priority: 'medium' }
            ];
            const { result } = renderHook(() => useGlobalProgress(quests));
            expect(result.current.todayCount).toBe(1);
            expect(result.current.backlogCount).toBe(1);
        });

        it('should apply higher weight to overdue tasks', () => {
            const quests = [
                { id: 1, due_date: '2024-01-15', status: 'done', priority: 'medium' },
                { id: 2, due_date: '2024-01-14', status: 'todo', priority: 'medium' }
            ];
            const { result } = renderHook(() => useGlobalProgress(quests));
            expect(result.current.todayCount).toBe(1);
            expect(result.current.backlogCount).toBe(1);
        });

        it('should include side quest weights', () => {
            const quests = [
                {
                    id: 1,
                    due_date: '2024-01-15',
                    status: 'in_progress',
                    priority: 'high',
                    side_quests: [
                        { status: 'done', weight: 2 },
                        { status: 'todo', weight: 1 }
                    ]
                }
            ];
            const { result } = renderHook(() => useGlobalProgress(quests));
            expect(result.current.todayCount).toBe(1);
            expect(result.current.percent).toBeGreaterThan(0);
        });

        it('should handle quests without due_date', () => {
            const quests = [
                { id: 1, status: 'done', priority: 'medium' }
            ];
            const { result } = renderHook(() => useGlobalProgress(quests));
            expect(result.current.backlogCount).toBe(1);
        });
    });

    describe('calculateGlobalProgress', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return zero values for empty list', () => {
            const result = calculateGlobalProgress([]);
            expect(result.percent).toBe(0);
            expect(result.count).toBe(0);
        });

        it('should calculate progress for today tasks', () => {
            const quests = [
                { id: 1, due_date: '2024-01-15', status: 'done', priority: 'high' },
                { id: 2, due_date: '2024-01-15', status: 'todo', priority: 'low' }
            ];
            const result = calculateGlobalProgress(quests);
            expect(result.todayCount).toBe(2);
            expect(result.weightingToday).toBe(true);
        });

        it('should handle null quests in array', () => {
            const quests = [
                null,
                { id: 1, due_date: '2024-01-15', status: 'done' }
            ];
            const result = calculateGlobalProgress(quests);
            expect(result.todayCount).toBe(1);
        });

        it('should not weight backlog when no today tasks', () => {
            const quests = [
                { id: 1, due_date: '2024-01-16', status: 'done', priority: 'medium' }
            ];
            const result = calculateGlobalProgress(quests);
            expect(result.weightingToday).toBe(false);
            expect(result.count).toBe(1);
        });
    });

    describe('getNextPriority', () => {
        it('should cycle through priorities', () => {
            expect(getNextPriority('low')).toBe('medium');
            expect(getNextPriority('medium')).toBe('high');
            expect(getNextPriority('high')).toBe('low');
        });

        it('should default to low for unknown priority', () => {
            expect(getNextPriority('unknown')).toBe('low');
        });
    });

    describe('getNextLevel', () => {
        it('should cycle through levels', () => {
            expect(getNextLevel(1)).toBe(2);
            expect(getNextLevel(2)).toBe(3);
            expect(getNextLevel(5)).toBe(1);
        });

        it('should default to 1 for unknown level', () => {
            expect(getNextLevel(99)).toBe(1);
        });
    });

    describe('constants', () => {
        it('should export PRIORITY_ORDER', () => {
            expect(PRIORITY_ORDER).toEqual(['low', 'medium', 'high']);
        });

        it('should export LEVEL_OPTIONS', () => {
            expect(LEVEL_OPTIONS).toEqual([1, 2, 3, 4, 5]);
        });
    });
});
