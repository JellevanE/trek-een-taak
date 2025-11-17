import { act, renderHook } from '@testing-library/react';
import { useQuestInteractions } from '../useQuestInteractions.js';
import { resetQuestBoardStore } from '../../../../store/questBoardStore.js';

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

describe('useQuestInteractions', () => {
    const baseProps = () => ({
        quests: [],
        setQuests: jest.fn(),
        selection: createSelectionStub(),
        animations: createAnimationsStub(),
        refreshLayout: null,
        playSound: jest.fn(),
        pushToast: jest.fn(),
        createQuest: jest.fn(),
        deleteQuest: jest.fn(),
        updateQuest: jest.fn(),
        createSideQuest: jest.fn(),
        updateSideQuestRequest: jest.fn(),
        deleteSideQuestRequest: jest.fn(),
        createQuestSnapshot: jest.fn(() => null),
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
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('drops undo entries after the expiry timer elapses', () => {
        const props = baseProps();
        const { result } = renderHook(() => useQuestInteractions(props));

        act(() => {
            result.current.scheduleQuestUndo({ id: 42, description: 'Test quest' });
        });

        expect(result.current.undoQueue).toHaveLength(1);

        act(() => {
            jest.advanceTimersByTime(7000);
        });

        expect(result.current.undoQueue).toHaveLength(0);
    });

    it('schedules a layout refresh after adding a side quest', async () => {
        const refreshLayout = jest.fn();
        const props = baseProps();
        props.quests = [{ id: 7, description: 'Quest', side_quests: [] }];
        props.refreshLayout = refreshLayout;
        props.selection.sideQuestDescriptionMap = { 7: 'Chase the bug' };
        props.createSideQuest.mockResolvedValue({
            id: 7,
            description: 'Quest',
            side_quests: [{ id: 1, description: 'Chase the bug', status: 'todo' }]
        });

        const { result } = renderHook(() => useQuestInteractions(props));

        const initialCalls = refreshLayout.mock.calls.length;

        await act(async () => {
            await result.current.addSideQuest(7);
        });

        act(() => {
            jest.advanceTimersByTime(60);
        });

        expect(refreshLayout.mock.calls.length).toBe(initialCalls + 1);
        expect(props.createSideQuest).toHaveBeenCalledWith(7, 'Chase the bug');
    });

    it('optimistically adds side quests and reconciles with the API response', async () => {
        const props = baseProps();
        props.quests = [{ id: 7, description: 'Quest', side_quests: [] }];
        let questsState = props.quests;
        props.setQuests = jest.fn((updater) => {
            questsState = typeof updater === 'function' ? updater(questsState) : updater;
            return questsState;
        });
        props.selection.sideQuestDescriptionMap = { 7: 'Collect runes' };
        props.createSideQuest.mockResolvedValue({
            id: 7,
            description: 'Quest',
            side_quests: [{ id: 42, description: 'Collect runes', status: 'todo' }]
        });

        const { result } = renderHook(() => useQuestInteractions(props));

        await act(async () => {
            await result.current.addSideQuest(7);
        });

        expect(props.setQuests).toHaveBeenCalledTimes(2);
        const optimisticUpdater = props.setQuests.mock.calls[0][0];
        const optimisticState = optimisticUpdater([{ id: 7, description: 'Quest', side_quests: [] }]);
        expect(optimisticState[0].side_quests).toHaveLength(1);
        expect(optimisticState[0].side_quests[0]).toMatchObject({
            description: 'Collect runes',
            optimistic: true
        });

        const finalUpdater = props.setQuests.mock.calls[props.setQuests.mock.calls.length - 1][0];
        const finalState = finalUpdater(optimisticState);
        expect(finalState[0].side_quests).toEqual([
            expect.objectContaining({ id: 42, description: 'Collect runes', status: 'todo' })
        ]);
        expect(props.selection.setSideQuestDescriptionMap).toHaveBeenCalled();
        expect(props.playSound).toHaveBeenCalled();
    });

    it('reverts the optimistic side quest when the API call fails', async () => {
        const props = baseProps();
        props.quests = [{ id: 7, description: 'Quest', side_quests: [] }];
        props.selection.sideQuestDescriptionMap = { 7: 'Collect runes' };
        props.createSideQuest.mockRejectedValue(new Error('nope'));

        const { result } = renderHook(() => useQuestInteractions(props));

        await act(async () => {
            await result.current.addSideQuest(7);
        });

        expect(props.setQuests).toHaveBeenCalledTimes(2);
        const optimisticState = props.setQuests.mock.calls[0][0](props.quests);
        const revertedState = props.setQuests.mock.calls[1][0](optimisticState);
        expect(revertedState[0].side_quests).toHaveLength(0);
        expect(props.pushToast).toHaveBeenCalledWith('Failed to add side quest', 'error');
    });

    it('tracks loading state while adding a side quest', async () => {
        const props = baseProps();
        props.quests = [{ id: 7, description: 'Quest', side_quests: [] }];
        props.selection.sideQuestDescriptionMap = { 7: 'New side quest' };
        props.selection.loadingSideQuestAdds = new Set();
        
        let resolveCreate;
        const createPromise = new Promise((resolve) => {
            resolveCreate = resolve;
        });
        props.createSideQuest.mockReturnValue(createPromise);

        const { result } = renderHook(() => useQuestInteractions(props));

        // Start adding side quest (don't await yet)
        let addPromise;
        act(() => {
            addPromise = result.current.addSideQuest(7);
        });

        // Should have called setLoadingSideQuestAdds to add quest 7
        expect(props.selection.setLoadingSideQuestAdds).toHaveBeenCalled();
        const addCall = props.selection.setLoadingSideQuestAdds.mock.calls.find(call => {
            const updater = call[0];
            const testSet = new Set();
            const result = updater(testSet);
            return result.has(7);
        });
        expect(addCall).toBeTruthy();

        // Resolve the API call
        resolveCreate({
            id: 7,
            description: 'Quest',
            side_quests: [{ id: 1, description: 'New side quest', status: 'todo' }]
        });

        await act(async () => {
            await addPromise;
        });

        // Should have called setLoadingSideQuestAdds to remove quest 7
        const removeCall = props.selection.setLoadingSideQuestAdds.mock.calls.find(call => {
            const updater = call[0];
            const testSet = new Set([7]);
            const result = updater(testSet);
            return !result.has(7);
        });
        expect(removeCall).toBeTruthy();
    });
});

