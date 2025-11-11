import { act, renderHook } from '@testing-library/react';
import { useQuestInteractions } from '../useQuestInteractions.js';

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

    beforeEach(() => {
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
});
