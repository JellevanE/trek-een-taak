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
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });
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

    it('allows starting a quest even when selected', () => {
        const props = baseProps();
        props.quests = [{ id: 100, description: 'Selected Quest', status: 'todo' }];
        props.selection.selectedQuestId = 100;
        props.selection.findQuestById.mockReturnValue(props.quests[0]);

        const { result } = renderHook(() => useQuestInteractions(props));

        act(() => {
            result.current.setTaskStatus(100, 'in_progress');
        });

        expect(props.animations.setTaskStatus).toHaveBeenCalledWith(100, 'in_progress');
    });

    it('handles multiple side quest status toggles correctly', () => {
        const props = baseProps();
        props.quests = [{
            id: 200,
            description: 'Quest with subs',
            side_quests: [
                { id: 1, status: 'todo' },
                { id: 2, status: 'todo' }
            ]
        }];

        const { result } = renderHook(() => useQuestInteractions(props));

        act(() => {
            result.current.setSideQuestStatus(200, 1, 'done');
            result.current.setSideQuestStatus(200, 2, 'done');
        });

        expect(props.animations.setSideQuestStatus).toHaveBeenCalledWith(200, 1, 'done');
        expect(props.animations.setSideQuestStatus).toHaveBeenCalledWith(200, 2, 'done');
    });

    describe('Quest CRUD operations', () => {
        it('creates a new quest via addTask', async () => {
            const props = baseProps();
            props.createQuest.mockResolvedValue({ id: 999, description: 'New quest', status: 'todo' });

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.addTask();
            });

            expect(props.createQuest).toHaveBeenCalled();
            expect(props.playSound).toHaveBeenCalled();
            expect(props.animations.triggerQuestSpawn).toHaveBeenCalledWith(999);
        });

        it('deletes a quest and schedules undo', async () => {
            const props = baseProps();
            const questToDelete = { id: 300, description: 'Delete me', status: 'todo' };
            props.quests = [questToDelete];
            props.deleteQuest.mockResolvedValue({});

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.deleteTask(300);
            });

            expect(props.setQuests).toHaveBeenCalled();
            expect(props.deleteQuest).toHaveBeenCalledWith(300);
            expect(result.current.undoQueue).toHaveLength(1);
        });

        it('updates a quest via updateTask', async () => {
            const props = baseProps();
            props.selection.editingQuest = { id: 400, description: 'Old' };
            props.updateQuest.mockResolvedValue({});

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.updateTask(400, { description: 'New', priority: 'medium', task_level: 1 });
            });

            expect(props.updateQuest).toHaveBeenCalledWith(400, {
                description: 'New',
                priority: 'medium',
                task_level: 1,
                due_date: null,
                campaign_id: null
            });
            expect(props.selection.setEditingQuest).toHaveBeenCalledWith(null);
        });

        it('normalizes task_level to number when updating', async () => {
            const props = baseProps();
            props.updateQuest.mockResolvedValue({});

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.updateTask(500, { task_level: '3', description: 'Test', priority: 'low' });
            });

            expect(props.updateQuest).toHaveBeenCalledWith(500, {
                description: 'Test',
                priority: 'low',
                task_level: 3,
                due_date: null,
                campaign_id: null
            });
        });
    });

    describe('Side quest editing workflow', () => {
        it('saves side quest edit with valid description', async () => {
            const props = baseProps();
            props.selection.editingSideQuest = { questId: 10, sideQuestId: 20, description: 'Updated' };
            props.updateSideQuestRequest.mockResolvedValue({ id: 10, side_quests: [{ id: 20, description: 'Updated' }] });

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                result.current.saveSideQuestEdit(10, 20);
            });

            await act(async () => {
                jest.advanceTimersByTime(100);
            });

            expect(props.updateSideQuestRequest).toHaveBeenCalled();
            expect(props.pushToast).toHaveBeenCalledWith('Side-quest updated', 'success');
        });

        it('does not save side quest edit with empty description', () => {
            const props = baseProps();
            props.selection.editingSideQuest = { questId: 11, sideQuestId: 21, description: '   ' };

            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.saveSideQuestEdit(11, 21);
            });

            expect(props.updateSideQuestRequest).not.toHaveBeenCalled();
            expect(props.pushToast).toHaveBeenCalledWith('Description cannot be empty', 'error');
        });

        it('shows error toast when side quest update fails', async () => {
            const props = baseProps();
            props.selection.editingSideQuest = { questId: 12, sideQuestId: 22, description: 'Fail' };
            props.updateSideQuestRequest.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                result.current.saveSideQuestEdit(12, 22);
            });

            await act(async () => {
                jest.advanceTimersByTime(100);
            });

            expect(props.pushToast).toHaveBeenCalledWith('Failed to update side-quest', 'error');
        });

        it('deletes side quest and clears selection', async () => {
            const props = baseProps();
            props.selection.selectedSideQuest = { questId: 13, sideQuestId: 23 };
            props.deleteSideQuestRequest.mockResolvedValue({ id: 13, side_quests: [] });

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.deleteSideQuest(13, 23);
            });

            expect(props.deleteSideQuestRequest).toHaveBeenCalledWith(13, 23);
            expect(props.selection.setSelectedSideQuest).toHaveBeenCalledWith(null);
        });

        it('deletes side quest and clears editing state', async () => {
            const props = baseProps();
            props.selection.editingSideQuest = { questId: 14, sideQuestId: 24 };
            props.deleteSideQuestRequest.mockResolvedValue({ id: 14, side_quests: [] });

            const { result } = renderHook(() => useQuestInteractions(props));

            await act(async () => {
                await result.current.deleteSideQuest(14, 24);
            });

            expect(props.selection.setEditingSideQuest).toHaveBeenCalledWith(null);
        });
    });

    describe('Priority and level cycling', () => {
        it('cycles priority for new quest', () => {
            const props = baseProps();
            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.cyclePriority();
            });

            expect(props.setPriority).toHaveBeenCalled();
            expect(props.playSound).toHaveBeenCalled();
        });

        it('cycles task level for new quest', () => {
            const props = baseProps();
            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.cycleTaskLevel();
            });

            expect(props.setTaskLevel).toHaveBeenCalled();
            expect(props.playSound).toHaveBeenCalled();
        });

        it('cycles priority for editing quest', () => {
            const props = baseProps();
            props.selection.editingQuest = { id: 15, priority: 'low' };
            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.cycleEditingPriority();
            });

            expect(props.selection.setEditingQuest).toHaveBeenCalled();
            expect(props.playSound).toHaveBeenCalled();
        });

        it('cycles level for editing quest', () => {
            const props = baseProps();
            props.selection.editingQuest = { id: 16, task_level: 1 };
            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.cycleEditingLevel();
            });

            expect(props.selection.setEditingQuest).toHaveBeenCalled();
            expect(props.playSound).toHaveBeenCalled();
        });
    });

    describe('Undo/Redo operations', () => {
        it('restores quest from undo queue', () => {
            const props = baseProps();
            const snapshot = { id: 20, description: 'Deleted', status: 'todo' };
            props.quests = [];

            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.restoreQuestFromSnapshot(snapshot);
            });

            expect(props.setQuests).toHaveBeenCalled();
            const handler = props.setQuests.mock.calls[0][0];
            const newState = handler([]);
            expect(newState).toContainEqual(snapshot);
        });

        it('restores quest to existing position if already in list', () => {
            const props = baseProps();
            const oldQuest = { id: 21, description: 'Old', status: 'todo' };
            const newSnapshot = { id: 21, description: 'Restored', status: 'in_progress' };
            props.quests = [oldQuest];

            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.restoreQuestFromSnapshot(newSnapshot);
            });

            const handler = props.setQuests.mock.calls[0][0];
            const newState = handler([oldQuest]);
            expect(newState[0]).toEqual(newSnapshot);
        });

        it('handles undo delete via undo entry', () => {
            const props = baseProps();
            const snapshot = { id: 22, description: 'To restore', status: 'todo' };

            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.scheduleQuestUndo(snapshot);
            });

            const entryId = result.current.undoQueue[0].id;

            act(() => {
                result.current.handleUndoDelete(entryId);
            });

            expect(props.setQuests).toHaveBeenCalled();
            expect(result.current.undoQueue).toHaveLength(0);
        });

        it('dismisses undo entry without restoring', () => {
            const props = baseProps();
            const snapshot = { id: 23, description: 'Dismissed', status: 'todo' };

            const { result } = renderHook(() => useQuestInteractions(props));

            act(() => {
                result.current.scheduleQuestUndo(snapshot);
            });

            expect(result.current.undoQueue).toHaveLength(1);
            const entryId = result.current.undoQueue[0].id;

            act(() => {
                result.current.dismissUndoEntry(entryId);
            });

            expect(result.current.undoQueue).toHaveLength(0);
        });
    });

    describe('Keyboard shortcuts', () => {
        const dispatchKeyEvent = (key, options = {}) => {
            const event = new KeyboardEvent('keydown', { key, bubbles: true, ...options });
            window.dispatchEvent(event);
            return event;
        };

        it('moves selection down with ArrowDown', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }, { id: 2 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('ArrowDown');
            });

            expect(props.selection.moveQuestSelection).toHaveBeenCalledWith(1);
        });

        it('moves selection up with ArrowUp', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }, { id: 2 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('ArrowUp');
            });

            expect(props.selection.moveQuestSelection).toHaveBeenCalledWith(-1);
        });

        it('moves selection down with j key', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('j');
            });

            expect(props.selection.moveQuestSelection).toHaveBeenCalledWith(1);
        });

        it('moves selection up with k key', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('k');
            });

            expect(props.selection.moveQuestSelection).toHaveBeenCalledWith(-1);
        });

        it('toggles quest status with Space key', () => {
            const props = baseProps();
            const quest = { id: 30, status: 'in_progress' };
            props.quests = [quest];
            props.selection.selectedQuestId = 30;
            props.selection.findQuestById.mockReturnValue(quest);

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent(' ');
            });

            expect(props.animations.setTaskStatus).toHaveBeenCalledWith(30, 'done');
        });

        it('toggles quest status with Enter key', () => {
            const props = baseProps();
            const quest = { id: 31, status: 'done' };
            props.quests = [quest];
            props.selection.selectedQuestId = 31;
            props.selection.findQuestById.mockReturnValue(quest);

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('Enter');
            });

            expect(props.animations.setTaskStatus).toHaveBeenCalledWith(31, 'in_progress');
        });

        it('clears selection with Escape key', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('Escape');
            });

            expect(props.selection.clearSelection).toHaveBeenCalled();
        });

        it('cycles priority with c key', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('c');
            });

            expect(props.setPriority).toHaveBeenCalled();
        });

        it('cycles task level with l key', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('l');
            });

            expect(props.setTaskLevel).toHaveBeenCalled();
        });

        it('does not trigger keyboard shortcuts when typing in input', () => {
            const props = baseProps();
            props.quests = [{ id: 1 }];

            renderHook(() => useQuestInteractions(props));

            const input = document.createElement('input');
            document.body.appendChild(input);

            const event = new KeyboardEvent('keydown', { key: 'j', bubbles: true });
            Object.defineProperty(event, 'target', { value: input, enumerable: true });

            act(() => {
                window.dispatchEvent(event);
            });

            expect(props.selection.moveQuestSelection).not.toHaveBeenCalled();

            document.body.removeChild(input);
        });

        it('expands and selects first side quest with ArrowRight', () => {
            const props = baseProps();
            const quest = { id: 1, side_quests: [{ id: 11 }] };
            props.quests = [quest];
            props.selection.selectedQuestId = 1;
            props.selection.findQuestById.mockReturnValue(quest);

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('ArrowRight');
            });

            expect(props.selection.ensureQuestExpanded).toHaveBeenCalledWith(1);
            expect(props.selection.selectFirstSideQuest).toHaveBeenCalledWith(1);
        });

        it('selects parent quest with ArrowLeft', () => {
            const props = baseProps();
            const quest = { id: 1 };
            props.quests = [quest];
            props.selection.selectedSideQuest = { questId: 1, sideQuestId: 11 };
            props.selection.selectedQuestId = 1;
            props.selection.findQuestById.mockReturnValue(quest);


            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('ArrowLeft');
            });

            expect(props.selection.setSelectedSideQuest).toHaveBeenCalledWith(null);
            expect(props.selection.handleSelectQuest).toHaveBeenCalledWith(1);
        });

        it('deletes quest with Delete key', () => {
            const props = baseProps();
            const quest = { id: 1, description: 'Delete me' };
            props.quests = [quest];
            props.selection.selectedQuestId = 1;
            props.selection.findQuestById.mockReturnValue(quest);
            props.deleteQuest.mockResolvedValue(true);

            jest.spyOn(window, 'confirm').mockReturnValue(true);

            renderHook(() => useQuestInteractions(props));

            act(() => {
                dispatchKeyEvent('Delete');
            });

            expect(props.deleteQuest).toHaveBeenCalledWith(1);
        });
    });

});

