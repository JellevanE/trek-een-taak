import { act, renderHook } from '@testing-library/react';
import { useQuestAnimations } from '../useQuestAnimations';
import { resetQuestBoardStore } from '../../../../store/questBoardStore';

import { SOUND_EVENT_KEYS } from '../../../../theme';


jest.useFakeTimers();

describe('useQuestAnimations', () => {
    const mockQuests = [
        { id: 1, status: 'todo', side_quests: [] },
        { id: 2, status: 'todo', side_quests: [] }
    ];

    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
        jest.clearAllMocks();
    });

    const setupHook = (props = {}) => {
        return renderHook(() => useQuestAnimations({
            quests: mockQuests,
            setQuests: jest.fn(),
            setCollapsedMap: jest.fn(),
            refreshLayout: jest.fn(),
            ensureQuestExpanded: jest.fn(),
            mutateTaskStatus: jest.fn(),
            mutateSideQuestStatus: jest.fn(),
            playSound: jest.fn(),
            ...props
        }));
    };

    it('triggerQuestSpawn sets and clears spawn flags', () => {
        const { result } = setupHook();

        act(() => {
            result.current.triggerQuestSpawn(1);
        });

        expect(result.current.spawnQuests[1]).toBe(true);
        expect(result.current.pulsingQuests[1]).toBe('spawn');

        act(() => {
            jest.advanceTimersByTime(650);
        });

        expect(result.current.spawnQuests[1]).toBeUndefined();
        expect(result.current.pulsingQuests[1]).toBeUndefined();
    });

    it('scheduleCollapseAndMove moves completed quest to bottom and collapses it', () => {
        let questsState = [...mockQuests];
        const setQuests = jest.fn((updater) => {
            questsState = updater(questsState);
        });
        const setCollapsedMap = jest.fn();

        const { result } = setupHook({ setQuests, setCollapsedMap, quests: questsState });

        // Mark quest 1 as done in state so logic picks it up
        questsState = [{ id: 1, status: 'done' }, { id: 2, status: 'todo' }];

        act(() => {
            result.current.scheduleCollapseAndMove(1);
        });

        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(setQuests).toHaveBeenCalled();
        expect(questsState[1].id).toBe(1); // Moved to end
        expect(setCollapsedMap).toHaveBeenCalledWith(expect.any(Function));
    });

    it('setTaskStatusWithFx updates status and triggers effects', async () => {
        const mutateTaskStatus = jest.fn().mockResolvedValue({ id: 1, status: 'done' });
        const playSound = jest.fn();
        const setQuests = jest.fn();

        const { result } = setupHook({ mutateTaskStatus, playSound, setQuests });

        await act(async () => {
            await result.current.setTaskStatus(1, 'done');
        });

        expect(mutateTaskStatus).toHaveBeenCalledWith(1, 'done', undefined);
        expect(setQuests).toHaveBeenCalled();
        expect(result.current.pulsingQuests[1]).toBe('full');
        expect(playSound).toHaveBeenCalledWith(SOUND_EVENT_KEYS.QUEST_COMPLETE);
        expect(result.current.glowQuests[1]).toBe(true);
        expect(result.current.celebratingQuests[1]).toBe(true);

        act(() => {
            jest.advanceTimersByTime(1400);
        });

        expect(result.current.glowQuests[1]).toBeUndefined();
        expect(result.current.celebratingQuests[1]).toBeUndefined();
    });

    it('setSideQuestStatusWithFx updates status and triggers effects', async () => {
        const mutateSideQuestStatus = jest.fn().mockResolvedValue({
            id: 1,
            side_quests: [{ id: 101, status: 'done' }]
        });
        const ensureQuestExpanded = jest.fn();
        const setQuests = jest.fn();

        const { result } = setupHook({ mutateSideQuestStatus, ensureQuestExpanded, setQuests });

        await act(async () => {
            await result.current.setSideQuestStatus(1, 101, 'done');
        });

        expect(mutateSideQuestStatus).toHaveBeenCalledWith(1, 101, 'done', undefined);
        expect(setQuests).toHaveBeenCalled();
        expect(result.current.pulsingSideQuests['1:101']).toBe('full');
        expect(ensureQuestExpanded).toHaveBeenCalledWith(1);

        act(() => {
            jest.advanceTimersByTime(700);
        });

        expect(result.current.pulsingSideQuests['1:101']).toBeUndefined();
    });
});
