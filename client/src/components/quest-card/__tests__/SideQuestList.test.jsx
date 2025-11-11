import React from 'react';
import { render, screen } from '@testing-library/react';
import { SideQuestList } from '../SideQuestList.jsx';
import { createSideQuestFixture } from '../../../features/quest-board/test-data/questFixtures.js';
import { QUEST_LAYOUT_TOKENS } from '../../../features/quest-board/tokens/spacing.js';

const baseQuest = { id: 1 };

const noop = () => {};

const requiredProps = {
    quest: baseQuest,
    smoothDrag: null,
    themeName: 'dark',
    sideQuestItemHeight: 80,
    sideQuestGap: QUEST_LAYOUT_TOKENS.sideQuestGap,
    sideQuestMaxHeight: null,
    sideQuestFooter: <div data-testid="footer">footer</div>,
    selectedSideQuest: null,
    editingSideQuest: null,
    idsMatch: (a, b) => Number(a) === Number(b),
    handleSelectSideQuest: noop,
    isInteractiveTarget: () => false,
    getSideQuestStatus: () => 'todo',
    getSideQuestStatusLabel: () => 'Todo',
    setSideQuestStatus: noop,
    deleteSideQuest: noop,
    startEditingSideQuest: noop,
    handleSideQuestEditChange: noop,
    cancelSideQuestEdit: noop,
    saveSideQuestEdit: noop,
    addInputRefs: { current: {} },
    pulsingSideQuests: {}
};

describe('SideQuestList', () => {
    it('renders only footer when no side quests exist', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuests={[]}
            />
        );

        expect(screen.getByTestId('footer')).toBeInTheDocument();
        expect(screen.queryByText(/Side-quests:/i)).not.toBeInTheDocument();
    });

    it('renders quests and clamps height when provided', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuestMaxHeight={240}
                sideQuests={[
                    { id: 11, description: 'First' },
                    { id: 12, description: 'Second' },
                    { id: 13, description: 'Third' }
                ]}
            />
        );

        expect(screen.getByText('Side-quests:')).toBeInTheDocument();
        expect(screen.getByText('First')).toBeInTheDocument();
        const scrollRegion = screen.getByRole('list');
        expect(scrollRegion).toHaveStyle('max-height: 240px');
    });

    it('enables scroll mode for tall lists (6 side quests)', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuestMaxHeight={240}
                sideQuests={[
                    { id: 21, description: 'One' },
                    { id: 22, description: 'Two' },
                    { id: 23, description: 'Three' },
                    { id: 24, description: 'Four' },
                    { id: 25, description: 'Five' },
                    { id: 26, description: 'Six' }
                ]}
            />
        );

        const scrollRegion = screen.getByRole('list');
        expect(scrollRegion).toHaveAttribute('data-scrollable', 'true');
    });

    it('falls back to copy when a side quest description is missing', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuests={[
                    createSideQuestFixture({ id: 31, description: '   ' })
                ]}
            />
        );

        expect(screen.getByText('Untitled side quest')).toBeInTheDocument();
    });

    it('marks completed side quests with the completed class', () => {
        render(
            <SideQuestList
                {...requiredProps}
                getSideQuestStatus={() => 'done'}
                getSideQuestStatusLabel={() => 'Done'}
                sideQuests={[
                    createSideQuestFixture({ id: 51, description: 'Victory lap' })
                ]}
            />
        );

        const description = screen.getByText('Victory lap');
        expect(description).toHaveClass('completed');
        const listItem = description.closest('[role="listitem"]');
        expect(listItem).toHaveAttribute('data-status', 'done');
    });
});
