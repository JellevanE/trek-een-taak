import {
    XP_CONFIG,
    applyXp,
    buildPublicRpgState,
    createInitialRpgState,
    ensureUserRpg,
    incrementCounter,
    toPublicXpEvent
} from '../src/rpg/experience';
import {
    computeDailyBaseXp,
    computeSubtaskXp,
    computeTaskXp,
    summarizeTaskReward
} from '../src/rpg/rewards';
import type { SubTask, TaskRecord } from '../src/types/task';
import type { UserRpgEvent, UserRpgState } from '../src/types/user';

describe('rpg experience utilities', () => {
    test('ensureUserRpg normalizes missing nested structures', () => {
        const container: { rpg?: Partial<UserRpgState> | null } = { rpg: null };
        const normalized = ensureUserRpg(container);
        expect(normalized).not.toBeNull();
        const damaged: { rpg: Partial<UserRpgState> } = {
            rpg: {
                level: -5 as unknown as number,
                xp: Number.NaN as unknown as number,
                xp_log: null as unknown as UserRpgEvent[],
                inventory: {
                    items: 'not-an-array' as unknown as UserRpgState['inventory']['items']
                } as unknown as UserRpgState['inventory'],
                achievements: null as unknown as UserRpgState['achievements'],
                hp: Number.NaN as unknown as number,
                mp: Number.POSITIVE_INFINITY as unknown as number,
                coins: Number.NaN as unknown as number,
                streak: Number.NaN as unknown as number,
                counters: {
                    tasks_completed: 'bad' as unknown as number,
                    subtasks_completed: null as unknown as number,
                    daily_rewards_claimed: undefined as unknown as number
                },
                flags: null as unknown as UserRpgState['flags'],
                metrics: null as unknown as UserRpgState['metrics'],
                last_daily_reward_at: 123 as unknown as string,
                last_xp_award_at: undefined
            }
        };
        const repaired = ensureUserRpg(damaged);
        expect(repaired?.inventory.items).toEqual([]);
        expect(repaired?.achievements).toEqual([]);
        expect(repaired?.counters.tasks_completed).toBe(0);
        expect(repaired?.counters.subtasks_completed).toBe(0);
        expect(repaired?.counters.daily_rewards_claimed).toBe(0);
        expect(repaired?.last_daily_reward_at).toBeNull();
        expect(repaired?.last_xp_award_at).toBeNull();
    });

    test('applyXp trims xp log and records meaningful messages', () => {
        const baseEvent = (): UserRpgEvent => ({
            amount: 1,
            reason: 'legacy',
            message: 'legacy',
            metadata: {},
            at: new Date().toISOString(),
            level_before: 1,
            level_after: 1,
            xp_before: 0,
            xp_after: 0,
            xp_into_level: 0,
            xp_for_level: 100,
            xp_to_next: 100,
            leveled_up: false
        });
        const overflowLog = Array.from({ length: XP_CONFIG.xpLogLimit + 8 }, baseEvent);
        const target: { rpg: UserRpgState } = {
            rpg: {
                level: 1,
                xp: 0,
                hp: 10,
                mp: 5,
                coins: 0,
                streak: 0,
                achievements: [],
                inventory: { items: [] },
                xp_log: overflowLog,
                last_daily_reward_at: null,
                last_xp_award_at: null,
                counters: { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 },
                flags: {},
                metrics: {}
            }
        };

        const event = applyXp(target, 120, 'task_complete', {
            task_id: 99,
            task_level: 1,
            priority: 'medium'
        });
        expect(event).not.toBeNull();
        expect(target.rpg.xp_log.length).toBe(XP_CONFIG.xpLogLimit);
        expect(target.rpg.last_xp_award_at).toBe(event?.at);
        expect(event?.message).toMatch(/\+120 XP/);
    });

    test('buildPublicRpgState produces trimmed snapshots and public events', () => {
        const rpg = createInitialRpgState({
            xp: 250,
            level: 3,
            xp_log: Array.from({ length: 6 }, (_, index) => ({
                amount: index + 1,
                reason: 'legacy',
                message: 'msg',
                metadata: {},
                at: new Date().toISOString(),
                level_before: 2,
                level_after: 3,
                xp_before: 200,
                xp_after: 200 + index,
                xp_into_level: index,
                xp_for_level: 120,
                xp_to_next: 90,
                leveled_up: false
            }))
        });
        const snapshot = buildPublicRpgState(rpg);
        expect(snapshot.recent_events.length).toBeLessThanOrEqual(5);
        expect(snapshot.inventory.items).toEqual([]);
    });

    test('toPublicXpEvent converts rich events and ignores invalid ones', () => {
        expect(toPublicXpEvent(null)).toBeNull();
        const state = createInitialRpgState();
        const event = applyXp({ rpg: state } as { rpg: UserRpgState }, 25, 'daily_focus')!;
        const publicEvent = toPublicXpEvent(event);
        expect(publicEvent).toMatchObject({ reason: 'daily_focus', leveled_up: false });
    });

    test('incrementCounter initializes missing counters and fixes NaN values', () => {
        const state = createInitialRpgState();
        state.counters = null as unknown as UserRpgState['counters'];
        incrementCounter(state, 'tasks_completed');
        expect(state.counters.tasks_completed).toBe(1);
        state.counters.tasks_completed = Number.NaN;
        incrementCounter(state, 'tasks_completed');
        expect(state.counters.tasks_completed).toBe(1);
    });
});

describe('rpg reward calculations', () => {
    test('computeTaskXp handles invalid input and clamps levels', () => {
        const emptyReward = computeTaskXp(null);
        expect(emptyReward.amount).toBe(0);

        const task = computeTaskXp({
            task_level: 99,
            priority: 'high'
        } as Partial<TaskRecord>);
        expect(task.level).toBeLessThanOrEqual(XP_CONFIG.maxTaskLevel);
        expect(task.amount).toBeGreaterThan(0);
    });

    test('computeSubtaskXp applies weight floors and priority overrides', () => {
        const fallback = computeSubtaskXp(null, null);
        expect(fallback.weight).toBe(1);
        expect(fallback.source_priority).toBeUndefined();

        const task: Partial<TaskRecord> = { task_level: 4, priority: 'low' };
        const subtask: Partial<SubTask> = { weight: 0.1, priority: 'high' };
        const reward = computeSubtaskXp(task, subtask);
        expect(reward.weight).toBeCloseTo(XP_CONFIG.subtaskWeightFloor);
        expect(reward.source_priority).toBe('high');
        expect(reward.amount).toBeGreaterThan(0);
    });

    test('computeDailyBaseXp and summarizeTaskReward include status resolution', () => {
        const daily = computeDailyBaseXp();
        expect(daily).toEqual({ amount: XP_CONFIG.dailyBaseXp, reason: 'daily_focus' });

        const summary = summarizeTaskReward({ task_level: 2, status: 'mystery' } as unknown as Partial<TaskRecord>);
        expect(summary.status).toBe('todo');
        expect(summary.amount).toBeGreaterThan(0);
    });
});
