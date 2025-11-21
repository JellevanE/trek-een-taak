import { act } from '@testing-library/react';
import { questBoardSelectors, resetQuestBoardStore, useQuestBoardStore } from '../questBoardStore.js';

describe('questBoardStore', () => {
    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
    });

    test('setQuests supports functional updates for reordering', () => {
        act(() => {
            useQuestBoardStore.getState().setQuests([
                { id: 1, description: 'alpha' },
                { id: 2, description: 'beta' }
            ]);
        });

        act(() => {
            useQuestBoardStore.getState().setQuests((prev) => {
                const next = [...prev];
                const [first, ...rest] = next;
                return [...rest, first];
            });
        });

        expect(useQuestBoardStore.getState().quests.map((quest) => quest.id)).toEqual([2, 1]);
    });

    test('resetSelection clears quest and side-quest selections', () => {
        act(() => {
            const store = useQuestBoardStore.getState();
            store.setSelectedQuestId(99);
            store.setSelectedSideQuest({ questId: 99, sideQuestId: 7 });
            store.setEditingSideQuest({ questId: 99, sideQuestId: 7, description: 'foo' });
        });

        act(() => {
            useQuestBoardStore.getState().resetSelection();
        });

        const { selectedQuestId, selectedSideQuest, editingSideQuest } = useQuestBoardStore.getState();
        expect(selectedQuestId).toBeNull();
        expect(selectedSideQuest).toBeNull();
        expect(editingSideQuest).toBeNull();
    });

    test('side quest drafts can be updated and cleared via helper actions', () => {
        act(() => {
            useQuestBoardStore.getState().setSideQuestDescriptionMap({ 5: 'original' });
        });

        act(() => {
            useQuestBoardStore.getState().resetSideQuestDraft(5);
        });

        expect(useQuestBoardStore.getState().sideQuestDescriptionMap).toEqual({});
    });

    test('derived selectors expose quest and side-quest subsets', () => {
        act(() => {
            useQuestBoardStore.getState().setQuests([
                {
                    id: 'q-1',
                    description: 'Quest One',
                    side_quests: [
                        { id: 's-1', description: 'Side' }
                    ]
                }
            ]);
        });

        const quest = questBoardSelectors.questById('q-1')(useQuestBoardStore.getState());
        const sideQuests = questBoardSelectors.sideQuestsFor('q-1')(useQuestBoardStore.getState());
        expect(quest?.description).toBe('Quest One');
        expect(sideQuests).toHaveLength(1);
        expect(sideQuests[0].id).toBe('s-1');
    });

    test('undoQueue selector reflects optimistic updates', () => {
        act(() => {
            useQuestBoardStore.getState().setUndoQueue([{ id: 'undo-1' }]);
        });

        const undoQueue = questBoardSelectors.undoQueue(useQuestBoardStore.getState());
        expect(undoQueue).toHaveLength(1);
        expect(undoQueue[0].id).toBe('undo-1');
    });
});
