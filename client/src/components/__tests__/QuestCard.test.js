import React from 'react';
import { render, screen } from '@testing-library/react';
import QuestCard from '../QuestCard';
import { useQuestBoardContext } from '../../features/quest-board/context/QuestBoardContext.jsx';

// Mock the context hook
jest.mock('../../features/quest-board/context/QuestBoardContext.jsx', () => ({
    useQuestBoardContext: jest.fn()
}));

// Mock child components to simplify testing
jest.mock('../quest-card/QuestCardShell.jsx', () => ({
    QuestCardShell: ({ children, questClassName }) => (
        <div data-testid="quest-card-shell" className={questClassName}>
            {children}
        </div>
    )
}));

jest.mock('../quest-card/QuestHeader.jsx', () => ({
    QuestHeader: () => <div data-testid="quest-header" />
}));

jest.mock('../quest-card/QuestProgress.jsx', () => ({
    QuestProgress: () => <div data-testid="quest-progress" />
}));

jest.mock('../quest-card/QuestActions.jsx', () => ({
    QuestActions: () => <div data-testid="quest-actions" />
}));

jest.mock('../quest-card/SideQuestList.jsx', () => ({
    SideQuestList: () => <div data-testid="side-quest-list" />
}));

jest.mock('../ActionButton.jsx', () => ({
    ActionButton: () => <div data-testid="action-button" />
}));

describe('QuestCard', () => {
    const mockContext = {
        themeName: 'dark',
        collapsedMap: {},
        pulsingQuests: {},
        pulsingSideQuests: {},
        glowQuests: {},
        celebratingQuests: {},
        spawnQuests: {},
        campaignLookup: new Map(),
        getQuestStatus: () => 'todo',
        getQuestStatusLabel: () => 'Todo',
        getQuestSideQuests: () => [],
        getQuestProgress: () => 0,
        idsMatch: (a, b) => a === b,
        loadingSideQuestAdds: new Set(),
        renderAddSideQuestForm: jest.fn(),
        renderEditForm: jest.fn(),
    };

    beforeEach(() => {
        useQuestBoardContext.mockReturnValue(mockContext);
    });

    const mockQuest = {
        id: 1,
        description: 'Test Quest',
        priority: 'high',
        task_level: 1
    };

    it('renders without visual refresh class by default', () => {
        render(<QuestCard quest={mockQuest} />);
        const shell = screen.getByTestId('quest-card-shell');
        expect(shell).not.toHaveClass('quest-card-refresh');
    });

    it('renders with visual refresh class when prop is true', () => {
        render(<QuestCard quest={mockQuest} visualRefresh={true} />);
        const shell = screen.getByTestId('quest-card-shell');
        expect(shell).toHaveClass('quest-card-refresh');
    });
});
