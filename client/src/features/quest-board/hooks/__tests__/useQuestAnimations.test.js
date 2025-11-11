import { act, renderHook } from '@testing-library/react';
import { useQuestAnimations } from '../useQuestAnimations.js';
import { resetQuestBoardStore } from '../../../../store/questBoardStore.js';

describe('useQuestAnimations', () => {
    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('collapses completed quests after the delay', () => {
        let latestQuests = [
            { id: 1, description: 'Done quest', status: 'done' },
            { id: 2, description: 'Active quest', status: 'todo' }
        ];
        const setQuests = jest.fn((updater) => {
            latestQuests = typeof updater === 'function' ? updater(latestQuests) : updater;
            return latestQuests;
        });
        let collapsedState = {};
        const setCollapsedMap = jest.fn((updater) => {
            collapsedState = typeof updater === 'function' ? updater(collapsedState) : updater;
            return collapsedState;
        });

        const { result } = renderHook(() => useQuestAnimations({
            quests: latestQuests,
            setQuests,
            setCollapsedMap,
            refreshLayout: null,
            ensureQuestExpanded: jest.fn(),
            mutateTaskStatus: jest.fn(),
            mutateSideQuestStatus: jest.fn(),
            playSound: jest.fn()
        }));

        act(() => {
            result.current.scheduleCollapseAndMove(1, 100);
        });

        act(() => {
            jest.advanceTimersByTime(120);
        });

        expect(latestQuests[latestQuests.length - 1].id).toBe(1);
        expect(collapsedState[1]).toBe(true);
    });
});
