import React from 'react';
import { render, screen } from '@testing-library/react';
import { SideQuestList } from '../SideQuestList.jsx';

const baseQuest = { id: 1 };

const noop = () => {};

const requiredProps = {
    quest: baseQuest,
    smoothDrag: null,
    themeName: 'dark',
    sideQuestItemHeight: 80,
    sideQuestGap: 8,
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
});
