import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuestSelection } from '../useQuestSelection.js';
import { resetQuestBoardStore } from '../../../../store/questBoardStore.js';

const createQuest = (id) => ({
    id,
    description: `Quest ${id}`,
    status: 'todo',
    side_quests: []
});

describe('useQuestSelection', () => {
    beforeEach(async () => {
        await resetQuestBoardStore({ clearPersisted: true });
    });

    it('clears quest and side-quest selection when the quest disappears', async () => {
        const { result, rerender } = renderHook(
            (props) => useQuestSelection(props),
            {
                initialProps: { quests: [createQuest(1)], refreshLayout: null }
            }
        );

        act(() => {
            result.current.handleSelectQuest(1);
        });

        rerender({ quests: [], refreshLayout: null });

        await waitFor(() => {
            expect(result.current.selectedQuestId).toBeNull();
            expect(result.current.selectedSideQuest).toBeNull();
        });
    });
});
