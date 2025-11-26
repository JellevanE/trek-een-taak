import { act, renderHook } from '@testing-library/react';
import { useQuestSelection } from '../useQuestSelection';
import { resetQuestBoardStore } from '../../../../store/questBoardStore';

describe('useQuestSelection', () => {
    const mockQuests = [
        { id: 1, description: 'Quest 1', side_quests: [{ id: 101, description: 'Side 1' }] },
        { id: 2, description: 'Quest 2', side_quests: [] },
        { id: 3, description: 'Quest 3', side_quests: [] }
    ];

    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
    });

    const setupHook = (props = {}) => {
        return renderHook(() => useQuestSelection({
            quests: mockQuests,
            refreshLayout: jest.fn(),
            ...props
        }));
    };

    it('ensureQuestExpanded expands the quest', () => {
        const { result } = setupHook();

        act(() => {
            result.current.setCollapsedMap({ 1: true });
        });

        act(() => {
            result.current.ensureQuestExpanded(1);
        });

        expect(result.current.collapsedMap[1]).toBe(false);
    });

    it('toggleCollapse toggles collapse state', () => {
        const { result } = setupHook();

        act(() => {
            result.current.toggleCollapse(1);
        });
        expect(result.current.collapsedMap[1]).toBe(true);

        act(() => {
            result.current.toggleCollapse(1);
        });
        expect(result.current.collapsedMap[1]).toBe(false);
    });

    it('handleSelectQuest selects quest and clears side quest selection', () => {
        const { result } = setupHook();

        act(() => {
            result.current.setSelectedSideQuest({ questId: 1, sideQuestId: 101 });
            result.current.handleSelectQuest(2);
        });

        expect(result.current.selectedQuestId).toBe(2);
        expect(result.current.selectedSideQuest).toBeNull();
    });

    it('handleSelectSideQuest selects quest and side quest', () => {
        const { result } = setupHook();

        act(() => {
            result.current.handleSelectSideQuest(1, 101);
        });

        expect(result.current.selectedQuestId).toBe(1);
        expect(result.current.selectedSideQuest).toEqual({ questId: 1, sideQuestId: 101 });
    });

    it('clearSelection resets selection', () => {
        const { result } = setupHook();

        act(() => {
            result.current.setSelectedQuestId(1);
            result.current.clearSelection();
        });

        expect(result.current.selectedQuestId).toBeNull();
    });

    it('moveQuestSelection moves selection', () => {
        const { result } = setupHook();

        // Initial selection
        act(() => {
            result.current.handleSelectQuest(1);
        });

        // Move down
        act(() => {
            const moved = result.current.moveQuestSelection(1);
            expect(moved).toBe(true);
        });
        expect(result.current.selectedQuestId).toBe(2);

        // Move up
        act(() => {
            const moved = result.current.moveQuestSelection(-1);
            expect(moved).toBe(true);
        });
        expect(result.current.selectedQuestId).toBe(1);
    });

    it('moveQuestSelection handles bounds', () => {
        const { result } = setupHook();

        act(() => {
            result.current.handleSelectQuest(1);
        });

        // Try moving up from first
        act(() => {
            const moved = result.current.moveQuestSelection(-1);
            expect(moved).toBe(false);
        });
        expect(result.current.selectedQuestId).toBe(1);

        act(() => {
            result.current.handleSelectQuest(3);
        });

        // Try moving down from last
        act(() => {
            const moved = result.current.moveQuestSelection(1);
            expect(moved).toBe(false);
        });
        expect(result.current.selectedQuestId).toBe(3);
    });

    it('selectFirstSideQuest selects first side quest', () => {
        const { result } = setupHook();

        act(() => {
            result.current.selectFirstSideQuest(1);
        });

        expect(result.current.selectedSideQuest).toEqual({ questId: 1, sideQuestId: 101 });
    });

    it('startEditingSideQuest sets editing state', () => {
        const { result } = setupHook();
        const sideQuest = { id: 101, description: 'Side 1' };

        act(() => {
            result.current.startEditingSideQuest(1, sideQuest);
        });

        expect(result.current.editingSideQuest).toEqual({
            questId: 1,
            sideQuestId: 101,
            description: 'Side 1'
        });
    });

    it('handleSideQuestEditChange updates description', () => {
        const { result } = setupHook();
        const sideQuest = { id: 101, description: 'Side 1' };

        act(() => {
            result.current.startEditingSideQuest(1, sideQuest);
        });

        act(() => {
            result.current.handleSideQuestEditChange('Updated');
        });

        expect(result.current.editingSideQuest.description).toBe('Updated');
    });

    it('handleEditChange updates editing quest fields', () => {
        const { result } = setupHook();

        act(() => {
            result.current.setEditingQuest({ id: 1, description: 'Old', priority: 'low' });
        });

        act(() => {
            result.current.handleEditChange({ target: { name: 'description', value: 'New' } });
        });
        expect(result.current.editingQuest.description).toBe('New');

        act(() => {
            result.current.handleEditChange({ target: { name: 'task_level', value: '5' } });
        });
        expect(result.current.editingQuest.task_level).toBe(5);

        act(() => {
            result.current.handleEditChange({ target: { name: 'campaign_id', value: '99' } });
        });
        expect(result.current.editingQuest.campaign_id).toBe(99);
    });

    it('clears selection if quest no longer exists', () => {
        const { result, rerender } = renderHook((props) => useQuestSelection({
            quests: props.quests,
            refreshLayout: jest.fn()
        }), { initialProps: { quests: mockQuests } });

        act(() => {
            result.current.setSelectedQuestId(1);
        });
        expect(result.current.selectedQuestId).toBe(1);

        // Rerender with quest 1 removed
        rerender({ quests: mockQuests.slice(1) });

        expect(result.current.selectedQuestId).toBeNull();
    });
});
