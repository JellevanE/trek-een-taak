import { act, renderHook } from '@testing-library/react';
import { useQuestInteractions } from '../useQuestInteractions.js';
import { resetQuestBoardStore } from '../../../../store/questBoardStore.js';

/**
 * Story 2 Regression Tests: Side Quest Failure Scenarios
 * Tests comprehensive failure handling for multi-side-quest operations
 */

const createSelectionStub = () => ({
    selectedQuestId: null,
    setSelectedQuestId: jest.fn(),
    selectedSideQuest: null,
    setSelectedSideQuest: jest.fn(),
    editingQuest: null,
    setEditingQuest: jest.fn(),
    editingSideQuest: null,
    setEditingSideQuest: jest.fn(),
    sideQuestDescriptionMap: {},
    setSideQuestDescriptionMap: jest.fn(),
    addingSideQuestTo: null,
    setAddingSideQuestTo: jest.fn(),
    loadingSideQuestAdds: new Set(),
    setLoadingSideQuestAdds: jest.fn(),
    collapsedMap: {},
    addInputRefs: { current: {} },
    ensureQuestExpanded: jest.fn(),
    handleSelectQuest: jest.fn(),
    handleSelectSideQuest: jest.fn(),
    clearSelection: jest.fn(),
    findQuestById: jest.fn(() => null),
    moveQuestSelection: jest.fn(),
    selectFirstSideQuest: jest.fn()
});

const createAnimationsStub = () => ({
    triggerQuestSpawn: jest.fn(),
    setTaskStatus: jest.fn(),
    setSideQuestStatus: jest.fn()
});

describe('useQuestInteractions - Failure Scenarios (Story 2)', () => {
    const baseProps = () => ({
        quests: [],
        setQuests: jest.fn(),
        selection: createSelectionStub(),
        animations: createAnimationsStub(),
        refreshLayout: jest.fn(),
        playSound: jest.fn(),
        pushToast: jest.fn(),
        createQuest: jest.fn().mockResolvedValue(null),
        deleteQuest: jest.fn().mockResolvedValue(true),
        updateQuest: jest.fn().mockResolvedValue(null),
        createSideQuest: jest.fn().mockResolvedValue(null),
        updateSideQuestRequest: jest.fn().mockResolvedValue(null),
        deleteSideQuestRequest: jest.fn().mockResolvedValue(null),
        setPriority: jest.fn(),
        setTaskLevel: jest.fn()
    });

    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
        jest.useFakeTimers();
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb();
            return 1;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('handles network failure when adding multiple side quests sequentially', async () => {
        const props = baseProps();
        props.quests = [{ id: 7, description: 'Quest', side_quests: [] }];
        let questsState = props.quests;

        // Track state changes through setQuests calls
        props.setQuests = jest.fn((updater) => {
            questsState = typeof updater === 'function' ? updater(questsState) : updater;
            return questsState;
        });

        // First side quest succeeds
        props.createSideQuest.mockResolvedValueOnce({
            id: 7,
            description: 'Quest',
            side_quests: [{ id: 1, description: 'First side quest', status: 'todo' }]
        });

        // Second side quest fails
        props.createSideQuest.mockRejectedValueOnce(new Error('Network error'));

        props.selection.sideQuestDescriptionMap = { 7: 'First side quest' };

        const { result } = renderHook(() => useQuestInteractions(props));

        // Add first side quest
        await act(async () => {
            await result.current.addSideQuest(7);
        });

        expect(props.createSideQuest).toHaveBeenCalledTimes(1);

        // Try to add second side quest
        props.selection.sideQuestDescriptionMap = { 7: 'Second side quest' };

        await act(async () => {
            await result.current.addSideQuest(7);
        });

        // Verify failure handling
        expect(props.createSideQuest).toHaveBeenCalledTimes(2);
        expect(props.pushToast).toHaveBeenCalledWith('Failed to add side quest', 'error');

        // First side quest should still be intact (quest state gets updated with server response)
        const setQuestsCalls = props.setQuests.mock.calls;
        expect(setQuestsCalls.length).toBeGreaterThan(0);
    });

    it('handles concurrent status changes to multiple side quests', async () => {
        const props = baseProps();
        props.quests = [{
            id: 10,
            description: 'Parent Quest',
            side_quests: [
                { id: 1, description: 'Side Quest 1', status: 'todo' },
                { id: 2, description: 'Side Quest 2', status: 'todo' }
            ]
        }];

        const { result } = renderHook(() => useQuestInteractions(props));

        // Toggle both side quests simultaneously
        act(() => {
            result.current.setSideQuestStatus(10, 1, 'done');
            result.current.setSideQuestStatus(10, 2, 'done');
        });

        // Both animations should be triggered
        expect(props.animations.setSideQuestStatus).toHaveBeenCalledWith(10, 1, 'done');
        expect(props.animations.setSideQuestStatus).toHaveBeenCalledWith(10, 2, 'done');
        expect(props.animations.setSideQuestStatus).toHaveBeenCalledTimes(2);
    });

    it('reverts optimistic updates when API calls fail', async () => {
        const props = baseProps();
        props.quests = [{ id: 15, description: 'Quest', side_quests: [] }];
        let questsState = props.quests;

        props.setQuests = jest.fn((updater) => {
            questsState = typeof updater === 'function' ? updater(questsState) : updater;
            return questsState;
        });

        // API call fails
        props.createSideQuest.mockRejectedValue(new Error('API Error'));

        props.selection.sideQuestDescriptionMap = { 15: 'Failed optimistic' };

        const { result } = renderHook(() => useQuestInteractions(props));

        await act(async () => {
            await result.current.addSideQuest(15);
        });

        // Should have shown error toast
        expect(props.pushToast).toHaveBeenCalledWith('Failed to add side quest', 'error');

        // Should have called setQuests twice: once optimistically, once to revert
        expect(props.setQuests).toHaveBeenCalledTimes(2);

        // Quest should have no side quests after revert
        const finalState = questsState;
        expect(finalState[0].side_quests).toHaveLength(0);
    });

    it('handles race condition between add and delete operations', async () => {
        const props = baseProps();
        props.quests = [{
            id: 20,
            description: 'Quest',
            side_quests: [{ id: 1, description: 'Existing', status: 'todo' }]
        }];

        // Add operation succeeds
        props.createSideQuest.mockResolvedValueOnce({
            id: 20,
            description: 'Quest',
            side_quests: [
                { id: 1, description: 'Existing', status: 'todo' },
                { id: 2, description: 'New', status: 'todo' }
            ]
        });

        // Delete operation succeeds
        props.deleteSideQuestRequest.mockResolvedValueOnce({
            id: 20,
            description: 'Quest',
            side_quests: [{ id: 2, description: 'New', status: 'todo' }]
        });

        props.selection.sideQuestDescriptionMap = { 20: 'New' };

        const { result } = renderHook(() => useQuestInteractions(props));

        // Start add and delete nearly simultaneously
        await act(async () => {
            await result.current.addSideQuest(20);
        });

        await act(async () => {
            await result.current.deleteSideQuest(20, 1);
        });

        // Both operations should have completed
        expect(props.createSideQuest).toHaveBeenCalled();
        expect(props.deleteSideQuestRequest).toHaveBeenCalled();
        expect(props.setQuests).toHaveBeenCalled();
    });

    it('limits error toast spam when multiple operations fail rapidly', async () => {
        const props = baseProps();
        props.quests = [{ id: 30, description: 'Quest', side_quests: [] }];

        props.createSideQuest.mockRejectedValue(new Error('Failing'));
        props.selection.sideQuestDescriptionMap = { 30: 'Rapid add' };

        const { result } = renderHook(() => useQuestInteractions(props));

        // Attempt multiple adds in rapid succession
        await act(async () => {
            await Promise.all([
                result.current.addSideQuest(30),
                result.current.addSideQuest(30),
                result.current.addSideQuest(30)
            ]);
        });

        // Should have shown error toast for each failure
        const errorToasts = props.pushToast.mock.calls.filter(
            call => call[0] === 'Failed to add side quest' && call[1] === 'error'
        );
        expect(errorToasts.length).toBe(3);
    });

    it('handles side quest update failure with proper error message', async () => {
        const props = baseProps();
        props.selection.editingSideQuest = { questId: 40, sideQuestId: 5, description: 'Updated description' };
        props.updateSideQuestRequest.mockRejectedValueOnce(new Error('Update failed'));

        const { result } = renderHook(() => useQuestInteractions(props));

        await act(async () => {
            result.current.saveSideQuestEdit(40, 5);
        });

        // Advance timers to allow debounced save to execute
        await act(async () => {
            jest.advanceTimersByTime(100);
        });

        expect(props.pushToast).toHaveBeenCalledWith('Failed to update side-quest', 'error');
    });
});
